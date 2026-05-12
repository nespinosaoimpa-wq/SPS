import { db, GPSPoint } from './db';

export class GPSTracker {
  private worker: Worker | null = null;
  private onUpdate: (pos: any) => void;
  private onError: (err: string) => void;
  private shiftId: string;
  private operatorId: string;
  private isSyncing = false;
  private wakeLock: any = null;

  private objectiveLocation?: { lat: number, lng: number };
  private geofenceRadius?: number;
  private objectiveId?: string;

  constructor(
    shiftId: string,
    operatorId: string,
    onUpdate: (pos: any) => void,
    onError: (err: string) => void,
    objectiveData?: { location: { lat: number, lng: number }, radius: number, id: string }
  ) {
    this.shiftId = shiftId;
    this.operatorId = operatorId;
    this.onUpdate = onUpdate;
    this.onError = onError;
    if (objectiveData) {
      this.objectiveLocation = objectiveData.location;
      this.geofenceRadius = objectiveData.radius;
      this.objectiveId = objectiveData.id;
    }
  }

  async start() {
    if (this.worker) return;

    // 1. Acquire Wake Lock
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('[704 GPS] Wake Lock active');
      } catch (err) {}
    }

    // 2. Initialize Worker
    this.worker = new Worker(new URL('../workers/gps-worker.ts', import.meta.url));

    this.worker.onmessage = async (e) => {
      const { type, payload } = e.data;

      if (type === 'LOCATION_UPDATE') {
        await this.handleLocationUpdate(payload);
      } else if (type === 'GEOFENCE_WARNING') {
        this.handleGeofenceWarning(payload);
      } else if (type === 'GEOFENCE_ABANDONMENT') {
        await this.handleAbandonment(payload);
      } else if (type === 'GEOFENCE_RETURN') {
        await this.handleReturn(payload);
      } else if (type === 'ERROR') {
        this.onError(payload);
      }
    };

    this.worker.postMessage({
      type: 'START',
      payload: { 
        shiftId: this.shiftId, 
        operatorId: this.operatorId,
        objectiveId: this.objectiveId,
        objectiveLocation: this.objectiveLocation,
        geofenceRadius: this.geofenceRadius
      }
    });

    // 3. Start Sync Monitor
    this.startSyncLoop();
  }

  async stop() {
    if (this.worker) {
      this.worker.postMessage({ type: 'STOP' });
      this.worker.terminate();
      this.worker = null;
    }

    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
      } catch (e) {}
      this.wakeLock = null;
    }

    // Final Sync attempt
    await this.syncPendingPoints();
  }

  private handleGeofenceWarning(data: any) {
    if ("vibrate" in navigator) {
      navigator.vibrate([300, 100, 300, 100, 300]);
    }
    console.warn(`[704 GPS] WARNING: Outside Geofence! Distance: ${Math.round(data.distance)}m. Grace period started.`);
  }

  private async handleReturn(data: any) {
    console.log('[704 GPS] Return to Geofence detected.');
    try {
      await fetch('/api/tracking/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift_id: this.shiftId,
          operator_id: this.operatorId,
          objective_id: this.objectiveId,
          type: 'entry',
          distance: data.distance
        })
      });
    } catch (e) {}
  }

  private async handleAbandonment(data: any) {
    console.warn('[704 GPS] ALERT: Geofence Abandonment detected!', data);
    
    try {
      await fetch('/api/tracking/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift_id: this.shiftId,
          operator_id: this.operatorId,
          objective_id: this.objectiveId,
          type: 'exit',
          latitude: data.latitude,
          longitude: data.longitude,
          distance: data.distance
        })
      });
    } catch (e) {
      console.error('[704 GPS] Failed to send abandonment alert:', e);
    }
  }

  private async handleLocationUpdate(data: any) {
    // 1. Save to Dexie (Indestructible Storage)
    const point: GPSPoint = {
      shift_id: this.shiftId,
      operator_id: this.operatorId,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy,
      speed: data.speed,
      heading: data.heading,
      timestamp: data.timestamp,
      status: 'pending'
    };

    try {
      const id = await db.gps_points.add(point);
      
      // 2. Immediate transmission if online
      if (navigator.onLine) {
        const success = await this.transmitToServer(point);
        if (success) {
          await db.gps_points.update(id!, { status: 'synced' });
        }
      }
      
      // 3. Notify UI for live movement
      this.onUpdate(data);
    } catch (e) {
      console.error('[704 GPS] Storage error:', e);
    }
  }

  private async transmitToServer(point: GPSPoint): Promise<boolean> {
    try {
      const response = await fetch('/api/tracking/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftData: { id: point.shift_id, operator_id: point.operator_id },
          latitude: point.latitude,
          longitude: point.longitude,
          accuracy: point.accuracy,
          speed: point.speed,
          heading: point.heading,
          timestamp: point.timestamp
        })
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  private startSyncLoop() {
    const loop = async () => {
      if (!this.worker) return; // Stopped
      if (navigator.onLine && !this.isSyncing) {
        await this.syncPendingPoints();
      }
      setTimeout(loop, 15000); // Check every 15s
    };
    loop();
  }

  private async syncPendingPoints() {
    if (this.isSyncing) return;
    
    const pending = await db.gps_points
      .where('status')
      .equals('pending')
      .limit(50)
      .toArray();

    if (pending.length === 0) return;

    this.isSyncing = true;
    console.log(`[704 GPS] Syncing ${pending.length} pending points...`);

    try {
      // Bulk sync or individual with promise.all
      // For now, individual transmission to reuse the tracking endpoint
      // Optimization: create a bulk endpoint in Phase 2
      const results = await Promise.all(
        pending.map(async (p) => {
          const ok = await this.transmitToServer(p);
          if (ok) {
            await db.gps_points.update(p.id!, { status: 'synced' });
          }
          return ok;
        })
      );
      
      const syncedCount = results.filter(r => r).length;
      console.log(`[704 GPS] Sync complete. ${syncedCount}/${pending.length} points processed.`);
    } catch (e) {
      console.error('[704 GPS] Sync error:', e);
    } finally {
      this.isSyncing = false;
    }
  }

  static getAccuracyCategory(accuracyMeters: number): {
    label: string;
    color: string;
    bgColor: string;
    level: 'excelente' | 'buena' | 'media' | 'baja';
  } {
    if (accuracyMeters <= 10) {
      return { label: 'EXCELENTE', color: 'text-green-500', bgColor: 'bg-green-500/10', level: 'excelente' };
    } else if (accuracyMeters <= 30) {
      return { label: 'BUENA', color: 'text-green-400', bgColor: 'bg-green-400/10', level: 'buena' };
    } else if (accuracyMeters <= 100) {
      return { label: 'MEDIA', color: 'text-amber-500', bgColor: 'bg-amber-500/10', level: 'media' };
    } else {
      return { label: 'BAJA', color: 'text-red-500', bgColor: 'bg-red-500/10', level: 'baja' };
    }
  }
}

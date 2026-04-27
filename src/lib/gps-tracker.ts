export class GPSTracker {
  private watchId: number | null = null;
  private onUpdate: (pos: GeolocationPosition) => void;
  private onError: (err: GeolocationPositionError) => void;
  private minIntervalMs: number;
  private lastUpdateMs: number = 0;

  constructor(
    onUpdate: (pos: GeolocationPosition) => void,
    onError: (err: GeolocationPositionError) => void,
    minIntervalMs: number = 1000
  ) {
    this.onUpdate = onUpdate;
    this.onError = onError;
    this.minIntervalMs = minIntervalMs;
  }

  private positionBuffer: GeolocationPosition[] = [];
  private readonly BUFFER_SIZE = 5; // 5 samples for robust WMA stabilization (Uber-style)
  private readonly MAX_ACCEPTABLE_ACCURACY = 100; // Reject WiFi/cell readings above this

  private wakeLock: any = null;

  async start() {
    if (this.watchId !== null) return;

    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by your browser');
      return;
    }

    // Acquire Wake Lock to prevent screen sleep during tracking
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('[GPS Tracker] Wake Lock acquired.');

        // Re-acquire wake lock if visibility changes (user switches apps and comes back)
        document.addEventListener('visibilitychange', async () => {
          if (this.wakeLock !== null && document.visibilityState === 'visible') {
            try {
              this.wakeLock = await (navigator as any).wakeLock.request('screen');
              console.log('[GPS Tracker] Wake Lock re-acquired after visibility change.');
            } catch (err: any) {
              console.warn(`[GPS Tracker] Wake Lock re-acquire failed: ${err.message}`);
            }
          }
        });
      } catch (err: any) {
        console.warn(`[GPS Tracker] Wake Lock error: ${err.message}`);
      }
    }

    const options = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 30000 // 30s: give hardware time to lock satellites
    };

    this.watchId = navigator.geolocation.watchPosition(
      (pos: GeolocationPosition) => this.handlePosition(pos),
      this.onError,
      options
    );
    console.log('[GPS Tracker] Started watching position.', this.watchId);
  }

  async stop() {
    if (this.wakeLock !== null) {
      await this.wakeLock.release();
      this.wakeLock = null;
      console.log('[GPS Tracker] Wake Lock released.');
    }

    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      console.log('[GPS Tracker] Stopped watching position.', this.watchId);
      this.watchId = null;
    }
    this.positionBuffer = [];
  }

  private handlePosition(pos: GeolocationPosition) {
    const now = Date.now();
    const accuracy = pos.coords.accuracy;
    
    // QUALITY GATE: Reject WiFi/cell tower readings (typically > 100m accuracy)
    // These readings are noise and will degrade the smoothed position
    if (accuracy > this.MAX_ACCEPTABLE_ACCURACY) {
      console.warn(`[GPS Tracker] Rejected reading: accuracy ${Math.round(accuracy)}m > ${this.MAX_ACCEPTABLE_ACCURACY}m (likely WiFi/cell)`);
      // Still emit the raw position so the UI can show "WiFi detected" warning
      // but mark it so the caller knows not to use it for check-in
      if (now - this.lastUpdateMs > this.minIntervalMs || this.lastUpdateMs === 0) {
        this.lastUpdateMs = now;
        this.onUpdate(pos); // Let the UI handle the warning
      }
      return;
    }
    
    // Add to buffer (only good GPS readings)
    this.positionBuffer.push(pos);
    if (this.positionBuffer.length > this.BUFFER_SIZE) {
      this.positionBuffer.shift();
    }

    // Throttle network updates
    if (now - this.lastUpdateMs > this.minIntervalMs || this.lastUpdateMs === 0) {
      this.lastUpdateMs = now;
      
      const smoothedPos = this.calculateSmoothedPosition();
      if (smoothedPos) {
        this.onUpdate(smoothedPos);
      }
    }
  }

  private calculateSmoothedPosition(): GeolocationPosition | null {
    if (this.positionBuffer.length === 0) return null;
    if (this.positionBuffer.length === 1) return this.positionBuffer[0];

    let totalWeight = 0;
    let weightedLat = 0;
    let weightedLng = 0;
    let avgAccuracy = 0;
    let maxSpeed = 0;
    let lastHeading = this.positionBuffer[this.positionBuffer.length - 1].coords.heading;

    for (const p of this.positionBuffer) {
      // Weight inversely proportional to accuracy squared
      // Better signal = higher weight (Uber-style weighted moving average)
      const accuracy = Math.max(p.coords.accuracy, 1);
      const weight = 1 / Math.pow(accuracy, 2);
      
      weightedLat += p.coords.latitude * weight;
      weightedLng += p.coords.longitude * weight;
      avgAccuracy += p.coords.accuracy * weight;
      totalWeight += weight;

      if (p.coords.speed && p.coords.speed > maxSpeed) {
        maxSpeed = p.coords.speed;
      }
    }

    const finalLat = weightedLat / totalWeight;
    const finalLng = weightedLng / totalWeight;
    const finalAccuracy = avgAccuracy / totalWeight;

    const lastPos = this.positionBuffer[this.positionBuffer.length - 1];
    return {
      coords: {
        latitude: finalLat,
        longitude: finalLng,
        accuracy: finalAccuracy,
        altitude: lastPos.coords.altitude,
        altitudeAccuracy: lastPos.coords.altitudeAccuracy,
        heading: lastHeading,
        speed: maxSpeed > 0 ? maxSpeed : null
      },
      timestamp: lastPos.timestamp
    };
  }

  // Haversine formula to calculate distance in kilometers
  static getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

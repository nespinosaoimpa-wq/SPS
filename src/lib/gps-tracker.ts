export class GPSTracker {
  private watchId: number | null = null;
  private onUpdate: (pos: GeolocationPosition) => void;
  private onError: (err: GeolocationPositionError) => void;
  private minIntervalMs: number;
  private lastUpdateMs: number = 0;

  constructor(
    onUpdate: (pos: GeolocationPosition) => void,
    onError: (err: GeolocationPositionError) => void,
    minIntervalMs: number = 5000 // 5 seconds by default to save battery
  ) {
    this.onUpdate = onUpdate;
    this.onError = onError;
    this.minIntervalMs = minIntervalMs;
  }

  private positionBuffer: GeolocationPosition[] = [];
  private readonly BUFFER_SIZE = 5;

  private wakeLock: any = null;

  async start() {
    if (this.watchId !== null) return;

    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by your browser');
      return;
    }

    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('[GPS Tracker] Wake Lock acquired.');
      } catch (err: any) {
        console.warn(`[GPS Tracker] Wake Lock error: ${err.message}`);
      }
    }

    const options = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 30000 // 30 seconds: MUST give the hardware enough time to lock onto satellites, otherwise it falls back to wild cell-tower estimates
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
  }

  private handlePosition(pos: GeolocationPosition) {
    const now = Date.now();
    
    // Add to buffer
    this.positionBuffer.push(pos);
    if (this.positionBuffer.length > this.BUFFER_SIZE) {
      this.positionBuffer.shift();
    }

    // Only throttle network updates, but always process position for smoothing
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
      // Weight inversely proportional to accuracy (lower accuracy value = better signal = higher weight)
      // Guard against 0 accuracy (though rare)
      const accuracy = Math.max(p.coords.accuracy, 1);
      const weight = 1 / Math.pow(accuracy, 2); // Square it for stronger preference towards good signals
      
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

    // Jitter filter: if we have a previous smoothed position and distance is < 2m and speed is very low, 
    // maybe we shouldn't emit a change, but since we are replacing the coords object, we'll just return the 
    // smoothed coordinate which inherently reduces jitter.

    // Create a mock GeolocationPosition object with smoothed data
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
    const R = 6371; // Radius of the earth in km
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

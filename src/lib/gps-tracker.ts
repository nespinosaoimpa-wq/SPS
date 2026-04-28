export class GPSTracker {
  private watchId: number | null = null;
  private onUpdate: (pos: GeolocationPosition) => void;
  private onError: (err: GeolocationPositionError) => void;
  private lastUpdateMs: number = 0;
  
  // Adaptive transmission parameters
  private readonly STATIC_INTERVAL_MS = 6000;   // 6 seconds if stationary
  private readonly WALKING_INTERVAL_MS = 3000;  // 3 seconds if walking
  private readonly RUNNING_INTERVAL_MS = 1000;  // 1 second if running/driving
  private readonly STATIC_SPEED_THRESHOLD = 0.5; // m/s
  private readonly RUNNING_SPEED_THRESHOLD = 2.5; // m/s

  // Kalman Filter state
  private kfLat = 0;
  private kfLng = 0;
  private kfLastErrorLat = 0;
  private kfLastErrorLng = 0;
  private q = 0.001; // Process noise
  
  // Buffers & Gates
  private positionBuffer: GeolocationPosition[] = [];
  private readonly MAX_ACCEPTABLE_ACCURACY = 65; // Reject readings worse than 65m
  private readonly MAX_SPEED_CAP = 45; // m/s (162 km/h) - realistically discard impossible warps
  
  private wakeLock: any = null;
  private lastHeading = 0;
  private lastKnownSpeed = 0;

  constructor(
    onUpdate: (pos: GeolocationPosition) => void,
    onError: (err: GeolocationPositionError) => void,
    _minIntervalMs: number = 1000 // Ignored now, we use adaptive logic
  ) {
    this.onUpdate = onUpdate;
    this.onError = onError;
  }

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
        document.addEventListener('visibilitychange', async () => {
          if (this.wakeLock !== null && document.visibilityState === 'visible') {
            try {
              this.wakeLock = await (navigator as any).wakeLock.request('screen');
            } catch (err: any) {}
          }
        });
      } catch (err: any) {}
    }

    const options = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 30000
    };

    this.watchId = navigator.geolocation.watchPosition(
      (pos: GeolocationPosition) => this.handlePosition(pos),
      this.onError,
      options
    );
  }

  async stop() {
    if (this.wakeLock !== null) {
      await this.wakeLock.release();
      this.wakeLock = null;
    }

    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    // Reset state
    this.positionBuffer = [];
    this.kfLat = 0;
    this.kfLng = 0;
    this.lastUpdateMs = 0;
  }

  private handlePosition(pos: GeolocationPosition) {
    const accuracy = pos.coords.accuracy;
    
    // 1. Accuracy Gate: reject WiFi/Cell
    if (accuracy > this.MAX_ACCEPTABLE_ACCURACY) {
       console.warn(`[GPS] Rejected: accuracy ${Math.round(accuracy)}m > ${this.MAX_ACCEPTABLE_ACCURACY}m`);
       return; 
    }

    // Initialize Kalman or calculate delta
    if (this.kfLat === 0) {
      this.kfLat = pos.coords.latitude;
      this.kfLng = pos.coords.longitude;
      this.kfLastErrorLat = accuracy;
      this.kfLastErrorLng = accuracy;
    } else {
      // 2. Warp gate: basic speed check to prevent teleporting
      const dist = GPSTracker.getDistanceKm(this.kfLat, this.kfLng, pos.coords.latitude, pos.coords.longitude) * 1000;
      const timeDiff = (pos.timestamp - (this.positionBuffer.length ? this.positionBuffer[this.positionBuffer.length-1].timestamp : pos.timestamp)) / 1000;
      
      if (timeDiff > 0 && dist / timeDiff > this.MAX_SPEED_CAP) {
         console.warn(`[GPS] Warp detected, rejected reading.`);
         return;
      }
    }

    // 3. Simple Kalman Filter Update
    // Lat
    this.kfLastErrorLat += this.q;
    const kalmanGainLat = this.kfLastErrorLat / (this.kfLastErrorLat + accuracy);
    this.kfLat = this.kfLat + kalmanGainLat * (pos.coords.latitude - this.kfLat);
    this.kfLastErrorLat = (1 - kalmanGainLat) * this.kfLastErrorLat;
    
    // Lng
    this.kfLastErrorLng += this.q;
    const kalmanGainLng = this.kfLastErrorLng / (this.kfLastErrorLng + accuracy);
    this.kfLng = this.kfLng + kalmanGainLng * (pos.coords.longitude - this.kfLng);
    this.kfLastErrorLng = (1 - kalmanGainLng) * this.kfLastErrorLng;

    // Preserve metadata
    if (pos.coords.speed !== null && pos.coords.speed >= 0) this.lastKnownSpeed = pos.coords.speed;
    if (pos.coords.heading !== null && pos.coords.heading >= 0) this.lastHeading = pos.coords.heading;

    const smoothedPos: GeolocationPosition = {
      coords: {
        latitude: this.kfLat,
        longitude: this.kfLng,
        accuracy: kalmanGainLat * accuracy, // estimate smoothed accuracy
        altitude: pos.coords.altitude,
        altitudeAccuracy: pos.coords.altitudeAccuracy,
        heading: this.lastHeading,
        speed: this.lastKnownSpeed
      },
      timestamp: pos.timestamp
    };

    this.positionBuffer.push(smoothedPos);
    if (this.positionBuffer.length > 3) this.positionBuffer.shift();

    // 4. Adaptive Transmission Interval
    const now = Date.now();
    let dynamicInterval = this.STATIC_INTERVAL_MS;
    
    if (this.lastKnownSpeed > this.RUNNING_SPEED_THRESHOLD) {
      dynamicInterval = this.RUNNING_INTERVAL_MS;
    } else if (this.lastKnownSpeed > this.STATIC_SPEED_THRESHOLD) {
      dynamicInterval = this.WALKING_INTERVAL_MS;
    }

    if (now - this.lastUpdateMs > dynamicInterval || this.lastUpdateMs === 0) {
      this.lastUpdateMs = now;
      this.onUpdate(smoothedPos);
    }
  }

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

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

  start() {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by your browser');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    };

    this.watchId = navigator.geolocation.watchPosition(
      (pos: GeolocationPosition) => this.handlePosition(pos),
      this.onError,
      options
    );
    console.log('[GPS Tracker] Started watching position.', this.watchId);
  }

  stop() {
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      console.log('[GPS Tracker] Stopped watching position.', this.watchId);
      this.watchId = null;
    }
  }

  private handlePosition(pos: GeolocationPosition) {
    const now = Date.now();
    // Throttle updates to save battery and network requests
    if (now - this.lastUpdateMs > this.minIntervalMs) {
      this.lastUpdateMs = now;
      this.onUpdate(pos);
    }
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

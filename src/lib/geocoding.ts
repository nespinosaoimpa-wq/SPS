/**
 * 704 Geocoding Utility
 * Precise street-level geocoding with autocomplete support.
 * Uses Nominatim (OpenStreetMap) — free, no API key required.
 * Optimized for Argentina with structured address parsing.
 */

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;       // Full formatted address
  street: string;            // Street name
  houseNumber: string;       // House number
  city: string;              // City / locality
  state: string;             // Province
  country: string;
  type: string;              // place type (house, street, etc.)
  importance: number;        // relevance score
}

export interface ReverseGeocodingResult {
  displayName: string;
  street: string;
  houseNumber: string;
  city: string;
  state: string;
  postcode: string;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
const MAPBOX_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

// Debounce helper
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Search for addresses with autocomplete-style results.
 * Debounced to avoid hammering the API.
 */
export function searchAddresses(
  query: string, 
  debounceMs = 300
): Promise<GeocodingResult[]> {
  return new Promise((resolve, reject) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    
    if (!query || query.trim().length < 3) {
      resolve([]);
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const results = await geocodeForward(query);
        resolve(results);
      } catch (err) {
        reject(err);
      }
    }, debounceMs);
  });
}

function normalizeAddress(query: string): string {
  let normalized = query.toUpperCase();
  // Common Argentine abbreviations
  normalized = normalized.replace(/\bAV\b\.?/g, 'AVENIDA');
  normalized = normalized.replace(/\bPJE\b\.?/g, 'PASAJE');
  normalized = normalized.replace(/\bST\b\.?/g, 'SAN');
  normalized = normalized.replace(/\bB\b\.?\b/g, 'BARRIO');
  normalized = normalized.replace(/\bNRO\b\.?/g, '');
  return normalized.toLowerCase().trim();
}

/**
 * Forward Geocoding: Address text → coordinates
 * Uses Mapbox for high precision (house numbers, POIs).
 */
export async function geocodeForward(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) return [];
  if (!MAPBOX_TOKEN) {
    console.error('MAPBOX_TOKEN is not defined');
    return [];
  }

  try {
    const normalized = normalizeAddress(query);
    // Bias results toward Santa Fe center
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      country: 'ar',
      language: 'es',
      proximity: '-60.6973,-31.6107', // Santa Fe
      types: 'address,poi,place',
      limit: '10',
    });

    const res = await fetch(`${MAPBOX_BASE}/${encodeURIComponent(normalized)}.json?${params}`);
    if (!res.ok) throw new Error(`Mapbox Geocoding failed: ${res.status}`);

    const data = await res.json();

    return (data.features || []).map((f: any) => {
      const context = f.context || [];
      const city = context.find((c: any) => c.id.startsWith('place'))?.text || '';
      const state = context.find((c: any) => c.id.startsWith('region'))?.text || '';
      
      return {
        lat: f.center[1],
        lng: f.center[0],
        displayName: f.place_name,
        street: f.text || '',
        houseNumber: f.address || '',
        city,
        state,
        country: context.find((c: any) => c.id.startsWith('country'))?.text || 'Argentina',
        type: f.place_type?.[0] || '',
        importance: f.relevance || 0,
      };
    });
  } catch (err) {
    console.error('Forward geocoding error:', err);
    return [];
  }
}

/**
 * Reverse Geocoding: coordinates → address
 * Used when clicking the map or showing guard positions.
 */
/**
 * Reverse Geocoding: coordinates → address
 * Used when clicking the map or showing guard positions.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodingResult | null> {
  if (!MAPBOX_TOKEN) return null;

  try {
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      types: 'address,poi',
      language: 'es',
      limit: '1',
    });

    const res = await fetch(`${MAPBOX_BASE}/${lng},${lat}.json?${params}`);
    if (!res.ok) return null;

    const data = await res.json();
    const feature = data.features?.[0];
    
    if (!feature) return null;

    const context = feature.context || [];
    const street = feature.text || '';
    const houseNumber = feature.address || '';
    
    return {
      displayName: feature.place_name,
      street,
      houseNumber,
      city: context.find((c: any) => c.id.startsWith('place'))?.text || '',
      state: context.find((c: any) => c.id.startsWith('region'))?.text || '',
      postcode: context.find((c: any) => c.id.startsWith('postcode'))?.text || '',
    };
  } catch (err) {
    console.error('Reverse geocoding error:', err);
    return null;
  }
}

/**
 * Format a clean display name from Nominatim result
 */
function formatDisplayName(item: any): string {
  const addr = item.address || {};
  const parts: string[] = [];

  const street = addr.road || addr.pedestrian || addr.path || '';
  const number = addr.house_number || '';

  if (street) {
    parts.push(number ? `${street} ${number}` : street);
  }

  const city = addr.city || addr.town || addr.village || addr.suburb || '';
  if (city) parts.push(city);

  const state = addr.state || '';
  if (state && state !== city) parts.push(state);

  return parts.length > 0 ? parts.join(', ') : item.display_name || 'Ubicación desconocida';
}

/**
 * Format reverse geocoding result into a clean address
 */
function formatReverseAddress(street: string, houseNumber: string, addr: any): string {
  const parts: string[] = [];

  if (street) {
    parts.push(houseNumber ? `${street} ${houseNumber}` : street);
  }

  const city = addr.city || addr.town || addr.village || addr.suburb || '';
  if (city) parts.push(city);

  return parts.length > 0 ? parts.join(', ') : 'Ubicación sin dirección registrada';
}

/**
 * Calculate distance between two coordinates in meters (Haversine)
 */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

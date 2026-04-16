/**
 * SPS Geocoding Utility
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

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'SPSCustodia/1.0';

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
 * Biased toward Argentina / Santa Fe for better local results.
 */
export async function geocodeForward(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const normalized = normalizeAddress(query);
    // Add "Santa Fe, Argentina" bias for better local results
    const enrichedQuery = normalized.includes('argentina') ? normalized : `${normalized}, Santa Fe, Argentina`;
    
    const params = new URLSearchParams({
      q: enrichedQuery,
      format: 'json',
      addressdetails: '1',
      limit: '10',
      countrycodes: 'ar',
      'accept-language': 'es',
    });

    const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);

    const data = await res.json();

    return data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      displayName: formatDisplayName(item),
      street: item.address?.road || item.address?.pedestrian || item.address?.path || '',
      houseNumber: item.address?.house_number || '',
      city: item.address?.city || item.address?.town || item.address?.village || item.address?.suburb || '',
      state: item.address?.state || '',
      country: item.address?.country || '',
      type: item.type || item.class || '',
      importance: item.importance || 0,
    }));
  } catch (err) {
    console.error('Forward geocoding error:', err);
    return [];
  }
}

/**
 * Reverse Geocoding: coordinates → address
 * Used when clicking the map or showing guard positions.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodingResult | null> {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      format: 'json',
      addressdetails: '1',
      zoom: '18', // Max zoom = max detail (house level)
      'accept-language': 'es',
    });

    const res = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!res.ok) return null;

    const data = await res.json();
    
    if (data.error) return null;

    const addr = data.address || {};
    const street = addr.road || addr.pedestrian || addr.path || '';
    const houseNumber = addr.house_number || '';
    
    return {
      displayName: formatReverseAddress(street, houseNumber, addr),
      street,
      houseNumber,
      city: addr.city || addr.town || addr.village || addr.suburb || '',
      state: addr.state || '',
      postcode: addr.postcode || '',
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

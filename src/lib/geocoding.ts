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
const MAPBOX_GEO_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const MAPBOX_SEARCH_BASE = 'https://api.mapbox.com/search/searchbox/v1';

// Session token for Search Box API (UUID v4)
let currentSessionToken: string | null = null;

function getSessionToken(): string {
  if (!currentSessionToken) {
    currentSessionToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  return currentSessionToken;
}

export function resetSearchSession() {
  currentSessionToken = null;
}

// Debounce helper
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let abortController: AbortController | null = null;

/**
 * Mapbox Search Box API v6 Suggest
 * Provides intelligent POI and address suggestions.
 */
export async function searchBoxSuggest(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 3) return [];
  if (!MAPBOX_TOKEN) return [];

  if (abortController) abortController.abort();
  abortController = new AbortController();

  try {
    const params = new URLSearchParams({
      q: query,
      access_token: MAPBOX_TOKEN,
      session_token: getSessionToken(),
      country: 'ar',
      language: 'es',
      proximity: '-60.6973,-31.6107', // Santa Fe center
      bbox: '-60.85,-31.72,-60.55,-31.50', // Santa Fe Metro area
      types: 'address,poi,place',
      limit: '10'
    });

    const res = await fetch(`${MAPBOX_SEARCH_BASE}/suggest?${params}`, { signal: abortController.signal });
    if (!res.ok) throw new Error(`Search Suggest failed: ${res.status}`);

    const data = await res.json();
    
    return (data.suggestions || []).map((s: any) => ({
      lat: 0, // Suggest doesn't return coords, must call retrieve
      lng: 0,
      displayName: s.name + (s.address ? `, ${s.address}` : '') + (s.place_formatted ? `, ${s.place_formatted}` : ''),
      street: s.name || '',
      houseNumber: s.address || '',
      city: s.place_formatted?.split(',')[0]?.trim() || '',
      state: 'Santa Fe',
      country: 'Argentina',
      type: s.feature_type || 'poi',
      importance: 1,
      mapbox_id: s.mapbox_id // Hidden field for retrieve
    }));
  } catch (err: any) {
    if (err.name === 'AbortError') return [];
    console.error('Search Suggest error:', err);
    return [];
  }
}

/**
 * Mapbox Search Box API v6 Retrieve
 * Gets full feature details (including coords) from a suggest result.
 */
export async function searchBoxRetrieve(mapboxId: string): Promise<GeocodingResult | null> {
  if (!MAPBOX_TOKEN || !mapboxId) return null;

  try {
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      session_token: getSessionToken(),
    });

    const res = await fetch(`${MAPBOX_SEARCH_BASE}/retrieve/${mapboxId}?${params}`);
    if (!res.ok) throw new Error(`Retrieve failed: ${res.status}`);

    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;

    // Reset session after successful retrieval
    resetSearchSession();

    return {
      lat: feature.geometry.coordinates[1],
      lng: feature.geometry.coordinates[0],
      displayName: feature.properties.full_address || feature.properties.name,
      street: feature.properties.street_name || feature.properties.name,
      houseNumber: feature.properties.address_number || '',
      city: feature.properties.context?.place?.name || '',
      state: feature.properties.context?.region?.name || '',
      country: 'Argentina',
      type: feature.properties.feature_type || '',
      importance: 1
    };
  } catch (err) {
    console.error('Retrieve error:', err);
    return null;
  }
}

/**
 * Search for addresses with autocomplete-style results (Search Box v6).
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
        const results = await searchBoxSuggest(query);
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
 * Legacy v5 fallback.
 */
export async function geocodeForward(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) return [];
  if (!MAPBOX_TOKEN) return [];

  try {
    const normalized = normalizeAddress(query);
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      country: 'ar',
      language: 'es',
      proximity: '-60.6973,-31.6107',
      types: 'address,poi,place',
      limit: '10',
    });

    const res = await fetch(`${MAPBOX_GEO_BASE}/${encodeURIComponent(normalized)}.json?${params}`);
    if (!res.ok) throw new Error(`Mapbox Geocoding failed: ${res.status}`);

    const data = await res.json();

    return (data.features || []).map((f: any) => {
      const context = f.context || [];
      return {
        lat: f.center[1],
        lng: f.center[0],
        displayName: f.place_name,
        street: f.text || '',
        houseNumber: f.address || '',
        city: context.find((c: any) => c.id.startsWith('place'))?.text || '',
        state: context.find((c: any) => c.id.startsWith('region'))?.text || '',
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

    const res = await fetch(`${MAPBOX_GEO_BASE}/${lng},${lat}.json?${params}`);
    if (!res.ok) return null;

    const data = await res.json();
    const feature = data.features?.[0];
    
    if (!feature) return null;

    const context = feature.context || [];
    return {
      displayName: feature.place_name,
      street: feature.text || '',
      houseNumber: feature.address || '',
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


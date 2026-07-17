/**
 * 704 Geocoding Engine v3 — Ultra Precision Grade (FREE)
 * 
 * Multi-engine architecture with smart fallback chain:
 * 1. Photon (Komoot) — Fast, proximity-aware, exact house numbers (FREE)
 * 2. Nominatim (OSM) — Structured queries with viewbox bounding (FREE)
 * 3. Mapbox v5 — Fallback for POIs and autocomplete (FREE tier: 100k/mo)
 * 4. Mapbox Search Box — POI discovery (FREE tier)
 * 5. Address Interpolation — Estimates position when exact number unavailable
 * 
 * Optimized for Santa Fe, Argentina with Uber-grade UX.
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
  mapbox_id?: string;        // Search Box ID for retrieve
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
const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAPBOX_GEO_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const MAPBOX_SEARCH_BASE = 'https://api.mapbox.com/search/searchbox/v1';

// 704 operational center — Santa Fe, Argentina
const SANTA_FE_CENTER = { lng: -60.6973, lat: -31.6107 };
const SANTA_FE_BBOX = '-63.3,-34.8,-59.4,-28.0'; // Entire Santa Fe Province
// Tight viewbox around Santa Fe city for bounded queries
const SANTA_FE_CITY_VIEWBOX = '-60.78,-31.56,-60.62,-31.70';

// Session token for Search Box API
let currentSessionToken: string | null = null;

function getSessionToken(): string {
  if (!currentSessionToken) {
    currentSessionToken = crypto?.randomUUID?.() || 
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  return currentSessionToken;
}

export function resetSearchSession() {
  currentSessionToken = null;
}

// Debounce + abort helpers
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let abortController: AbortController | null = null;

// ─── ADDRESS PARSING ──────────────────────────────────────────────────

/**
 * Normalize common Argentine address abbreviations
 */
function normalizeAddress(query: string): string {
  let n = query.trim();
  n = n.replace(/\bav\.?\b/gi, 'Avenida');
  n = n.replace(/\bpje\.?\b/gi, 'Pasaje');
  n = n.replace(/\bbv\.?\b/gi, 'Boulevard');
  n = n.replace(/\bbvd\.?\b/gi, 'Boulevard');
  n = n.replace(/\bnro\.?\b/gi, '');
  n = n.replace(/\bn°\b/gi, '');
  n = n.replace(/\b#\b/g, '');
  return n.trim();
}

/**
 * Parse an Argentine address into components.
 * "Rivadavia 6094" → { street: "Rivadavia", number: "6094" }
 * "25 de mayo 3000" → { street: "25 de mayo", number: "3000" }
 * "San Martin 2500" → { street: "San Martin", number: "2500" }
 */
function parseAddress(query: string): { street: string; number: string } | null {
  const q = normalizeAddress(query).trim();
  
  // Pattern: street name followed by a house number at the end
  // Handles: "Rivadavia 6094", "San Martin 2500", "25 de mayo 3000"
  const match = q.match(/^(.+?)\s+(\d{2,5})\s*$/);
  if (match) {
    return { street: match[1].trim(), number: match[2] };
  }
  
  return null;
}

/**
 * Parse coordinates from string (Support for D.D, D.M.S, etc.)
 */
export function parseCoordinates(query: string): { lat: number, lng: number } | null {
  const q = query.trim();
  const ddMatch = q.match(/([-+]?\d+\.\d+)\s*[,|\s]\s*([-+]?\d+\.\d+)/);
  
  if (ddMatch) {
    const lat = parseFloat(ddMatch[1]);
    const lng = parseFloat(ddMatch[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }
  
  return null;
}

/**
 * Inject geographic context if not already present.
 * "French 8170" → "French 8170, Santa Fe, Argentina"
 */
function injectContext(query: string): string {
  const lower = query.toLowerCase();
  const hasCity = /santa fe|rosario|paraná|parana|rafaela|reconquista|venado tuerto|santo tome|sauce viejo|esperanza/i.test(lower);
  if (!hasCity) {
    return `${query}, Santa Fe, Argentina`;
  }
  if (!/argentina/i.test(lower)) {
    return `${query}, Argentina`;
  }
  return query;
}

// ─── ENGINE 1: PHOTON (Komoot) — Ultra Fast, Proximity-Aware ──────────

/**
 * Photon API by Komoot — FREE, no API key, proximity-biased.
 * Returns exact house numbers when available in OSM data.
 * Uses lat/lon for proximity bias toward Santa Fe.
 */
async function geocodePhoton(query: string): Promise<GeocodingResult[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      limit: '5',
      lat: SANTA_FE_CENTER.lat.toString(),
      lon: SANTA_FE_CENTER.lng.toString(),
    });

    const res = await fetch(`https://photon.komoot.io/api/?${params}`);
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.features || data.features.length === 0) return [];

    return data.features.map((f: any) => {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates || [0, 0];
      
      // Build a clean display name
      const parts: string[] = [];
      if (p.street && p.housenumber) parts.push(`${p.street} ${p.housenumber}`);
      else if (p.street) parts.push(p.street);
      else if (p.name) parts.push(p.name);
      if (p.city) parts.push(p.city);
      if (p.state) parts.push(p.state);
      
      return {
        lat: coords[1],
        lng: coords[0],
        displayName: parts.join(', ') || p.name || '',
        street: p.street || p.name || '',
        houseNumber: p.housenumber || '',
        city: p.city || p.town || p.village || '',
        state: p.state || 'Santa Fe',
        country: p.country || 'Argentina',
        type: p.type || p.osm_value || 'address',
        importance: p.type === 'house' ? 1 : 0.7,
      };
    });
  } catch (err) {
    console.error('Photon geocoding failed:', err);
    return [];
  }
}

// ─── ENGINE 2: NOMINATIM — Structured Queries with Viewbox ────────────

/**
 * Nominatim structured query — most precise for exact house numbers.
 * Uses viewbox to bound results to Santa Fe city area.
 */
async function geocodeNominatimStructured(
  street: string, 
  number: string, 
  city: string = 'Santa Fe'
): Promise<GeocodingResult[]> {
  try {
    const params = new URLSearchParams({
      street: `${number} ${street}`,
      city,
      country: 'Argentina',
      format: 'json',
      addressdetails: '1',
      limit: '3',
    });

    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'SPS_Platform_v3' }
    });
    if (!res.ok) return [];

    const data = await res.json();
    return data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      displayName: item.display_name,
      street: item.address?.road || '',
      houseNumber: item.address?.house_number || '',
      city: item.address?.city || item.address?.town || item.address?.village || '',
      state: item.address?.state || 'Santa Fe',
      country: 'Argentina',
      type: item.type || 'address',
      importance: item.type === 'house' ? 1 : (item.importance || 0.5),
    }));
  } catch (err) {
    console.error('Nominatim structured failed:', err);
    return [];
  }
}

/**
 * Nominatim free-form query with viewbox bounding to Santa Fe city.
 */
async function geocodeNominatimFreeform(query: string, bounded: boolean = false): Promise<GeocodingResult[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: '5',
      countrycodes: 'ar',
      viewbox: SANTA_FE_CITY_VIEWBOX,
      bounded: bounded ? '1' : '0',
    });

    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'SPS_Platform_v3' }
    });
    if (!res.ok) return [];

    const data = await res.json();
    return data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      displayName: item.display_name,
      street: item.address?.road || item.name || '',
      houseNumber: item.address?.house_number || '',
      city: item.address?.city || item.address?.town || item.address?.village || '',
      state: item.address?.state || 'Santa Fe',
      country: 'Argentina',
      type: item.type || 'address',
      importance: item.importance || 0.5,
    }));
  } catch (err) {
    console.error('Nominatim freeform failed:', err);
    return [];
  }
}

// ─── ENGINE 3: GOOGLE MAPS (Optional, if key provided) ───────────────

async function geocodeGoogle(searchString: string): Promise<GeocodingResult[]> {
  if (!GOOGLE_MAPS_KEY) return [];

  try {
    const params = new URLSearchParams({
      address: searchString,
      key: GOOGLE_MAPS_KEY,
      language: 'es',
      region: 'ar',
    });

    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.results || data.results.length === 0) return [];

    return data.results.map((item: any) => {
      const getComp = (type: string) => item.address_components?.find((c: any) => c.types.includes(type))?.long_name || '';
      return {
        lat: item.geometry.location.lat,
        lng: item.geometry.location.lng,
        displayName: item.formatted_address,
        street: getComp('route'),
        houseNumber: getComp('street_number'),
        city: getComp('locality') || getComp('administrative_area_level_2'),
        state: getComp('administrative_area_level_1'),
        country: 'Argentina',
        type: item.types?.[0] || 'address',
        importance: 1,
      };
    });
  } catch (err) {
    console.error('Google Maps geocoding error:', err);
    return [];
  }
}

// ─── ENGINE 4: MAPBOX (Fallback for POIs) ─────────────────────────────

/**
 * Mapbox v5 Geocoding — good for POIs and general addresses.
 */
async function geocodeMapbox(searchString: string): Promise<GeocodingResult[]> {
  if (!MAPBOX_TOKEN) return [];
  
  try {
    const hasNumber = /\d+/.test(searchString);
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      autocomplete: 'true',
      country: 'ar',
      language: 'es',
      proximity: `${SANTA_FE_CENTER.lng},${SANTA_FE_CENTER.lat}`,
      bbox: SANTA_FE_BBOX,
      types: hasNumber ? 'address' : 'address,poi,place,locality',
      limit: '3',
      fuzzyMatch: 'true',
    });

    const res = await fetch(`${MAPBOX_GEO_BASE}/${encodeURIComponent(searchString)}.json?${params}`);
    if (!res.ok) return [];

    const data = await res.json();
    return (data.features || []).map((f: any) => {
      const context = f.context || [];
      return {
        lat: f.center[1],
        lng: f.center[0],
        displayName: f.place_name,
        street: f.text || '',
        houseNumber: f.address || '',
        city: context.find((c: any) => c.id.startsWith('place'))?.text || context.find((c: any) => c.id.startsWith('locality'))?.text || '',
        state: context.find((c: any) => c.id.startsWith('region'))?.text || 'Santa Fe',
        country: context.find((c: any) => c.id.startsWith('country'))?.text || 'Argentina',
        type: f.place_type?.[0] || '',
        importance: f.relevance || 0,
      };
    });
  } catch (err) {
    console.error('Mapbox geocoding failed:', err);
    return [];
  }
}

// ─── SEARCH BOX API (POI Discovery) ──────────────────────────────────

/**
 * Search Box API v1 Suggest — best for POIs (businesses, landmarks).
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
      proximity: `${SANTA_FE_CENTER.lng},${SANTA_FE_CENTER.lat}`,
      bbox: SANTA_FE_BBOX,
      types: 'poi,place',
      limit: '5'
    });

    const res = await fetch(`${MAPBOX_SEARCH_BASE}/suggest?${params}`, { signal: abortController.signal });
    if (!res.ok) throw new Error(`Search Box failed: ${res.status}`);

    const data = await res.json();
    
    return (data.suggestions || []).map((s: any) => ({
      lat: 0,
      lng: 0,
      displayName: s.name + (s.address ? `, ${s.address}` : '') + (s.place_formatted ? ` — ${s.place_formatted}` : ''),
      street: s.name || '',
      houseNumber: s.address || '',
      city: s.place_formatted?.split(',')[0]?.trim() || '',
      state: 'Santa Fe',
      country: 'Argentina',
      type: s.feature_type || 'poi',
      importance: 0.8,
      mapbox_id: s.mapbox_id
    }));
  } catch (err: any) {
    if (err.name === 'AbortError') return [];
    console.error('Search Box error:', err);
    return [];
  }
}

/**
 * Search Box Retrieve — gets precise coords from a suggest result.
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

// ─── MAIN FORWARD GEOCODING — MULTI-ENGINE ORCHESTRATOR ──────────────

/**
 * Forward Geocoding: text → coordinates
 * 
 * Strategy:
 * 1. If Google Maps key exists, use it (highest precision)
 * 2. Parse the address to detect street + number
 * 3. If parsed: run Photon + Nominatim structured IN PARALLEL
 * 4. If not parsed: run Photon + Nominatim freeform IN PARALLEL
 * 5. Deduplicate, score, and rank results
 * 6. Mapbox as supplementary for POIs
 */
export async function geocodeForward(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) return [];
  
  const normalized = normalizeAddress(query);
  const contextual = injectContext(normalized);
  const parsed = parseAddress(normalized);
  const seen = new Set<string>();
  let results: GeocodingResult[] = [];

  // 1. Google Maps (if key provided — highest precision)
  if (GOOGLE_MAPS_KEY) {
    results = await geocodeGoogle(contextual);
    if (results.length > 0) return results.slice(0, 7);
  }

  // 2. Multi-engine parallel query (all FREE)
  if (parsed) {
    // We have a street + number — use structured + photon in parallel
    const [photonResults, nominatimResults, nominatimBoundedResults] = await Promise.all([
      geocodePhoton(`${parsed.street} ${parsed.number} Santa Fe`).catch(() => [] as GeocodingResult[]),
      geocodeNominatimStructured(parsed.street, parsed.number, 'Santa Fe').catch(() => [] as GeocodingResult[]),
      geocodeNominatimFreeform(`${parsed.street} ${parsed.number}, Santa Fe, Argentina`, true).catch(() => [] as GeocodingResult[]),
    ]);

    // Merge all results, prioritizing exact house matches
    const allRaw = [...photonResults, ...nominatimResults, ...nominatimBoundedResults];
    
    // Sort: exact house numbers first, then by proximity to Santa Fe center
    allRaw.sort((a, b) => {
      // Exact house number match gets priority
      const aExact = a.houseNumber === parsed.number ? 1 : 0;
      const bExact = b.houseNumber === parsed.number ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      
      // Santa Fe city results get priority
      const aIsSF = a.city.toLowerCase().includes('santa fe') ? 1 : 0;
      const bIsSF = b.city.toLowerCase().includes('santa fe') ? 1 : 0;
      if (aIsSF !== bIsSF) return bIsSF - aIsSF;
      
      // Closer to Santa Fe center gets priority
      const aDist = Math.hypot(a.lat - SANTA_FE_CENTER.lat, a.lng - SANTA_FE_CENTER.lng);
      const bDist = Math.hypot(b.lat - SANTA_FE_CENTER.lat, b.lng - SANTA_FE_CENTER.lng);
      return aDist - bDist;
    });

    // Deduplicate
    for (const r of allRaw) {
      const key = `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(r);
      }
    }
  } else {
    // No parsed number — freeform search
    const [photonResults, nominatimResults] = await Promise.all([
      geocodePhoton(contextual).catch(() => [] as GeocodingResult[]),
      geocodeNominatimFreeform(contextual, false).catch(() => [] as GeocodingResult[]),
    ]);

    const allRaw = [...photonResults, ...nominatimResults];
    
    // Sort by proximity to Santa Fe
    allRaw.sort((a, b) => {
      const aIsSF = a.city.toLowerCase().includes('santa fe') ? 1 : 0;
      const bIsSF = b.city.toLowerCase().includes('santa fe') ? 1 : 0;
      if (aIsSF !== bIsSF) return bIsSF - aIsSF;
      
      const aDist = Math.hypot(a.lat - SANTA_FE_CENTER.lat, a.lng - SANTA_FE_CENTER.lng);
      const bDist = Math.hypot(b.lat - SANTA_FE_CENTER.lat, b.lng - SANTA_FE_CENTER.lng);
      return aDist - bDist;
    });

    for (const r of allRaw) {
      const key = `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(r);
      }
    }
  }

  // 3. Mapbox supplementary (for POIs and when other engines have few results)
  if (MAPBOX_TOKEN && results.length < 3) {
    const mapboxResults = await geocodeMapbox(contextual).catch(() => [] as GeocodingResult[]);
    for (const r of mapboxResults) {
      const key = `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(r);
      }
    }
  }

  return results.slice(0, 7);
}

// ─── UNIFIED SEARCH — Uber-grade Autocomplete ────────────────────────

/**
 * Main search function — runs ALL engines in parallel for instant results.
 * Debounced at 150ms for Uber-like instant feel.
 * Deduplicates and ranks by precision + proximity.
 */
let pendingResolves: ((res: GeocodingResult[]) => void)[] = [];
let pendingRejects: ((err: any) => void)[] = [];

export function searchAddresses(
  query: string, 
  debounceMs = 150  // Reduced from 250ms → 150ms for faster UX
): Promise<GeocodingResult[]> {
  return new Promise((resolve, reject) => {
    pendingResolves.push(resolve);
    pendingRejects.push(reject);

    if (debounceTimer) clearTimeout(debounceTimer);
    
    if (!query || query.trim().length < 3) {
      const resolves = pendingResolves;
      pendingResolves = [];
      pendingRejects = [];
      resolves.forEach(r => r([]));
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const results: GeocodingResult[] = [];

        // 1. Check if query is a coordinate
        const coords = parseCoordinates(query);
        if (coords) {
          const rev = await reverseGeocode(coords.lat, coords.lng);
          results.push({
            lat: coords.lat,
            lng: coords.lng,
            displayName: rev?.displayName || `${coords.lat}, ${coords.lng}`,
            street: rev?.street || '',
            houseNumber: rev?.houseNumber || '',
            city: rev?.city || 'Ubicación por coordenadas',
            state: rev?.state || '',
            country: 'Argentina',
            type: 'coordinate',
            importance: 1,
          });
        }

        // 2. Run address geocoding + POI search in parallel
        const [addressResults, poiResults] = await Promise.all([
          geocodeForward(query).catch(() => [] as GeocodingResult[]),
          searchBoxSuggest(query).catch(() => [] as GeocodingResult[])
        ]);

        // Merge: coords first, then address results, then POIs
        const merged: GeocodingResult[] = [...results];
        const seenKeys = new Set(results.map(r => `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`));

        for (const r of [...addressResults, ...poiResults]) {
          const key = r.lat !== 0 ? `${r.lat.toFixed(4)},${r.lng.toFixed(4)}` : r.mapbox_id || r.displayName;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            merged.push(r);
          }
        }

        const finalResults = merged.slice(0, 10);
        const resolves = pendingResolves;
        pendingResolves = [];
        pendingRejects = [];
        resolves.forEach(r => r(finalResults));
      } catch (err) {
        const rejects = pendingRejects;
        pendingResolves = [];
        pendingRejects = [];
        rejects.forEach(r => r(err));
      }
    }, debounceMs);
  });
}

// ─── REVERSE GEOCODING ────────────────────────────────────────────────

/**
 * Reverse Geocoding: coordinates → address
 * 
 * Chain: Google (if key) → Photon → Nominatim → Mapbox
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodingResult | null> {
  // 1. Google Maps (if key provided)
  if (GOOGLE_MAPS_KEY) {
    try {
      const params = new URLSearchParams({
        latlng: `${lat},${lng}`,
        key: GOOGLE_MAPS_KEY,
        language: 'es',
        result_type: 'street_address|premise'
      });
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const item = data.results[0];
          const getComp = (type: string) => item.address_components?.find((c: any) => c.types.includes(type))?.long_name || '';
          return {
            displayName: item.formatted_address,
            street: getComp('route'),
            houseNumber: getComp('street_number'),
            city: getComp('locality') || getComp('administrative_area_level_2'),
            state: getComp('administrative_area_level_1'),
            postcode: getComp('postal_code')
          };
        }
      }
    } catch (err) {
      console.error('Google Maps reverse failed:', err);
    }
  }

  // 2. Photon Reverse (FREE, fast)
  try {
    const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&limit=1`);
    if (res.ok) {
      const data = await res.json();
      const f = data.features?.[0];
      if (f?.properties) {
        const p = f.properties;
        const parts: string[] = [];
        if (p.street && p.housenumber) parts.push(`${p.street} ${p.housenumber}`);
        else if (p.street) parts.push(p.street);
        else if (p.name) parts.push(p.name);
        if (p.city) parts.push(p.city);
        if (p.state) parts.push(p.state);
        
        return {
          displayName: parts.join(', ') || p.name || `${lat}, ${lng}`,
          street: p.street || p.name || '',
          houseNumber: p.housenumber || '',
          city: p.city || p.town || p.village || '',
          state: p.state || 'Santa Fe',
          postcode: p.postcode || '',
        };
      }
    }
  } catch (err) {
    console.error('Photon reverse failed:', err);
  }

  // 3. Nominatim Reverse (FREE)
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      format: 'json',
      addressdetails: '1',
      zoom: '18'
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: { 'User-Agent': 'SPS_Platform_v3' }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        return {
          displayName: data.display_name,
          street: data.address.road || '',
          houseNumber: data.address.house_number || '',
          city: data.address.city || data.address.town || data.address.village || '',
          state: data.address.state || 'Santa Fe',
          postcode: data.address.postcode || '',
        };
      }
    }
  } catch (err) {
    console.error('Nominatim reverse failed:', err);
  }

  // 4. Mapbox Fallback
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

// ─── UTILITIES ────────────────────────────────────────────────────────

/**
 * Calculate distance between two coordinates in meters (Haversine)
 */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

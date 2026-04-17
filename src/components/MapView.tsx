'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  ZoomControl, 
  Circle, 
  useMapEvents,
  useMap
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { reverseGeocode } from '@/lib/geocoding';

let L: any;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}

/* ─── Interfaces ─── */

interface Objective {
  id: string;
  name: string;
  address?: string;
  client_name?: string;
  latitude: number;
  longitude: number;
  status: string;
  geofence_radius?: number;
}

interface Guard {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  role?: string;
}

interface Incident {
  id: string;
  entry_type: string;
  content: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
}

interface MapViewProps {
  objectives?: Objective[];
  guards?: Guard[];
  incidents?: Incident[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  onObjectiveSelect?: (objective: Objective) => void;
  onMapClick?: (coords: { lat: number, lng: number }) => void;
  onReverseGeocode?: (address: string) => void;
  isPickerMode?: boolean;
  draftCoords?: { lat: number, lng: number } | null;
  draft_geofence_radius?: number;
  selectedObjectiveId?: string | null;
  tileStyle?: 'streets' | 'satellite' | 'dark';
}

/* ─── Custom Styles ─── */

const mapStyles = `
  @keyframes pulse-ring {
    0% { transform: scale(0.8); opacity: 0.8; }
    50% { transform: scale(1.6); opacity: 0; }
    100% { transform: scale(0.8); opacity: 0; }
  }
  @keyframes guard-breathe {
    0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
    50% { box-shadow: 0 0 0 12px rgba(34,197,94,0); }
  }
  /* CRITICAL: NO transition on .leaflet-marker-icon to prevent zoom drift */
  .leaflet-marker-icon {
    transition: none !important;
  }
  .guard-marker-animated .guard-icon-inner {
    transition: transform 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  .clean-popup .leaflet-popup-content-wrapper {
    border-radius: 12px !important;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
  }
`;

/* ─── Icon Factories (Classic Drop Shape) ─── */

function createObjectiveIcon(isSelected: boolean) {
  if (!L) return undefined;
  const size = isSelected ? 44 : 36;
  const color = '#F59E0B';

  return L.divIcon({
    className: 'custom-objective-icon',
    html: `
      <div style="
        width:${size}px; height:${size}px;
        background:${color};
        border: 2px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display:flex; align-items:center; justify-content:center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        <div style="transform: rotate(45deg);">
          <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <path d="M3 21h18M3 7v14M21 7v14M9 21V11M15 21V11M5 7l7-4 7 4M10 9v2M14 9v2"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size], // Exact tip
    popupAnchor: [0, -size],
  });
}

function createGuardIcon() {
  if (!L) return undefined;
  return L.divIcon({
    className: 'guard-live-icon',
    html: `
      <div style="display:flex; align-items:center; justify-content:center; position:relative;">
        <div style="position:absolute; width:36px; height:36px; border-radius:50%; border: 2px solid #22c55e; animation: pulse-ring 2s infinite;"></div>
        <div style="width:24px; height:24px; background:#22c55e; border-radius:50%; border:2px solid white; box-shadow: 0 0 10px rgba(34,197,94,0.4); display:flex; align-items:center; justify-content:center;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

function createIncidentIcon(isIncident: boolean) {
  if (!L) return undefined;
  const color = isIncident ? '#ef4444' : '#3b82f6';
  const size = 32;

  return L.divIcon({
    className: 'custom-incident-icon',
    html: `
      <div style="
        width:${size}px; height:${size}px;
        background:${color};
        border: 2px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display:flex; align-items:center; justify-content:center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ">
        <div style="transform: rotate(45deg);">
          <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
            ${isIncident ? '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3ZM12 9v4M12 17h.01"/>' : '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>'}
          </svg>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

function createDraftIcon() {
  if (!L) return undefined;
  const size = 40;
  return L.divIcon({
    className: 'custom-draft-icon',
    html: `
      <div style="
        width:${size}px; height:${size}px;
        background:#3b82f6;
        border: 2px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display:flex; align-items:center; justify-content:center;
        box-shadow: 0 4px 12px rgba(59,130,246,0.4);
      ">
        <div style="transform: rotate(45deg);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

/* ─── Tile Layers ─── */

const TILES = {
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    name: 'Calles',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar',
    name: 'Satélite',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CartoDB</a>',
    name: 'Oscuro',
  },
};

/* ─── Guard Popup with Reverse Geocoding ─── */

function GuardPopupContent({ guard }: { guard: Guard & { lastUpdate?: string } }) {
  const [address, setAddress] = useState<string>('Obteniendo dirección...');

  useEffect(() => {
    let cancelled = false;
    reverseGeocode(Number(guard.latitude), Number(guard.longitude))
      .then(result => {
        if (!cancelled) {
          setAddress(result?.displayName || 'Sin dirección disponible');
        }
      });
    return () => { cancelled = true; };
  }, [guard.latitude, guard.longitude]);

  const getTimeSince = () => {
    if (!guard.lastUpdate) return null;
    const diff = Date.now() - new Date(guard.lastUpdate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora mismo';
    if (mins < 60) return `Hace ${mins} min`;
    return `Hace ${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const timeSince = getTimeSince();

  return (
    <div className="p-3 min-w-[220px]">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-green-600 uppercase">en vivo</span>
        </div>
        {timeSince && <span className="text-[9px] text-gray-400 font-mono">{timeSince}</span>}
      </div>
      <p className="text-sm font-bold text-gray-900">{guard.name}</p>
      <p className="text-xs text-gray-500 mt-0.5">{guard.role || 'Personal'}</p>
      <div className="mt-2 pt-2 border-t border-gray-100">
        <p className="text-[11px] text-gray-400 font-medium">📍 {address}</p>
      </div>
      <div className="mt-1.5">
        <p className="text-[10px] text-gray-300 font-mono">
          {Number(guard.latitude).toFixed(5)}, {Number(guard.longitude).toFixed(5)}
        </p>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

export default function MapView({
  objectives = [],
  guards = [],
  incidents = [],
  center = [-31.6350, -60.7000],
  zoom = 13,
  className = "",
  onObjectiveSelect,
  onMapClick,
  onReverseGeocode,
  isPickerMode = false,
  draftCoords = null,
  draft_geofence_radius = 200,
  selectedObjectiveId = null,
  tileStyle = 'streets',
}: MapViewProps) {
  const [mounted, setMounted] = useState(false);
  const [liveGuards, setLiveGuards] = useState<Guard[]>(guards);
  const [activeTile, setActiveTile] = useState<keyof typeof TILES>(tileStyle);
  const [clickedAddress, setClickedAddress] = useState<string | null>(null);
  const prevGuardsRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());

  useEffect(() => { setMounted(true); }, []);

  // Sync guards prop
  useEffect(() => {
    setLiveGuards(guards);
    // Update position cache
    const newMap = new Map<string, { lat: number; lng: number }>();
    guards.forEach(g => {
      if (g.latitude && g.longitude) {
        newMap.set(g.id, { lat: Number(g.latitude), lng: Number(g.longitude) });
      }
    });
    prevGuardsRef.current = newMap;
  }, [guards]);

  // Real-time location subscription: listen to both tracking_logs and resources updates
  useEffect(() => {
    if (!mounted) return;

    const channel = supabase
      .channel('mapview_live_locations')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'tracking_logs',
      }, (payload) => {
        const loc = payload.new as any;
        setLiveGuards(prev => {
          const newLat = Number(loc.latitude);
          const newLng = Number(loc.longitude);

          const exists = prev.find(g => g.id === loc.resource_id);
          if (exists) {
            return prev.map(g =>
              g.id === loc.resource_id
                ? { ...g, latitude: newLat, longitude: newLng, lastUpdate: loc.recorded_at } as any
                : g
            );
          }
          return [
            ...prev,
            {
              id: loc.resource_id,
              name: 'Personal ' + (loc.resource_id || '').substring(0, 6),
              latitude: newLat,
              longitude: newLng,
              status: 'active',
              lastUpdate: loc.recorded_at,
            } as any,
          ];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'resources',
      }, (payload) => {
        const updated = payload.new as any;
        if (updated.latitude && updated.longitude && updated.status !== 'baja') {
          setLiveGuards(prev => {
            const exists = prev.find(g => g.id === updated.id);
            if (exists) {
              return prev.map(g =>
                g.id === updated.id
                  ? { ...g, latitude: Number(updated.latitude), longitude: Number(updated.longitude), name: updated.name || g.name }
                  : g
              );
            }
            return [
              ...prev,
              {
                id: updated.id,
                name: updated.name || 'Personal',
                latitude: Number(updated.latitude),
                longitude: Number(updated.longitude),
                status: updated.status || 'active',
                role: updated.role,
              },
            ];
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [mounted]);

  // Handle map click with reverse geocoding
  const handleMapClick = useCallback(async (coords: { lat: number; lng: number }) => {
    if (isPickerMode && onMapClick) {
      onMapClick(coords);
    }

    // Reverse geocode the clicked position
    const result = await reverseGeocode(coords.lat, coords.lng);
    if (result) {
      setClickedAddress(result.displayName);
      if (onReverseGeocode) {
        onReverseGeocode(result.displayName);
      }
    }
  }, [isPickerMode, onMapClick, onReverseGeocode]);

  if (!mounted) {
    return (
      <div className={cn("w-full h-full bg-gray-100 flex flex-col items-center justify-center", className)}>
        <div className="w-10 h-10 rounded-full border-3 border-gray-300 border-t-primary animate-spin" />
        <p className="mt-4 text-xs text-gray-400 font-medium">Cargando mapa...</p>
      </div>
    );
  }

  const tile = TILES[activeTile];

  return (
    <div className={cn(
      "relative w-full h-full z-0 bg-gray-100 overflow-hidden",
      isPickerMode ? "cursor-crosshair" : "",
      className,
    )}>
      {/* Inject animation CSS */}
      <style dangerouslySetInnerHTML={{ __html: mapStyles }} />

      {/* Tile Switcher */}
      <div className="absolute top-4 right-4 z-[30] flex flex-col gap-1 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {Object.entries(TILES).map(([key, t]) => (
          <button
            key={key}
            onClick={() => setActiveTile(key as keyof typeof TILES)}
            className={cn(
              "px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all",
              activeTile === key
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
            )}
          >
            {t.name}
          </button>
        ))}
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <MapController
          onMapClick={handleMapClick}
          isPickerMode={isPickerMode}
          draftCoords={draftCoords}
        />
        <TileLayer attribution={tile.attribution} url={tile.url} />

        {/* Geofence Circles around Objectives */}
        {objectives.map((obj) => {
          const radius = obj.geofence_radius || 200;
          return (
            <Circle
              key={`geo-${obj.id}`}
              center={[Number(obj.latitude), Number(obj.longitude)]}
              radius={radius}
              pathOptions={{
                color: '#F59E0B',
                fillColor: '#FEF3C7',
                fillOpacity: 0.15,
                weight: 1.5,
                dashArray: '6 4',
              }}
            />
          );
        })}

        {/* Draft Geofence & Pin */}
        {draftCoords && (
          <>
            <Circle
              center={[Number(draftCoords.lat), Number(draftCoords.lng)]}
              radius={draft_geofence_radius}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#dbeafe',
                fillOpacity: 0.2,
                weight: 2,
                dashArray: '5 5',
              }}
            />
            <Marker
              position={[Number(draftCoords.lat), Number(draftCoords.lng)]}
              icon={createDraftIcon()}
            >
              <Popup className="clean-popup">
                <div className="p-3">
                  <p className="text-xs font-bold text-blue-600 uppercase">Nueva ubicación</p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {Number(draftCoords.lat).toFixed(6)}, {Number(draftCoords.lng).toFixed(6)}
                  </p>
                  {clickedAddress && (
                    <p className="text-[11px] text-gray-700 mt-1 font-medium">📍 {clickedAddress}</p>
                  )}
                  <p className="text-[10px] text-blue-500 mt-2 font-bold uppercase">Radio: {draft_geofence_radius}m</p>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Incident Markers */}
        {incidents.map((inc) => {
          if (!inc.latitude || !inc.longitude) return null;
          const isIncident = inc.entry_type === 'incidente';
          return (
            <Marker
              key={`inc-${inc.id}`}
              position={[Number(inc.latitude), Number(inc.longitude)]}
              icon={createIncidentIcon(isIncident)}
            >
              <Popup className="clean-popup">
                <div className="p-3 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("w-2 h-2 rounded-full", isIncident ? "bg-red-500" : "bg-blue-500")} />
                    <span className="text-[10px] uppercase font-bold text-gray-400">{inc.entry_type}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{inc.content}</p>
                  <p className="text-[10px] text-gray-400 mt-2">
                    {new Date(inc.created_at || '').toLocaleString('es-AR')}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Objective Markers */}
        {objectives.map((obj) => (
          <React.Fragment key={`obj-${obj.id}`}>
            <Marker
              position={[Number(obj.latitude), Number(obj.longitude)]}
              icon={createObjectiveIcon(selectedObjectiveId === obj.id)}
              eventHandlers={{
                click: () => {
                  if (!isPickerMode && onObjectiveSelect) {
                    onObjectiveSelect(obj);
                  }
                },
              }}
            >
              <Popup className="clean-popup">
                <div className="p-3 min-w-[220px]">
                  <h3 className="text-sm font-bold text-gray-900">{obj.name}</h3>
                  {obj.address && (
                    <p className="text-xs text-gray-500 mt-1">📍 {obj.address}</p>
                  )}
                  {obj.client_name && (
                    <p className="text-xs text-gray-400 mt-0.5">🏢 {obj.client_name}</p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      obj.status === 'Activo' ? "bg-green-500" : "bg-gray-400"
                    )} />
                    <span className="text-xs font-medium text-gray-600">{obj.status}</span>
                    {obj.geofence_radius && (
                      <span className="text-[10px] text-gray-400 ml-auto">
                        Radio: {obj.geofence_radius}m
                      </span>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}

        {/* Guard Markers (Live/Animated) */}
        {liveGuards.map((guard) => {
          if (!guard.latitude || !guard.longitude) return null;
          return (
            <Marker
              key={`guard-${guard.id}`}
              position={[Number(guard.latitude), Number(guard.longitude)]}
              icon={createGuardIcon()}
            >
              <Popup className="clean-popup">
                <GuardPopupContent guard={guard} />
              </Popup>
            </Marker>
          );
        })}

        <ZoomControl position="bottomright" />
      </MapContainer>
    </div>
  );
}

/* ─── Map Controller (Events + Camera) ─── */

function MapController({
  onMapClick,
  isPickerMode,
  draftCoords,
}: {
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  isPickerMode: boolean;
  draftCoords?: { lat: number; lng: number } | null;
}) {
  const map = useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });

  // Fly to draft coordinates
  useEffect(() => {
    if (draftCoords) {
      map.flyTo([draftCoords.lat, draftCoords.lng], 17, {
        animate: true,
        duration: 1.2,
      });
    }
  }, [draftCoords, map]);

  // Fix map size on mount
  useEffect(() => {
    map.invalidateSize();
  }, [map]);

  return null;
}

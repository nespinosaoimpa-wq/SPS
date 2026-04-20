'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Map, { Marker, Popup, Source, Layer, NavigationControl, FullscreenControl, GeolocateControl, MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { reverseGeocode } from '@/lib/geocoding';
import { Shield, MapPin, AlertTriangle, User, Target } from 'lucide-react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

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
  lastUpdate?: string;
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
  tileStyle?: 'streets' | 'satellite' | 'dark' | 'navigation';
}

/* ─── Mapbox Styles ─── */
const MAP_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
  navigation: 'mapbox://styles/mapbox/navigation-day-v1', // High precision/Uber feel
};

/* ─── Helper for Geofence GeoJSON ─── */
const createCirclePolygon = (center: [number, number], radiusInMeters: number, points = 64) => {
  const coords = {
    latitude: center[0],
    longitude: center[1]
  };
  const km = radiusInMeters / 1000;
  const ret = [];
  const distanceX = km / (111.32 * Math.cos(coords.latitude * Math.PI / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    ret.push([coords.longitude + x, coords.latitude + y]);
  }
  ret.push(ret[0]); // close loop
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ret]
    }
  };
};

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
  tileStyle = 'navigation',
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [is3D, setIs3D] = useState(false);
  const [viewState, setViewState] = useState({
    latitude: center[0],
    longitude: center[1],
    zoom: zoom,
    pitch: 0,
    bearing: 0
  });

  const toggle3D = () => {
    const next3D = !is3D;
    setIs3D(next3D);
    setViewState(prev => ({
      ...prev,
      pitch: next3D ? 60 : 0,
      bearing: next3D ? -20 : 0,
    }));
  };
  const [liveGuards, setLiveGuards] = useState<Guard[]>(guards);
  const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null);
  const [selectedGuard, setSelectedGuard] = useState<Guard | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [activeStyle, setActiveStyle] = useState<keyof typeof MAP_STYLES>(tileStyle);

  // Sync guards prop
  useEffect(() => { setLiveGuards(guards); }, [guards]);

  // Real-time location subscription (identical logic to previous version)
  useEffect(() => {
    const channel = supabase
      .channel('mapview_live_locations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tracking_logs' }, (payload) => {
        const loc = payload.new as any;
        setLiveGuards(prev => {
          const exists = prev.find(g => g.id === loc.resource_id);
          if (exists) {
            return prev.map(g => g.id === loc.resource_id ? { ...g, latitude: Number(loc.latitude), longitude: Number(loc.longitude), lastUpdate: loc.recorded_at } : g);
          }
          return [...prev, { id: loc.resource_id, name: 'Personal ' + (loc.resource_id || '').substring(0, 6), latitude: Number(loc.latitude), longitude: Number(loc.longitude), status: 'active', lastUpdate: loc.recorded_at } as any];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'resources' }, (payload) => {
        const updated = payload.new as any;
        if (updated.latitude && updated.longitude && updated.status !== 'baja') {
          setLiveGuards(prev => {
            const exists = prev.find(g => g.id === updated.id);
            if (exists) {
              return prev.map(g => g.id === updated.id ? { ...g, latitude: Number(updated.latitude), longitude: Number(updated.longitude), name: updated.name || g.name } : g);
            }
            return [...prev, { id: updated.id, name: updated.name || 'Personal', latitude: Number(updated.latitude), longitude: Number(updated.longitude), status: updated.status || 'active', role: updated.role }];
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleMapClick = useCallback(async (e: any) => {
    const coords = e.lngLat;
    if (isPickerMode && onMapClick) {
      onMapClick({ lat: coords.lat, lng: coords.lng });
    }
    const result = await reverseGeocode(coords.lat, coords.lng);
    if (result && onReverseGeocode) {
      onReverseGeocode(result.displayName);
    }
  }, [isPickerMode, onMapClick, onReverseGeocode]);

  // Generate GeoJSON for geofences
  const geofenceData = useMemo(() => ({
    type: 'FeatureCollection',
    features: objectives.map(obj => createCirclePolygon([obj.latitude, obj.longitude], obj.geofence_radius || 200))
  }), [objectives]);

  const draftGeofenceData = useMemo(() => {
    if (!draftCoords) return null;
    return createCirclePolygon([draftCoords.lat, draftCoords.lng], draft_geofence_radius);
  }, [draftCoords, draft_geofence_radius]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center p-8 text-center">
        <p className="text-white font-bold">ERROR: Mapbox Token missing. Please check .env.local</p>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle={MAP_STYLES[activeStyle]}
        mapboxAccessToken={MAPBOX_TOKEN}
        onClick={handleMapClick}
        style={{ width: '100%', height: '100%' }}
        ref={mapRef}
      >
        <NavigationControl position="bottom-right" />
        <GeolocateControl position="bottom-right" />

        {/* Geofences Layer */}
        <Source id="geofences" type="geojson" data={geofenceData as any}>
          <Layer
            id="geofence-fill"
            type="fill"
            paint={{ 'fill-color': '#F59E0B', 'fill-opacity': 0.1 }}
          />
          <Layer
            id="geofence-outline"
            type="line"
            paint={{ 'line-color': '#F59E0B', 'line-width': 1, 'line-dasharray': [2, 2] }}
          />
        </Source>

        {/* Draft Geofence Layer */}
        {draftGeofenceData && (
          <Source id="draft-geofence" type="geojson" data={draftGeofenceData as any}>
            <Layer
              id="draft-fill"
              type="fill"
              paint={{ 'fill-color': '#3b82f6', 'fill-opacity': 0.2 }}
            />
            <Layer
              id="draft-outline"
              type="line"
              paint={{ 'line-color': '#3b82f6', 'line-width': 2, 'line-dasharray': [3, 1] }}
            />
          </Source>
        )}

        {/* Objective Markers */}
        {objectives.map((obj) => (
          <Marker
            key={`obj-${obj.id}`}
            latitude={Number(obj.latitude)}
            longitude={Number(obj.longitude)}
            onClick={e => {
              e.originalEvent.stopPropagation();
              setSelectedObjective(obj);
              if (onObjectiveSelect) onObjectiveSelect(obj);
            }}
          >
            <div className={cn(
              "p-2 rounded-full border-2 border-white shadow-lg cursor-pointer transition-transform hover:scale-110",
              selectedObjectiveId === obj.id ? "bg-amber-500" : "bg-black"
            )}>
              <Shield className="w-4 h-4 text-white" />
            </div>
          </Marker>
        ))}

        {/* Guard Markers (Uber-style) */}
        {liveGuards.map((guard) => {
          if (!guard.latitude || !guard.longitude) return null;
          return (
            <Marker
              key={`guard-${guard.id}`}
              latitude={Number(guard.latitude)}
              longitude={Number(guard.longitude)}
              onClick={e => {
                e.originalEvent.stopPropagation();
                setSelectedGuard(guard);
              }}
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute w-8 h-8 bg-green-500/20 rounded-full animate-ping" />
                <div className="w-6 h-6 bg-green-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center">
                  <User className="w-3 h-3 text-white" />
                </div>
              </div>
            </Marker>
          );
        })}

        {/* Incident Markers */}
        {incidents.map((inc) => {
          if (!inc.latitude || !inc.longitude) return null;
          return (
            <Marker
              key={`inc-${inc.id}`}
              latitude={Number(inc.latitude)}
              longitude={Number(inc.longitude)}
              onClick={e => {
                e.originalEvent.stopPropagation();
                setSelectedIncident(inc);
              }}
            >
              <div className="bg-red-600 p-1.5 rounded-lg shadow-xl cursor-pointer border-2 border-white">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
            </Marker>
          );
        })}

        {/* Draft Picker Marker */}
        {draftCoords && (
          <Marker latitude={draftCoords.lat} longitude={draftCoords.lng}>
            <div className="flex flex-col items-center">
              <Target className="w-8 h-8 text-blue-500 animate-pulse" />
            </div>
          </Marker>
        )}

        {/* Popups */}
        {selectedObjective && (
          <Popup
            latitude={Number(selectedObjective.latitude)}
            longitude={Number(selectedObjective.longitude)}
            onClose={() => setSelectedObjective(null)}
            closeButton={false}
            offset={20}
            className="clean-popup"
          >
            <div className="p-2 min-w-[150px]">
              <h3 className="font-bold text-sm">{selectedObjective.name}</h3>
              <p className="text-xs text-gray-500">{selectedObjective.address}</p>
            </div>
          </Popup>
        )}

        {selectedGuard && (
          <Popup
            latitude={Number(selectedGuard.latitude)}
            longitude={Number(selectedGuard.longitude)}
            onClose={() => setSelectedGuard(null)}
            closeButton={false}
            offset={15}
          >
            <div className="p-1">
              <p className="font-bold text-sm">{selectedGuard.name}</p>
              <p className="text-[10px] text-green-600 font-bold uppercase">En línea</p>
            </div>
          </Popup>
        )}
      </Map>

      {/* Style Switcher & 3D Toggle */}
      <div className="absolute top-6 right-6 z-10 flex flex-col gap-2 bg-black/80 backdrop-blur-md p-1.5 rounded-xl shadow-2xl border border-white/10">
        <button
          onClick={toggle3D}
          className={cn(
            "px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all mb-1 border-b border-white/10 pb-2",
            is3D ? "text-primary italic" : "text-white/40 hover:text-white"
          )}
        >
          {is3D ? 'View: 3D' : 'View: 2D'}
        </button>
        {(Object.keys(MAP_STYLES) as Array<keyof typeof MAP_STYLES>).map(style => (
          <button
            key={style}
            onClick={() => setActiveStyle(style)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              activeStyle === style ? "bg-primary text-black" : "text-white/40 hover:text-white"
            )}
          >
            {style}
          </button>
        ))}
      </div>
    </div>
  );
}


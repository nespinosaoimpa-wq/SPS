'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Map, { Marker, Popup, Source, Layer, NavigationControl, FullscreenControl, GeolocateControl, MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { reverseGeocode } from '@/lib/geocoding';
import { Shield, MapPin, AlertTriangle, User, Target, Layers, Car, UserX, DoorOpen, Package, Lightbulb, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  accuracy?: number;
  speed?: number;
  heading?: number;
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
  showHeatmap?: boolean;
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
  showHeatmap = false,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [showStyles, setShowStyles] = useState(false);
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

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync guards prop
  useEffect(() => { setLiveGuards(guards); }, [guards]);

  // Auto-flyTo when center prop changes
  useEffect(() => {
    if (center && center.length === 2) {
      setViewState(prev => ({
        ...prev,
        latitude: center[0],
        longitude: center[1],
        zoom: 17, // Zoom in for precision when a specific point is set
        transitionDuration: 2000
      }));
    }
  }, [center?.[0], center?.[1]]); // Depend on values, not array reference

  // Real-time location subscription (identical logic to previous version)
  useEffect(() => {
    const channel = supabase
      .channel('mapview_live_locations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tracking_logs' }, (payload) => {
        const loc = payload.new as any;
        setLiveGuards(prev => {
          const exists = prev.find(g => g.id === loc.resource_id);
          if (exists) {
            return prev.map(g => g.id === loc.resource_id ? { ...g, latitude: Number(loc.latitude), longitude: Number(loc.longitude), accuracy: Number(loc.accuracy), lastUpdate: loc.recorded_at } : g);
          }
          return [...prev, { id: loc.resource_id, name: 'Personal ' + (loc.resource_id || '').substring(0, 6), latitude: Number(loc.latitude), longitude: Number(loc.longitude), accuracy: Number(loc.accuracy), status: 'active', lastUpdate: loc.recorded_at } as any];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'resources' }, (payload) => {
        const updated = payload.new as any;
        if (updated.latitude && updated.longitude && updated.status !== 'baja') {
          setLiveGuards(prev => {
            const exists = prev.find(g => g.id === updated.id);
            if (exists) {
              return prev.map(g => g.id === updated.id ? { 
                ...g, 
                latitude: Number(updated.latitude), 
                longitude: Number(updated.longitude), 
                name: updated.name || g.name,
                accuracy: updated.accuracy,
                speed: updated.speed,
                heading: updated.heading,
                lastUpdate: updated.last_gps_update || g.lastUpdate
              } : g);
            }
            return [...prev, { 
              id: updated.id, 
              name: updated.name || 'Personal', 
              latitude: Number(updated.latitude), 
              longitude: Number(updated.longitude), 
              accuracy: updated.accuracy,
              speed: updated.speed,
              heading: updated.heading,
              status: updated.status || 'active', 
              role: updated.role 
            }];
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

  const heatmapData = useMemo(() => ({
    type: 'FeatureCollection',
    features: incidents
      .filter(inc => inc.latitude && inc.longitude)
      .map(inc => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [inc.longitude, inc.latitude]
        },
        properties: {
          intensity: 1 // could be based on incident type
        }
      }))
  }), [incidents]);
          
  const guardAccuracyData = useMemo(() => ({
    type: 'FeatureCollection',
    features: liveGuards
      .filter(g => g.latitude && g.longitude && g.accuracy)
      .map(g => createCirclePolygon([g.latitude, g.longitude], g.accuracy || 10))
  }), [liveGuards]);

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
        terrain={is3D ? { source: 'mapbox-dem', exaggeration: 1.5 } : undefined}
        projection={is3D ? { name: 'globe' } : { name: 'mercator' }}
        fog={is3D ? {
          'range': [0.5, 10],
          'color': '#ffffff',
          'horizon-blend': 0.1
        } : undefined}
      >
        <NavigationControl position="bottom-left" />
        <GeolocateControl position="bottom-left" />

        {/* MAPBOX ATMOSPHERE & TERRAIN */}
        <Source
          id="mapbox-dem"
          type="raster-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
        />
        {is3D && (
          <>
            <Layer
              id="sky"
              type="sky"
              paint={{
                'sky-type': 'atmosphere',
                'sky-atmosphere-sun': [0.0, 0.0],
                'sky-atmosphere-sun-intensity': 15
              }}
            />
            {/* Fog for depth perception */}
            <Layer
              id="fog"
              type="background"
              paint={{
                'background-color': '#adb9ca',
                'background-opacity': 0.1
              }}
            />
          </>
        )}

        {/* 3D BUILDINGS LAYER */}
        {is3D && (
          <Layer
            id="3d-buildings"
            source="composite"
            source-layer="building"
            filter={['==', 'extrude', 'true']}
            type="fill-extrusion"
            minzoom={15}
            paint={{
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15, 0,
                15.05, ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15, 0,
                15.05, ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 0.6
            }}
          />
        )}

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

        {/* Heatmap Layer */}
        {showHeatmap && heatmapData.features.length > 0 && (
          <Source id="incidents-heatmap" type="geojson" data={heatmapData as any}>
            <Layer
              id="heatmap-layer"
              type="heatmap"
              maxzoom={15}
              paint={{
                'heatmap-weight': {
                  property: 'intensity',
                  type: 'exponential',
                  stops: [[1, 0], [62, 1]]
                },
                'heatmap-intensity': {
                  stops: [[11, 1], [15, 3]]
                },
                'heatmap-color': [
                  'interpolate',
                  ['linear'],
                  ['heatmap-density'],
                  0, 'rgba(33,102,172,0)',
                  0.2, 'rgb(103,169,207)',
                  0.4, 'rgb(209,229,240)',
                  0.6, 'rgb(253,219,199)',
                  0.8, 'rgb(239,138,98)',
                  1, 'rgb(178,24,43)'
                ],
                'heatmap-radius': {
                  stops: [[11, 15], [15, 20]]
                },
                'heatmap-opacity': 0.6
              }}
            />
          </Source>
        )}

        {/* Guard Accuracy Circles */}
        <Source id="guard-accuracy" type="geojson" data={guardAccuracyData as any}>
          <Layer
            id="guard-accuracy-fill"
            type="fill"
            paint={{ 'fill-color': '#22c55e', 'fill-opacity': 0.1 }}
          />
          <Layer
            id="guard-accuracy-outline"
            type="line"
            paint={{ 'line-color': '#22c55e', 'line-width': 1, 'line-opacity': 0.3 }}
          />
        </Source>

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
              <div 
                className="relative flex items-center justify-center transition-all duration-[2500ms] ease-linear"
                style={{ transform: `rotate(${guard.heading || 0}deg)` }}
              >
                <div className="absolute w-8 h-8 bg-green-500/20 rounded-full animate-ping" />
                <div className="w-6 h-6 bg-green-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center">
                  {guard.heading !== undefined ? (
                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-white -mb-1" />
                  ) : (
                    <User className="w-3 h-3 text-white" />
                  )}
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
              <div className={cn(
                "p-1.5 rounded-lg shadow-xl cursor-pointer border-2 border-white transition-transform hover:scale-110",
                inc.content?.toLowerCase().includes('crítica') ? "bg-red-600 scale-125" : "bg-black"
              )}>
                {(() => {
                  const content = inc.content?.toLowerCase() || '';
                  if (content.includes('vehículo')) return <Car size={16} className="text-white" />;
                  if (content.includes('persona')) return <UserX size={16} className="text-white" />;
                  if (content.includes('puerta')) return <DoorOpen size={16} className="text-white" />;
                  if (content.includes('paquete') || content.includes('objeto')) return <Package size={16} className="text-white" />;
                  if (content.includes('eléctrica') || content.includes('falla')) return <Lightbulb size={16} className="text-white" />;
                  if (content.includes('crítica') || content.includes('alerta')) return <Zap size={16} className="text-amber-300 animate-pulse" />;
                  return <AlertTriangle size={16} className="text-white" />;
                })()}
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
            className="z-50"
          >
            <div className="p-3 min-w-[180px]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-900">{selectedGuard.name}</p>
                  <p className="text-[9px] font-bold text-green-500 uppercase">{selectedGuard.role || 'Operador'}</p>
                </div>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Estado</span>
                  <span className="text-[9px] font-black text-green-600 uppercase">En Línea</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Último Update</span>
                  <span className="text-[9px] font-black text-gray-600 uppercase">
                    {selectedGuard.lastUpdate ? new Date(selectedGuard.lastUpdate).toLocaleTimeString() : 'Hace instantes'}
                  </span>
                </div>
                <div className="pt-2">
                  <p className="text-[8px] text-gray-400 font-medium italic">
                    {Number(selectedGuard.latitude).toFixed(5)}, {Number(selectedGuard.longitude).toFixed(5)}
                  </p>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Style Switcher & 3D Toggle */}
      <div className={cn(
        "absolute z-10 flex flex-col items-end gap-2 transition-all duration-300",
        isMobile ? "top-20 right-4" : "top-6 right-6"
      )}>
        {/* Toggle Button */}
        <button
          onClick={() => setShowStyles(!showStyles)}
          className="w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center text-gray-700 hover:text-primary transition-colors border border-gray-100"
        >
          <Layers size={20} />
        </button>

        <AnimatePresence>
          {showStyles && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="flex flex-col gap-2 bg-black/80 backdrop-blur-md p-1.5 rounded-xl shadow-2xl border border-white/10"
            >
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
                  onClick={() => {
                    setActiveStyle(style);
                    if (isMobile) setShowStyles(false);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all text-left",
                    activeStyle === style ? "bg-primary text-black" : "text-white/40 hover:text-white",
                    isMobile && "px-2 py-1 text-[9px]"
                  )}
                >
                  {isMobile ? style.substring(0, 3) : style}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Map, { Marker, Source, Layer, NavigationControl, GeolocateControl, MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { User, MapPin, Layers, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnimatedPosition } from '@/hooks/useAnimatedPosition';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

const MAP_STYLES = {
  tactical: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  street: 'mapbox://styles/mapbox/streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12'
};

const FLYTO_THRESHOLD = 50;
const EASETO_THRESHOLD = 3;
const RECENTER_COOLDOWN = 1000;

interface Destination {
  id: string;
  name: string;
  position: [number, number];
  radius?: number;
}

interface MobileLeafletProps {
  currentPosition?: [number, number];
  currentAccuracy?: number | null;
  destinations?: Destination[];
  avatarUrl?: string | null;
  showFloatingOverlay?: boolean;
  routePoints?: [number, number][];
  patrolPath?: [number, number][];
}

export default function MobileLeaflet({
  currentPosition,
  currentAccuracy,
  destinations = [],
  avatarUrl,
  showFloatingOverlay = true,
  routePoints = [],
  patrolPath = []
}: MobileLeafletProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeStyle, setActiveStyle] = useState<keyof typeof MAP_STYLES>('street');
  const [showStyles, setShowStyles] = useState(false);

  const lastRecenterTime = useRef(0);
  const userInteracting = useRef(false);
  const interactionTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const safeInitialLat = useMemo(() => {
    const raw = currentPosition?.[0];
    return (raw && !isNaN(Number(raw)) && Number(raw) !== 0) ? Number(raw) : -31.6350;
  }, []);

  const safeInitialLng = useMemo(() => {
    const raw = currentPosition?.[1];
    return (raw && !isNaN(Number(raw)) && Number(raw) !== 0) ? Number(raw) : -60.7000;
  }, []);

  const [viewState, setViewState] = useState({
    latitude: safeInitialLat,
    longitude: safeInitialLng,
    zoom: 16.5,
    pitch: 60,
    bearing: 0
  });

  // ─── ANIMATED POSITION (Uber-style interpolation) ───
  const {
    lat: animLat,
    lng: animLng,
    bearing: animBearing,
    trail,
    haversineDistance,
  } = useAnimatedPosition(currentPosition?.[0], currentPosition?.[1], 1500);

  // ─── SMOOTH CAMERA: flyTo / easeTo ───
  const smoothRecenter = useCallback(
    (lat: number, lng: number) => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;
      if (userInteracting.current) return;

      const now = Date.now();
      if (now - lastRecenterTime.current < RECENTER_COOLDOWN) return;

      const center = map.getCenter();
      const dist = haversineDistance(center.lat, center.lng, lat, lng);

      if (dist < EASETO_THRESHOLD) return; // Ignore jitter

      lastRecenterTime.current = now;

      if (dist > FLYTO_THRESHOLD) {
        // Big jump — dramatic flyTo
        map.flyTo({
          center: [lng, lat],
          duration: 1800,
          essential: true,
          curve: 1.4,
          easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out cubic
        });
      } else {
        // Micro-adjustment — gentle easeTo
        map.easeTo({
          center: [lng, lat],
          duration: 1200,
          easing: (t) => t * (2 - t), // ease-out quad
        });
      }
    },
    [mapLoaded, haversineDistance]
  );

  // Re-center camera when animated position updates
  useEffect(() => {
    if (animLat && animLng && animLat !== 0) {
      smoothRecenter(animLat, animLng);
    }
  }, [animLat, animLng, smoothRecenter]);

  // Track user interaction to pause auto-centering
  const handleInteractionStart = useCallback(() => {
    userInteracting.current = true;
    if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
  }, []);

  const handleInteractionEnd = useCallback(() => {
    // Resume auto-centering after 5s of no interaction
    interactionTimeout.current = setTimeout(() => {
      userInteracting.current = false;
    }, 5000);
  }, []);

  // ─── TRAIL GEOJSON ───
  const trailData = useMemo(() => {
    if (trail.length < 2) return null;
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: trail.map((p) => [p[1], p[0]]) // [lng, lat]
      }
    };
  }, [trail]);

  // ─── ROUTE GEOJSON ───
  const routeData = useMemo(() => {
    if (routePoints.length === 0) return null;
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: routePoints.map(p => [p[1], p[0]])
      }
    };
  }, [routePoints]);

  // ─── PATROL PATH GEOJSON (Actual Walked Route) ───
  const patrolPathData = useMemo(() => {
    if (patrolPath.length < 2) return null;
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: patrolPath.map(p => [p[1], p[0]])
      }
    };
  }, [patrolPath]);

  if (!MAPBOX_TOKEN) return null;

  return (
    <div className="w-full h-full relative z-0">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onDragStart={handleInteractionStart}
        onDragEnd={handleInteractionEnd}
        onZoomStart={handleInteractionStart}
        onZoomEnd={handleInteractionEnd}
        mapStyle={MAP_STYLES[activeStyle]}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        ref={mapRef}
        onLoad={() => setMapLoaded(true)}
        terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }}
        fog={{
          'range': [1.0, 12],
          'color': '#aabacb',
          'horizon-blend': 0.1,
          'star-intensity': 0.2
        }}
      >
        {/* TERRAIN */}
        <Source
          id="mapbox-dem"
          type="raster-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
        />
        <Layer
          id="sky"
          type="sky"
          paint={{
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 0.0],
            'sky-atmosphere-sun-intensity': 15
          }}
        />

        {/* 3D BUILDINGS */}
        {activeStyle !== 'satellite' && (
          <Layer
            id="3d-buildings"
            source="composite"
            source-layer="building"
            filter={['==', 'extrude', 'true']}
            type="fill-extrusion"
            minzoom={15}
            paint={{
              'fill-extrusion-color': '#e0e4e8',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.8
            }}
          />
        )}

        <GeolocateControl 
          position="top-right" 
          positionOptions={{ enableHighAccuracy: true }}
          trackUserLocation={true}
          showUserHeading={true}
        />
        <NavigationControl position="top-right" showCompass={true} />

        {/* ─── TRAIL: Ephemeral path behind operator ─── */}
        {trailData && (
          <Source id="operator-trail" type="geojson" data={trailData as any}>
            {/* Glow layer */}
            <Layer
              id="trail-glow"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': '#3b82f6',
                'line-width': 10,
                'line-opacity': 0.12,
                'line-blur': 6
              }}
            />
            {/* Main trail */}
            <Layer
              id="trail-main"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': '#3b82f6',
                'line-width': 3,
                'line-opacity': 0.5
              }}
            />
            {/* Dotted overlay */}
            <Layer
              id="trail-dots"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': '#ffffff',
                'line-width': 1.5,
                'line-dasharray': [0, 3],
                'line-opacity': 0.3
              }}
            />
          </Source>
        )}

        {/* ─── ROUTE (Patrol/Navigation path) ─── */}
        {routeData && (
          <Source id="route" type="geojson" data={routeData as any}>
            <Layer
              id="route-layer-glow"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': '#3b82f6',
                'line-width': 12,
                'line-opacity': 0.3,
                'line-blur': 4
              }}
            />
            <Layer
              id="route-layer-main"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': '#2563eb',
                'line-width': 6,
                'line-opacity': 1
              }}
            />
            <Layer
              id="route-layer-dash"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': '#ffffff',
                'line-width': 2,
                'line-dasharray': [0, 4, 3],
                'line-opacity': 0.8
              }}
            />
          </Source>
        )}

        {/* ─── PATROL PATH (Actual Walked Route) ─── */}
        {patrolPathData && (
          <Source id="patrol-path" type="geojson" data={patrolPathData as any}>
            <Layer
              id="patrol-path-glow"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': '#D4AF37',
                'line-width': 10,
                'line-opacity': 0.3,
                'line-blur': 4
              }}
            />
            <Layer
              id="patrol-path-main"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': '#D4AF37',
                'line-width': 5,
                'line-opacity': 0.95
              }}
            />
          </Source>
        )}

        {/* ─── DESTINATIONS (TACTICAL GEOFENCE MARKER WITH FIXED GEOGRAPHIC ANCHOR) ─── */}
        {destinations.map(dest => {
          const lat = Number(dest.position[0]);
          const lng = Number(dest.position[1]);
          if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;

          return (
            <Marker 
              key={dest.id} 
              latitude={lat} 
              longitude={lng}
              anchor="center"
              pitchAlignment="viewport"
              rotationAlignment="viewport"
            >
              <div className="relative flex flex-col items-center pointer-events-none select-none">
                {/* Objective Label - Absolute position to avoid shifting bottom anchor point */}
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-zinc-950/90 backdrop-blur-sm px-2.5 py-1 rounded-xl shadow-lg border border-[#D4AF37]/50 whitespace-nowrap z-20">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]">{dest.name}</p>
                </div>
                {/* Fixed-Size Tactical Obsidian Card */}
                <div className="w-10 h-10 rounded-xl bg-zinc-950 border-2 border-[#D4AF37] shadow-[0_6px_20px_rgba(0,0,0,0.5)] flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-[#D4AF37]/20 rounded-xl animate-ping pointer-events-none" style={{ animationDuration: '2.5s' }} />
                  <Building2 className="w-5 h-5 text-[#D4AF37] relative z-10" />
                </div>
              </div>
            </Marker>
          );
        })}

        {/* ─── OPERATOR MARKER: Animated + Rotated with Fixed Viewport Anchor ─── */}
        {animLat !== 0 && (
          <Marker
            latitude={animLat}
            longitude={animLng}
            anchor="center"
            pitchAlignment="viewport"
            rotationAlignment="viewport"
          >
            <div
              className="relative flex items-center justify-center"
              style={{
                transform: `rotate(${animBearing}deg)`,
                transition: 'transform 0.5s ease-out',
              }}
            >
              {/* Directional indicator (heading arrow) */}
              <div className="absolute -top-3 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[8px] border-l-transparent border-r-transparent border-b-blue-500 opacity-70" />
              
              {/* Pulse ring */}
              <div className="absolute w-14 h-14 bg-blue-500/15 rounded-full animate-ping" />
              
              {/* Avatar container — counter-rotate so the face stays upright */}
              <div
                className="w-10 h-10 bg-blue-600 border-[3px] border-white rounded-full shadow-[0_4px_20px_rgba(59,130,246,0.4)] flex items-center justify-center overflow-hidden"
                style={{
                  transform: `rotate(${-animBearing}deg)`,
                  transition: 'transform 0.5s ease-out',
                }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Operator" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4.5 h-4.5 text-white" />
                )}
              </div>
            </div>
          </Marker>
        )}
      </Map>

      {/* ─── STYLE SWITCHER ─── */}
      <div className="absolute top-24 right-4 z-10 flex flex-col items-end gap-2">
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
              {(Object.keys(MAP_STYLES) as Array<keyof typeof MAP_STYLES>).map(style => (
                <button
                  key={style}
                  onClick={() => {
                    setActiveStyle(style);
                    setShowStyles(false);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all text-left",
                    activeStyle === style ? "bg-blue-500 text-white" : "text-white/40 hover:text-white"
                  )}
                >
                  {style}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── FLOATING OVERLAY ─── */}
      {showFloatingOverlay && (
        <div className="absolute bottom-10 left-0 right-0 px-6 pointer-events-none">
          <div className="bg-black/90 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between">
             <div>
                <p className="text-[10px] text-white/50 uppercase font-black tracking-widest leading-none">
                  {currentAccuracy && currentAccuracy <= 30 ? 'Certificado GPS Oficial' : 'Navegación Activa'}
                </p>
                <h4 className="text-white font-bold text-sm mt-1">
                  {currentAccuracy && currentAccuracy <= 30 
                    ? `Precisión: ±${Math.round(currentAccuracy)}m` 
                    : 'Localizando Posición...'}
                </h4>
             </div>
             <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                <div className={cn("w-2 h-2 rounded-full", currentAccuracy && currentAccuracy <= 30 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" : "bg-blue-500 animate-pulse")} />
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

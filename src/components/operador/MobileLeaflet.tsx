'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Map, { Marker, Source, Layer, NavigationControl, GeolocateControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { User, MapPin, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const MAP_STYLES = {
  STANDARD: 'mapbox://styles/mapbox/standard',
  SATELLITE: 'mapbox://styles/mapbox/satellite-streets-v12',
  DARK: 'mapbox://styles/mapbox/dark-v11',
  NAVIGATION: 'mapbox://styles/mapbox/navigation-night-v1',
  STREETS: 'mapbox://styles/mapbox/streets-v12'
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

interface MobileLeafletProps {
  currentPosition?: [number, number];
  routePoints?: [number, number][]; // [lat, lng][]
  destinations?: { id: string; name: string; position: [number, number] }[];
}

export default function MobileLeaflet({
  currentPosition = [-31.6107, -60.6973],
  routePoints = [],
  destinations = []
}: MobileLeafletProps) {
  const [activeStyle, setActiveStyle] = useState<keyof typeof MAP_STYLES>('STANDARD');
  const [showStyles, setShowStyles] = useState(false);
  const [viewState, setViewState] = useState({
    latitude: currentPosition[0],
    longitude: currentPosition[1],
    zoom: 16.5,
    pitch: 65, // High tilt for immersive 3D navigation feel
    bearing: 0
  });

  // Sync position when it changes from props
  useEffect(() => {
    setViewState(prev => ({
      ...prev,
      latitude: currentPosition[0],
      longitude: currentPosition[1],
    }));
  }, [currentPosition[0], currentPosition[1]]); // Depend on values

  // Convert routePoints [lat, lng] to Mapbox GeoJSON [lng, lat]
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

  if (!MAPBOX_TOKEN) return null;

  return (
    <div className="w-full h-[100dvh] relative z-0">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle={MAP_STYLES[activeStyle]}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }}
        fog={{
          'range': [1.0, 12],
          'color': '#aabacb',
          'horizon-blend': 0.1,
          'star-intensity': 0.2
        }}
      >
        {/* MAPBOX ATMOSPHERE & TERRAIN */}
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

        {/* 3D BUILDINGS (For fallback styles) */}
        {activeStyle !== 'STANDARD' && (
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

        {/* Route Line */}
        {routeData && (
          <Source id="route" type="geojson" data={routeData as any}>
            <Layer
              id="route-layer"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': '#3b82f6',
                'line-width': 6,
                'line-opacity': 0.8
              }}
            />
          </Source>
        )}

        {/* Destinations */}
        {destinations.map(dest => (
          <Marker 
            key={dest.id} 
            latitude={dest.position[0]} 
            longitude={dest.position[1]}
          >
            <div className="flex flex-col items-center">
              <div className="bg-white p-1 rounded-md shadow-lg border border-gray-200 mb-1">
                <p className="text-[8px] font-black uppercase px-1 whitespace-nowrap">{dest.name}</p>
              </div>
              <MapPin className="w-6 h-6 text-amber-500 fill-amber-500/20" />
            </div>
          </Marker>
        ))}

        {/* Current Position Marker (Self) */}
        <Marker 
          latitude={currentPosition[0]} 
          longitude={currentPosition[1]}
        >
          <div className="relative flex items-center justify-center">
             <div className="absolute w-12 h-12 bg-blue-500/20 rounded-full animate-ping" />
             <div className="w-8 h-8 bg-blue-600 border-4 border-white rounded-full shadow-2xl flex items-center justify-center transition-transform duration-500">
                <User className="w-4 h-4 text-white" />
             </div>
          </div>
        </Marker>
      </Map>

      {/* Collapsible Style Switcher */}
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

      {/* Floating UI Overlay for Mobile */}
      <div className="absolute bottom-10 left-0 right-0 px-6 pointer-events-none">
        <div className="bg-black/90 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between">
           <div>
              <p className="text-[10px] text-white/50 uppercase font-black tracking-widest leading-none">Navegación Activa</p>
              <h4 className="text-white font-bold text-sm mt-1">Localizando Posición...</h4>
           </div>
           <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
           </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import Map, { Source, Layer, Popup, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Calendar, Clock, MapPin, ShieldCheck, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

interface RoutePoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  created_at: string;
}

interface RoutePlaybackProps {
  points: RoutePoint[];
  roundData?: any;
  className?: string;
}

export default function RoutePlayback({ points, roundData, className }: RoutePlaybackProps) {
  const [hoverInfo, setHoverInfo] = useState<{ longitude: number; latitude: number; point: RoutePoint } | null>(null);

  const routeGeoJSON = useMemo(() => {
    if (points.length < 2) return null;
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: points.map(p => [p.longitude, p.latitude])
      }
    };
  }, [points]);

  const initialViewState = useMemo(() => {
    if (points.length === 0) return { latitude: -31.6350, longitude: -60.7000, zoom: 14 };
    return {
      latitude: points[0].latitude,
      longitude: points[0].longitude,
      zoom: 16,
      pitch: 45
    };
  }, [points]);

  if (!MAPBOX_TOKEN) return null;

  return (
    <div className={cn("relative w-full h-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl", className)}>
      <Map
        initialViewState={initialViewState}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        interactiveLayerIds={['route-line-hitbox']}
        onClick={e => {
            if (e.features && e.features.length > 0) {
                const coord = e.lngLat;
                // Find closest point in trace
                let closest = points[0];
                let minDist = Infinity;
                points.forEach(p => {
                    const d = Math.pow(p.latitude - coord.lat, 2) + Math.pow(p.longitude - coord.lng, 2);
                    if (d < minDist) {
                        minDist = d;
                        closest = p;
                    }
                });
                setHoverInfo({ longitude: coord.lng, latitude: coord.lat, point: closest });
            } else {
                setHoverInfo(null);
            }
        }}
      >
        <NavigationControl position="top-right" />

        {routeGeoJSON && (
          <Source id="route-source" type="geojson" data={routeGeoJSON as any}>
            {/* Outer Glow */}
            <Layer
              id="route-line-glow"
              type="line"
              paint={{
                'line-color': '#FFD700',
                'line-width': 8,
                'line-opacity': 0.2,
                'line-blur': 4
              }}
            />
            {/* Main Line */}
            <Layer
              id="route-line-main"
              type="line"
              paint={{
                'line-color': '#FFD700',
                'line-width': 3,
                'line-opacity': 0.8
              }}
            />
            {/* Hitbox for clicks */}
            <Layer
              id="route-line-hitbox"
              type="line"
              paint={{
                'line-color': 'transparent',
                'line-width': 20
              }}
            />
          </Source>
        )}

        {/* Start/End Markers */}
        {points.length > 0 && (
          <>
            <Source id="endpoints" type="geojson" data={{
              type: 'FeatureCollection',
              features: [
                { type: 'Feature', geometry: { type: 'Point', coordinates: [points[0].longitude, points[0].latitude] }, properties: { label: 'INICIO' } },
                { type: 'Feature', geometry: { type: 'Point', coordinates: [points[points.length-1].longitude, points[points.length-1].latitude] }, properties: { label: 'FIN' } }
              ]
            }}>
              <Layer
                id="endpoint-dots"
                type="circle"
                paint={{
                  'circle-radius': 6,
                  'circle-color': ['match', ['get', 'label'], 'INICIO', '#22c55e', '#ef4444'],
                  'circle-stroke-width': 2,
                  'circle-stroke-color': '#fff'
                }}
              />
            </Source>
          </>
        )}

        {hoverInfo && (
          <Popup
            longitude={hoverInfo.longitude}
            latitude={hoverInfo.latitude}
            anchor="bottom"
            onClose={() => setHoverInfo(null)}
            closeButton={false}
            maxWidth="300px"
            className="audit-popup"
          >
            <div className="p-3 bg-zinc-900 text-white rounded-xl shadow-2xl border border-white/10 space-y-2">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-1">
                 <ShieldCheck size={14} className="text-primary" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-primary">Auditoría Forense</span>
              </div>
              <div className="space-y-1.5">
                 <div className="flex items-center justify-between gap-4">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Timestamp</span>
                    <span className="text-[10px] font-mono font-black">{new Date(hoverInfo.point.created_at).toLocaleTimeString()}</span>
                 </div>
                 <div className="flex items-center justify-between gap-4">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Precisión</span>
                    <span className={cn(
                        "text-[10px] font-mono font-black",
                        hoverInfo.point.accuracy < 15 ? "text-green-500" : "text-amber-500"
                    )}>{hoverInfo.point.accuracy.toFixed(1)}m</span>
                 </div>
                 <div className="flex items-center justify-between gap-4 pt-1 border-t border-white/5">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Coordenadas</span>
                    <span className="text-[8px] font-mono text-zinc-400">
                        {hoverInfo.point.latitude.toFixed(5)}, {hoverInfo.point.longitude.toFixed(5)}
                    </span>
                 </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Floating Info Card */}
      {roundData && (
        <div className="absolute top-6 left-6 z-10 pointer-events-none">
           <div className="liquid-glass p-5 rounded-[2rem] border border-white/10 shadow-2xl space-y-3">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <User size={20} />
                 </div>
                 <div>
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Patrullero</p>
                    <p className="text-sm font-black text-white uppercase">{roundData.resource_name || 'Personal 704'}</p>
                 </div>
              </div>
              <div className="flex items-center gap-8 pt-2 border-t border-white/5">
                 <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-zinc-500" />
                    <span className="text-[10px] font-bold text-zinc-400">{new Date(roundData.round_start).toLocaleDateString()}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <Clock size={14} className="text-zinc-500" />
                    <span className="text-[10px] font-bold text-zinc-400">
                        {new Date(roundData.round_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

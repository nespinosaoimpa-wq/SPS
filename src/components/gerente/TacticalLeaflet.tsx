'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Map, { Marker, Popup, Source, Layer, NavigationControl, GeolocateControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';
import { Shield, User, Target } from 'lucide-react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

interface Objective {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
}

interface Resource {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
}

interface TacticalLeafletProps {
  objectives?: Objective[];
  resources?: Resource[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  onPointSelect?: (point: Objective) => void;
  onMapClick?: (coords: { lat: number, lng: number }) => void;
  isPickerMode?: boolean;
  draftCoords?: { lat: number, lng: number } | null;
}

const createCirclePolygon = (center: [number, number], radiusInMeters: number, points = 64) => {
  const coords = { latitude: center[0], longitude: center[1] };
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
  ret.push(ret[0]);
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ret] } };
};

export default function TacticalLeaflet({
  objectives = [],
  resources = [],
  center = [-31.6107, -60.6973],
  zoom = 14,
  className = "",
  onPointSelect,
  onMapClick,
  isPickerMode = false,
  draftCoords = null
}: TacticalLeafletProps) {
  const [viewState, setViewState] = useState({
    latitude: center[0],
    longitude: center[1],
    zoom: zoom
  });
  const [selectedPoint, setSelectedPoint] = useState<Objective | null>(null);

  const geofenceData = useMemo(() => ({
    type: 'FeatureCollection',
    features: objectives.map(obj => createCirclePolygon([obj.latitude, obj.longitude], 150))
  }), [objectives]);

  if (!MAPBOX_TOKEN) return null;

  return (
    <div className={cn("relative w-full h-full z-0 bg-zinc-100 overflow-hidden", isPickerMode ? "cursor-crosshair" : "", className)}>
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/navigation-night-v1"
        mapboxAccessToken={MAPBOX_TOKEN}
        onClick={(e) => isPickerMode && onMapClick && onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="bottom-right" />
        <GeolocateControl position="bottom-right" />

        <Source id="geofences" type="geojson" data={geofenceData as any}>
          <Layer
            id="geofence-fill"
            type="fill"
            paint={{ 'fill-color': '#3b82f6', 'fill-opacity': 0.05 }}
          />
          <Layer
            id="geofence-outline"
            type="line"
            paint={{ 'line-color': '#3b82f6', 'line-width': 1, 'line-opacity': 0.2 }}
          />
        </Source>

        {objectives.map((obj) => (
          <Marker
            key={`obj-${obj.id}`}
            latitude={Number(obj.latitude)}
            longitude={Number(obj.longitude)}
            onClick={e => {
              e.originalEvent.stopPropagation();
              setSelectedPoint(obj);
              if (onPointSelect) onPointSelect(obj);
            }}
          >
            <div className="relative group cursor-pointer">
              <div className="absolute w-8 h-8 -top-4 -left-4 bg-amber-500/20 rounded-full animate-ping group-hover:bg-amber-500/40" />
              <div className={cn(
                "w-5 h-5 rounded-full border-2 border-white shadow-xl flex items-center justify-center transition-all group-hover:scale-125",
                obj.status === 'Activo' ? "bg-amber-500" : "bg-red-500"
              )}>
                <Shield className="w-2.5 h-2.5 text-white" />
              </div>
            </div>
          </Marker>
        ))}

        {resources.map((res) => {
          if (!res.latitude || !res.longitude) return null;
          return (
            <Marker
              key={`res-${res.id}`}
              latitude={Number(res.latitude)}
              longitude={Number(res.longitude)}
            >
              <div className="relative flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center shadow-lg overflow-hidden transition-transform hover:scale-110">
                   <User className="w-4 h-4 text-blue-600" />
                </div>
                <div className="w-0.5 h-1.5 bg-blue-500 shadow-sm"></div>
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
              </div>
            </Marker>
          );
        })}

        {draftCoords && (
          <Marker latitude={draftCoords.lat} longitude={draftCoords.lng}>
            <div className="relative flex items-center justify-center">
              <div className="absolute w-12 h-12 rounded-full border-2 border-dashed border-primary animate-spin" />
              <Target className="w-6 h-6 text-primary" />
            </div>
          </Marker>
        )}

        {selectedPoint && (
          <Popup
            latitude={Number(selectedPoint.latitude)}
            longitude={Number(selectedPoint.longitude)}
            onClose={() => setSelectedPoint(null)}
            closeButton={false}
            offset={20}
          >
            <div className="p-3 bg-white min-w-[200px] rounded-lg shadow-xl">
              <h3 className="text-xs font-black text-zinc-900 uppercase tracking-tight">{selectedPoint.name}</h3>
              <p className="text-[9px] text-zinc-500 mt-1 uppercase font-bold tracking-tighter">Punto de vigilancia</p>
              <div className="mt-3 flex gap-2">
                <div className={cn("w-2 h-2 rounded-full", selectedPoint.status === 'Activo' ? "bg-green-500" : "bg-red-500")} />
                <span className="text-[10px] font-bold text-zinc-600 uppercase">{selectedPoint.status}</span>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      <div className="absolute top-6 left-6 z-[10] pointer-events-none">
        <div className="bg-black/80 backdrop-blur-md px-4 py-2 border border-white/10 rounded-lg shadow-2xl">
           <p className="text-[10px] font-black text-white uppercase tracking-widest">704 Intelligence Unit</p>
           <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[8px] text-white/60 uppercase font-bold tracking-tighter italic">Sincronización Tactical Activa</span>
           </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Map, { Marker, Popup, Source, Layer, NavigationControl, GeolocateControl, MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';
import { Shield, User, Target, Search, X, MapPin, Loader2 } from 'lucide-react';
import { searchAddresses, GeocodingResult } from '@/lib/geocoding';


const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

const MAP_STYLES = {
  SATELLITE: 'mapbox://styles/mapbox/satellite-streets-v12',
  DARK: 'mapbox://styles/mapbox/dark-v11',
  NAVIGATION: 'mapbox://styles/mapbox/navigation-night-v1',
  STREETS: 'mapbox://styles/mapbox/streets-v12'
};

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
  const latitude = Number(center[0]);
  const longitude = Number(center[1]);
  if (isNaN(latitude) || isNaN(longitude)) return null;

  const km = radiusInMeters / 1000;
  const ret = [];
  const distanceX = km / (111.32 * Math.cos(latitude * Math.PI / 180));
  const distanceY = km / 110.574;
  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    ret.push([longitude + x, latitude + y]);
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
  const mapRef = React.useRef<MapRef>(null);
  const [activeStyle, setActiveStyle] = useState<keyof typeof MAP_STYLES>('NAVIGATION');
  const [viewState, setViewState] = useState({
    latitude: center[0],
    longitude: center[1],
    zoom: zoom
  });
  const [selectedPoint, setSelectedPoint] = useState<Objective | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.length < 3) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const results = await searchAddresses(searchQuery);
        setSearchResults(results);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(performSearch, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectResult = (res: GeocodingResult) => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchFocused(false);
    
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [res.lng, res.lat],
        zoom: 16,
        duration: 2000
      });
    }

    if (isPickerMode && onMapClick) {
      onMapClick({ lat: res.lat, lng: res.lng });
    }
  };

  const geofenceData = useMemo(() => ({
    type: 'FeatureCollection',
    features: objectives
      .map(obj => createCirclePolygon([obj.latitude, obj.longitude], 150))
      .filter(f => f !== null)
  }), [objectives]);

  if (!MAPBOX_TOKEN) return null;

  return (
    <div className={cn("relative w-full h-full z-0 bg-zinc-100 overflow-hidden", isPickerMode ? "cursor-crosshair" : "", className)}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle={MAP_STYLES[activeStyle]}
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

      <div className="absolute top-6 right-6 z-10 flex flex-col gap-2 bg-black/80 backdrop-blur-md p-1.5 rounded-xl shadow-2xl border border-white/10">
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

      <div className="absolute top-6 left-6 z-[10] pointer-events-none">
        <div className="bg-black/80 backdrop-blur-md px-4 py-2 border border-white/10 rounded-lg shadow-2xl">
           <p className="text-[10px] font-black text-white uppercase tracking-widest">704 Intelligence Unit</p>
           <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[8px] text-white/60 uppercase font-bold tracking-tighter italic">Sincronización Tactical Activa</span>
           </div>
        </div>
      </div>

      {/* Improved Search Bar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-sm px-4">
        <div className={cn(
          "bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden",
          searchFocused ? "ring-2 ring-primary/40 ring-offset-0 border-primary/30" : ""
        )}>
          <div className="flex items-center gap-3 px-4 py-3">
             {isSearching ? <Loader2 size={16} className="text-primary animate-spin" /> : <Search size={16} className="text-white/40" />}
             <input 
               placeholder="Buscar dirección o punto..."
               className="bg-transparent border-none text-xs font-bold text-white placeholder:text-white/20 focus:ring-0 w-full uppercase tracking-tighter"
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               onFocus={() => setSearchFocused(true)}
             />
             {searchQuery && (
               <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-white/10 rounded-full">
                 <X size={14} className="text-white/40" />
               </button>
             )}
          </div>
          
          {searchQuery.length >= 3 && (
            <div className="border-t border-white/5 max-h-[300px] overflow-y-auto">
               {searchResults.length > 0 ? (
                 searchResults.map((res, i) => (
                   <button
                     key={i}
                     onClick={() => handleSelectResult(res)}
                     className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-start gap-3 border-b border-white/5 last:border-none transition-colors"
                   >
                     <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        <MapPin size={14} className="text-primary" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-white uppercase tracking-tight">{res.displayName}</p>
                        <p className="text-[8px] text-white/40 uppercase font-bold mt-0.5">{res.city}, {res.state}</p>
                     </div>
                   </button>
                 ))
               ) : !isSearching && (
                 <div className="px-4 py-6 text-center">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Sin resultados</p>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

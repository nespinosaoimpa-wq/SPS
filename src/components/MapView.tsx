'use client';

import React, { useEffect, useState } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  ZoomControl, 
  Circle, 
  useMapEvents 
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { cn } from '@/lib/utils';

let L: any;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}

interface Objective {
  id: string;
  name: string;
  address?: string;
  client_name?: string;
  latitude: number;
  longitude: number;
  status: string;
}

interface Guard {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  role?: string;
}

interface MapViewProps {
  objectives?: Objective[];
  guards?: Guard[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  onObjectiveSelect?: (objective: Objective) => void;
  onMapClick?: (coords: { lat: number, lng: number }) => void;
  isPickerMode?: boolean;
  draftCoords?: { lat: number, lng: number } | null;
  selectedObjectiveId?: string | null;
}

export default function MapView({
  objectives = [],
  guards = [],
  center = [-31.6107, -60.6973],
  zoom = 14,
  className = "",
  onObjectiveSelect,
  onMapClick,
  isPickerMode = false,
  draftCoords = null,
  selectedObjectiveId = null
}: MapViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Clean objective pin (like Google Maps)
  const createObjectiveIcon = (status: string, isSelected: boolean) => {
    if (!L) return null;
    const bgColor = isSelected ? '#111111' : (status === 'Activo' ? '#F59E0B' : '#9CA3AF');
    const size = isSelected ? 40 : 34;
    return L.divIcon({
      className: 'custom-objective-icon',
      html: `
        <div style="display:flex; flex-direction:column; align-items:center;">
          <div style="
            width: ${size}px; 
            height: ${size}px; 
            background: ${bgColor}; 
            border-radius: 50% 50% 50% 0; 
            transform: rotate(-45deg); 
            display:flex; 
            align-items:center; 
            justify-content:center;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          ">
            <svg style="transform:rotate(45deg);" width="${size * 0.4}" height="${size * 0.4}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [size, size + 8],
      iconAnchor: [size / 2, size + 8]
    });
  };

  // Guard avatar (like Uber drivers)
  const createGuardIcon = () => {
    if (!L) return null;
    return L.divIcon({
      className: 'custom-guard-icon',
      html: `
        <div style="display:flex; flex-direction:column; align-items:center;">
          <div style="
            width: 36px; 
            height: 36px; 
            background: #111; 
            border-radius: 50%; 
            display:flex; 
            align-items:center; 
            justify-content:center;
            border: 3px solid #F59E0B;
            box-shadow: 0 2px 10px rgba(0,0,0,0.25);
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div style="
            margin-top: 2px;
            background: #111;
            color: white;
            font-size: 9px;
            font-weight: 700;
            padding: 1px 6px;
            border-radius: 4px;
            white-space: nowrap;
            font-family: system-ui;
          ">En servicio</div>
        </div>
      `,
      iconSize: [60, 56],
      iconAnchor: [30, 24]
    });
  };

  // Draft pin for new objective placement
  const createDraftIcon = () => {
    if (!L) return null;
    return L.divIcon({
      className: 'custom-draft-icon',
      html: `
        <div style="display:flex; flex-direction:column; align-items:center;">
          <div style="
            width: 40px; 
            height: 40px; 
            background: #3B82F6; 
            border-radius: 50% 50% 50% 0; 
            transform: rotate(-45deg); 
            display:flex; 
            align-items:center; 
            justify-content:center;
            border: 3px solid white;
            box-shadow: 0 2px 12px rgba(59, 130, 246, 0.4);
            animation: bounce-pin 1s ease-in-out infinite;
          ">
            <svg style="transform:rotate(45deg);" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
        </div>
        <style>
          @keyframes bounce-pin { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        </style>
      `,
      iconSize: [40, 48],
      iconAnchor: [20, 48]
    });
  };

  if (!mounted) {
    return (
      <div className={cn("w-full h-full bg-gray-100 flex flex-col items-center justify-center", className)}>
        <div className="w-8 h-8 rounded-full border-3 border-gray-300 border-t-primary animate-spin" />
        <p className="mt-3 text-xs text-gray-400 font-medium">Cargando mapa...</p>
      </div>
    );
  }

  // CartoDB Voyager — clean, light, modern 
  const tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  return (
    <div className={cn(
      "relative w-full h-full z-0 bg-gray-100 overflow-hidden", 
      isPickerMode ? "cursor-crosshair" : "",
      className
    )}>
      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <MapClickHandler onMapClick={onMapClick} isPickerMode={isPickerMode} />
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url={tileUrl}
        />

        {/* Draft pin for new objective */}
        {draftCoords && (
           <Marker position={[draftCoords.lat, draftCoords.lng]} icon={createDraftIcon()} />
        )}

        {/* Objective Markers */}
        {objectives.map((obj) => (
          <React.Fragment key={`obj-${obj.id}`}>
            {/* Subtle coverage circle */}
            <Circle 
              center={[obj.latitude, obj.longitude]} 
              radius={120}
              pathOptions={{
                color: selectedObjectiveId === obj.id ? '#F59E0B' : 'rgba(245, 158, 11, 0.3)',
                fillColor: selectedObjectiveId === obj.id ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.04)',
                weight: selectedObjectiveId === obj.id ? 2 : 1,
              }}
            />
            <Marker 
              position={[obj.latitude, obj.longitude]} 
              icon={createObjectiveIcon(obj.status, selectedObjectiveId === obj.id)}
              eventHandlers={{
                click: () => {
                  if (!isPickerMode && onObjectiveSelect) {
                    onObjectiveSelect(obj);
                  }
                },
              }}
            >
              <Popup className="clean-popup">
                <div className="p-3 min-w-[200px]">
                  <h3 className="text-sm font-bold text-gray-900">{obj.name}</h3>
                  {obj.address && <p className="text-xs text-gray-500 mt-1">{obj.address}</p>}
                  {obj.client_name && (
                    <p className="text-xs text-gray-400 mt-1">Cliente: {obj.client_name}</p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      obj.status === 'Activo' ? "bg-green-500" : "bg-gray-400"
                    )} />
                    <span className="text-xs font-medium text-gray-600">{obj.status}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}

        {/* Guard Markers (live) */}
        {guards.map((guard) => {
          if (!guard.latitude || !guard.longitude) return null;
          return (
            <Marker key={`guard-${guard.id}`} position={[guard.latitude, guard.longitude]} icon={createGuardIcon()}>
              <Popup>
                <div className="p-3 min-w-[160px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-[10px] text-green-600 font-semibold">En servicio</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{guard.name}</p>
                  {guard.role && <p className="text-xs text-gray-500 mt-1">{guard.role}</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}

        <ZoomControl position="bottomright" />
      </MapContainer>
    </div>
  );
}

function MapClickHandler({ onMapClick, isPickerMode }: { onMapClick?: (coords: { lat: number, lng: number }) => void, isPickerMode: boolean }) {
  const map = useMapEvents({
    click(e) {
      if (isPickerMode && onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 300);
  }, [map]);

  return null;
}

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
import { supabase } from '@/lib/supabase';

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
  isPickerMode?: boolean;
  draftCoords?: { lat: number, lng: number } | null;
  selectedObjectiveId?: string | null;
}

export default function MapView({
  objectives = [],
  guards = [],
  incidents = [],
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
  const [liveGuards, setLiveGuards] = useState<Guard[]>(guards);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync initial guards prop
  useEffect(() => {
    setLiveGuards(guards);
  }, [guards]);

  // Real-time tracking subscription
  useEffect(() => {
    if (!mounted) return;

    const channel = supabase
      .channel('mapview_locations')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'resource_locations' 
      }, (payload) => {
        const newLoc = payload.new as any;
        setLiveGuards(prev => {
          const exists = prev.find(g => g.id === newLoc.resource_id);
          if (exists) {
            return prev.map(g => g.id === newLoc.resource_id ? { ...g, latitude: newLoc.latitude, longitude: newLoc.longitude } : g);
          } else {
            return [...prev, { id: newLoc.resource_id, name: 'Personal ID ' + newLoc.resource_id.substring(0,4), latitude: newLoc.latitude, longitude: newLoc.longitude, status: 'Activo' }];
          }
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mounted]);

  // Premium 2D Drop Icon (Google Maps / Service Style)
  const createDropIcon = (color: string, iconKey: 'building' | 'alert' | 'note', isSelected: boolean, animate = false) => {
    if (!L) return null;
    const size = isSelected ? 44 : 38;
    const iconColor = '#fff';
    
    // Lucide-like SVG paths
    const icons = {
      building: '<path d="M3 21h18M3 7v14M21 7v14M9 21V11M15 21V11M5 7l7-4 7 4M10 9v2M14 9v2"/>',
      alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3ZM12 9v4M12 17h.01"/>',
      note: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>'
    };

    return L.divIcon({
      className: 'custom-drop-icon',
      html: `
        <div style="display:flex; flex-direction:column; align-items:center; position:relative;">
          ${animate ? `<div style="position:absolute; width:${size}px; height:${size}px; background:${color}; opacity:0.3; border-radius:50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ''}
          <div style="
            width: ${size}px; 
            height: ${size}px; 
            background: ${color}; 
            border-radius: 50% 50% 50% 0; 
            transform: rotate(-45deg); 
            display:flex; 
            align-items:center; 
            justify-content:center;
            border: 2.5px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            position: relative;
            z-index: 10;
          ">
            <svg style="transform:rotate(45deg);" width="${size * 0.45}" height="${size * 0.45}" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              ${icons[iconKey]}
            </svg>
          </div>
        </div>
        <style>
          @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
        </style>
      `,
      iconSize: [size, size + 10],
      iconAnchor: [size / 2, size + 10]
    });
  };

  // Guard avatar (Service Style)
  const createGuardIcon = () => {
    if (!L) return null;
    return L.divIcon({
      className: 'custom-guard-icon',
      html: `
        <div style="display:flex; flex-direction:column; align-items:center;">
          <div style="
            width: 38px; 
            height: 38px; 
            background: #111; 
            border-radius: 50%; 
            display:flex; 
            align-items:center; 
            justify-content:center;
            border: 3px solid #F59E0B;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
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
        <MapController onMapClick={onMapClick} isPickerMode={isPickerMode} draftCoords={draftCoords} />
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url={tileUrl}
        />

        {/* Draft pin for new objective */}
        {draftCoords && (
           <Marker position={[draftCoords.lat, draftCoords.lng]} icon={createDropIcon('#3B82F6', 'building', true)} />
        )}

        {/* Incident/Event Markers */}
        {incidents.map((inc) => {
          if (!inc.latitude || !inc.longitude) return null;
          const isIncident = inc.entry_type === 'incidente';
          const color = isIncident ? '#dc2626' : '#2563eb';
          const iconType = isIncident ? 'alert' : 'note';

          return (
            <Marker key={`inc-${inc.id}`} position={[inc.latitude, inc.longitude]} icon={createDropIcon(color, iconType, false, isIncident)}>
               <Popup>
                <div className="p-2 min-w-[180px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("w-2 h-2 rounded-full", isIncident ? "bg-red-500" : "bg-blue-500")} />
                    <span className="text-[10px] uppercase font-bold text-gray-400">{inc.entry_type}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{inc.content}</p>
                  <p className="text-[10px] text-gray-400 mt-2">{new Date(inc.created_at || '').toLocaleString()}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Objective Markers */}
        {objectives.map((obj) => (
          <React.Fragment key={`obj-${obj.id}`}>
            <Marker 
              position={[obj.latitude, obj.longitude]} 
              icon={createDropIcon('#F59E0B', 'building', selectedObjectiveId === obj.id)}
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
                  <div className="flex items-center gap-2 mt-3">
                    <div className={cn("w-2 h-2 rounded-full", obj.status === 'Activo' ? "bg-green-500" : "bg-gray-400")} />
                    <span className="text-xs font-medium text-gray-600">{obj.status}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}

        {/* Guard Markers */}
        {liveGuards.map((guard) => {
          if (!guard.latitude || !guard.longitude) return null;
          return (
            <Marker key={`guard-${guard.id}`} position={[guard.latitude, guard.longitude]} icon={createGuardIcon()}>
              <Popup>
                <div className="p-3 min-w-[160px]">
                  <p className="text-sm font-bold text-gray-900">{guard.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{guard.role || 'Personal'}</p>
                  <p className="text-[10px] text-green-500 uppercase mt-2 font-black flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> gps tracking
                  </p>
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

function MapController({ 
  onMapClick, 
  isPickerMode, 
  draftCoords 
}: { 
  onMapClick?: (coords: { lat: number, lng: number }) => void, 
  isPickerMode: boolean,
  draftCoords?: { lat: number, lng: number } | null
}) {
  const map = useMapEvents({
    click(e) {
      if (isPickerMode && onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });

  // Pan to draft coords when they change (search or click)
  useEffect(() => {
    if (draftCoords) {
      map.flyTo([draftCoords.lat, draftCoords.lng], 16, { animate: true, duration: 1.5 });
    }
  }, [draftCoords, map]);

  useEffect(() => { map.invalidateSize(); }, [map]);

  return null;
}

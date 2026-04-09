'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { cn } from '@/lib/utils';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const ZoomControl = dynamic(() => import('react-leaflet').then(mod => mod.ZoomControl), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(mod => mod.Circle), { ssr: false });

let L: any;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}

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
}

export default function TacticalLeaflet({
  objectives = [],
  resources = [],
  center = [-31.6107, -60.6973], // Santa Fe, Argentina default
  zoom = 14,
  className = "",
  onPointSelect
}: TacticalLeafletProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const createObjectiveIcon = (status: string) => {
    if (!L) return null;
    const color = status === 'Activo' ? '#EAB308' : '#ef4444'; // Corporate yellow vs red
    return L.divIcon({
      className: 'custom-objective-icon',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-10 h-10 rounded-full opacity-10 animate-pulse" style="background-color: ${color}"></div>
          <div class="relative w-5 h-5 rounded-full border-2 border-white shadow-xl flex items-center justify-center" style="background-color: ${color}">
            <div class="w-2 h-2 bg-white rounded-full"></div>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  };

  const createResourceIcon = (status: string) => {
    if (!L) return null;
    const color = status === 'active' ? '#3b82f6' : '#94a3b8'; // Blue active, Gray inactive
    return L.divIcon({
      className: 'custom-resource-icon',
      html: `
        <div class="relative flex flex-col items-center">
          <div class="w-8 h-8 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center shadow-lg overflow-hidden">
             <div class="w-full h-full flex items-center justify-center bg-blue-50 text-[10px] font-black text-blue-600">
                ${status === 'active' ? '●' : '○'}
             </div>
          </div>
          <div class="w-0.5 h-1.5 bg-blue-500 shadow-sm"></div>
        </div>
      `,
      iconSize: [32, 40],
      iconAnchor: [16, 38]
    });
  };

  if (!mounted) {
    return (
      <div className={cn("w-full h-full bg-zinc-50 flex flex-col items-center justify-center", className)}>
        <div className="w-10 h-10 rounded-full border-4 border-zinc-200 border-t-primary animate-spin"></div>
        <p className="mt-4 text-[10px] text-zinc-400 uppercase tracking-widest font-black">Cargando Mapa Operativo...</p>
      </div>
    );
  }

  // CartoDB Voyager - Light, Clean, High Contrast for Business
  const tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'; 

  return (
    <div className={cn("relative w-full h-full z-0 bg-zinc-100 overflow-hidden", className)}>
      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url={tileUrl}
        />

        {objectives.map((obj) => (
          <React.Fragment key={`obj-group-${obj.id}`}>
            <Circle 
              center={[obj.latitude, obj.longitude]} 
              radius={150}
              pathOptions={{
                color: 'rgba(59, 130, 246, 0.2)',
                fillColor: 'rgba(59, 130, 246, 0.05)',
                weight: 1,
              }}
            />
            <Marker 
              position={[obj.latitude, obj.longitude]} 
              icon={createObjectiveIcon(obj.status)}
              eventHandlers={{
                click: () => onPointSelect && onPointSelect(obj),
              }}
            >
              <Popup className="corporate-popup">
                <div className="p-4 bg-white -m-3 min-w-[220px] rounded-lg shadow-2xl">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight leading-none">{obj.name}</h3>
                      <p className="text-[9px] text-zinc-500 mt-1 uppercase font-bold tracking-tighter">Punto de vigilancia</p>
                    </div>
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full border border-white shadow-sm",
                      obj.status === 'Activo' ? "bg-green-500" : "bg-red-500"
                    )} />
                  </div>
                  
                  <div className="space-y-2 mb-4 border-y border-zinc-100 py-3">
                    <div className="flex justify-between text-[11px] font-medium">
                      <span className="text-zinc-500">Cobertura</span>
                      <span className="text-zinc-900">Activa (24h)</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-medium">
                      <span className="text-zinc-500">Personal</span>
                      <span className="text-blue-600 font-bold uppercase">En Puesto</span>
                    </div>
                  </div>

                  <button className="w-full h-10 bg-zinc-900 hover:bg-black text-[10px] text-white font-black uppercase tracking-widest transition-all rounded-md">
                    VER GESTIÓN COMPLETA
                  </button>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}

        {resources.map((res) => {
          if (!res.latitude || !res.longitude) return null;
          return (
            <Marker key={`res-${res.id}`} position={[res.latitude, res.longitude]} icon={createResourceIcon(res.status)}>
               <Popup className="resource-popup">
                 <div className="p-3 -m-3 bg-white rounded-md shadow-xl min-w-[160px]">
                   <div className="flex items-center gap-2 mb-2">
                     <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                     <p className="text-[10px] text-blue-600 font-black uppercase tracking-tighter">Personal Operativo</p>
                   </div>
                   <p className="text-xs font-black text-zinc-900 uppercase">{res.name}</p>
                   <p className="text-[8px] text-zinc-400 mt-1 font-mono uppercase italic">LOCALIZADO_GPS_OK</p>
                 </div>
               </Popup>
            </Marker>
          );
        })}

        <ZoomControl position="bottomright" />
      </MapContainer>

      {/* Simplified Corporate Overlay */}
      <div className="absolute top-6 left-6 z-[1000] pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md px-4 py-2 border border-zinc-200 rounded-lg shadow-sm">
           <p className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">Centro Operativo Santa Fe</p>
           <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-tighter italic">Sincronización de Flota Activa</span>
           </div>
        </div>
      </div>
    </div>
  );
}

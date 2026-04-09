'use client';

import React, { useEffect, useState, useMemo } from 'react';
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

// Leaflet icons need to be managed carefully in Next.js
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
  center = [-34.6037, -58.3816], // Buenos Aires default
  zoom = 13,
  className = "",
  onPointSelect
}: TacticalLeafletProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const createObjectiveIcon = (status: string) => {
    if (!L) return null;
    const color = status === 'Activo' ? '#FFD700' : '#FF4500';
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full opacity-20 animate-ping" style="background-color: ${color}"></div>
          <div class="relative w-4 h-4 rounded-full border-2 border-white shadow-lg flex items-center justify-center" style="background-color: ${color}">
            <div class="w-1.5 h-1.5 bg-black rounded-full"></div>
          </div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  };

  const createResourceIcon = (status: string) => {
    if (!L) return null;
    const color = status === 'active' ? '#3b82f6' : '#ef4444';
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="relative flex flex-col items-center">
          <div class="w-6 h-6 rounded-sm bg-black border border-white/50 flex items-center justify-center shadow-2xl rotate-45">
             <div class="w-2 h-2 rounded-full rotate-45" style="background-color: ${color}"></div>
          </div>
          <div class="w-0.5 h-2 bg-white/50"></div>
        </div>
      `,
      iconSize: [24, 30],
      iconAnchor: [12, 28]
    });
  };

  if (!mounted) {
    return (
      <div className={cn("w-full h-full bg-[#0a0a0a] flex flex-col items-center justify-center border border-primary/10", className)}>
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-primary animate-pulse"></div>
          </div>
        </div>
        <p className="mt-4 text-[10px] text-primary/50 uppercase tracking-[0.3em] font-black animate-pulse">Inicializando Radar...</p>
      </div>
    );
  }

  // CartoDB Dark Matter tile for a cyber/tactical feel
  const mapboxStyleUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'; 

  return (
    <div className={cn("relative w-full h-full z-0 bg-[#0a0a0a] overflow-hidden rounded-lg border border-primary/10", className)}>
      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url={mapboxStyleUrl}
        />

        {/* Render Objectives (Puntos de vigilancia contratados) */}
        {objectives.map((obj) => (
          <React.Fragment key={`obj-group-${obj.id}`}>
            <Circle 
              center={[obj.latitude, obj.longitude]} 
              radius={200}
              pathOptions={{
                color: obj.status === 'Activo' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                fillColor: obj.status === 'Activo' ? 'rgba(255, 215, 0, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                weight: 1,
                dashArray: '5, 5'
              }}
            />
            <Marker 
              position={[obj.latitude, obj.longitude]} 
              icon={createObjectiveIcon(obj.status)}
              eventHandlers={{
                click: () => onPointSelect && onPointSelect(obj),
              }}
            >
              <Popup className="tactical-popup">
                <div className="p-3 bg-black/95 border border-primary/20 backdrop-blur-xl -m-3 min-w-[180px]">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xs font-black font-display uppercase tracking-wider text-white pr-4">{obj.name}</h3>
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      obj.status === 'Activo' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 animate-pulse"
                    )} />
                  </div>
                  <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500 uppercase">Estado</span>
                      <span className={cn("font-bold uppercase", obj.status === 'Activo' ? "text-primary" : "text-red-500")}>
                        {obj.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500 uppercase">Personal Prox.</span>
                      <span className="text-white font-mono">DETECTADO</span>
                    </div>
                  </div>
                  <button className="w-full h-8 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-[9px] text-primary font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2">
                    DETALLES COMPLETOS
                  </button>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}

        {/* Render Resources (Guardias Activos) */}
        {resources.map((res) => {
          // Fallback check for coordinates
          if (!res.latitude || !res.longitude) return null;
          
          return (
            <Marker key={`res-${res.id}`} position={[res.latitude, res.longitude]} icon={createResourceIcon(res.status)}>
               <Popup className="resource-popup">
                 <div className="p-2 -m-3 bg-blue-950/90 border border-blue-500/30 backdrop-blur-md min-w-[140px]">
                   <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mb-1">UNIDAD_ACTIVA</p>
                   <p className="text-xs font-black text-white uppercase">{res.name}</p>
                   <div className="mt-2 flex items-center gap-2">
                     <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                     <span className="text-[9px] text-blue-300/70 font-mono uppercase">CONEXIÓN ESTABLE</span>
                   </div>
                 </div>
               </Popup>
            </Marker>
          );
        })}

        <ZoomControl position="bottomright" />
      </MapContainer>

      {/* Map Overlay Accents */}
      <div className="absolute top-4 right-4 z-[1000] pointer-events-none">
        <div className="flex flex-col items-end gap-2">
          <div className="px-3 py-1 bg-black/60 border border-primary/20 backdrop-blur-md text-[9px] font-mono text-primary/80 uppercase tracking-widest">
            LAT: {center[0].toFixed(4)}
          </div>
          <div className="px-3 py-1 bg-black/60 border border-primary/20 backdrop-blur-md text-[9px] font-mono text-primary/80 uppercase tracking-widest">
            LNG: {center[1].toFixed(4)}
          </div>
        </div>
      </div>

      {/* Grid Effect Overlay */}
      <div className="absolute inset-0 pointer-events-none z-[999] opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(circle, #FFD700 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
    </div>
  );
}

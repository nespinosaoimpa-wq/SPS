'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, MapPin, Eye, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

export function RoundCard({ round }: { round: any }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Fix leaflet default icons if needed
    (async function init() {
      if (typeof window !== 'undefined') {
        const L = (await import('leaflet')).default;
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
      }
    })();
  }, []);

  const coordinates = round.traces?.map((t: any) => [t.latitude, t.longitude]) || [];
  
  let center: [number, number] = [-31.6333, -60.7000]; // default Santa Fe
  if (coordinates.length > 0) {
    const lats = coordinates.map((c: any) => c[0]);
    const lngs = coordinates.map((c: any) => c[1]);
    center = [(Math.max(...lats) + Math.min(...lats)) / 2, (Math.max(...lngs) + Math.min(...lngs)) / 2];
  } else if (round.incidents && round.incidents.length > 0) {
    center = [round.incidents[0].latitude, round.incidents[0].longitude];
  }

  const startDate = new Date(round.start_at);
  const durationMs = round.end_at ? new Date(round.end_at).getTime() - startDate.getTime() : 0;
  const durationMins = Math.round(durationMs / 60000);

  const startPoint = coordinates.length > 0 ? coordinates[0] : null;
  const endPoint = coordinates.length > 1 ? coordinates[coordinates.length - 1] : null;

  return (
    <div className="bg-[#18181b] border border-white/5 rounded-[24px] overflow-hidden flex flex-col shadow-2xl">
      {/* MAP SECTION */}
      <div className="relative h-[200px] w-full bg-zinc-900 overflow-hidden z-0">
        {mounted && (
          <MapContainer
            center={center}
            zoom={15}
            scrollWheelZoom={false}
            dragging={false}
            zoomControl={false}
            className="h-full w-full opacity-80 mix-blend-screen"
            attributionControl={false}
          >
            {/* Dark map tiles */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {coordinates.length > 1 && (
              <Polyline positions={coordinates} pathOptions={{ color: 'white', weight: 4, lineCap: 'round', lineJoin: 'round' }} />
            )}
            
            {/* Incidents Markers */}
            {round.incidents?.map((incident: any) => (
              incident.latitude && incident.longitude && (
                <Marker key={incident.id} position={[incident.latitude, incident.longitude]}>
                  <Popup className="tactical-popup">
                    <p className="uppercase tracking-widest text-[9px] text-zinc-500 font-bold mb-1">{incident.entry_type}</p>
                    <p className="text-xs text-black font-medium">{incident.content}</p>
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        )}

        {/* CSS-based start/end overlay for precision without custom L.DivIcon complexity */}
        {mounted && startPoint && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 w-3 h-3 bg-white border-2 border-black" />
        )}
      </div>

      {/* DETAILS SECTION */}
      <div className="p-5 flex flex-col gap-1 z-10 relative bg-[#18181b]">
        <h2 className="text-xl font-black tracking-tight text-white">{round.objective?.name || 'Ronda General'}</h2>
        <div className="flex items-center text-sm font-medium text-zinc-400 mt-1">
          <span>{startDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} · {startDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex items-center text-sm font-medium text-zinc-400 mt-0.5">
          <span>{round.distance_km ? `${parseFloat(round.distance_km).toFixed(2)} km` : '0.00 km'}</span>
          <span className="mx-2">•</span>
          <span>{durationMins} min</span>
          <span className="mx-2">•</span>
          <span className={cn("font-bold", round.incidents?.length > 0 ? "text-red-400" : "")}>
            {round.incidents?.length || 0} Novedades
          </span>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-full transition-colors flex items-center gap-2 border border-white/5">
            <Eye size={16} /> Ver Detalles
          </button>
          <div className="flex items-center gap-2 ml-auto text-xs font-bold text-zinc-500">
            {round.resource?.avatar_url ? (
              <img src={round.resource.avatar_url} className="w-6 h-6 rounded-full object-cover" alt="Operador" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                 <MapPin size={10} />
              </div>
            )}
            {round.resource?.name?.split(' ')[0]}
          </div>
        </div>
      </div>
    </div>
  );
}

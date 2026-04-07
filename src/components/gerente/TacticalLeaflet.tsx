'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const ZoomControl = dynamic(() => import('react-leaflet').then(mod => mod.ZoomControl), { ssr: false });

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
}

export default function TacticalLeaflet({
  objectives = [],
  resources = [],
  center = [-34.6037, -58.3816], // Buenos Aires default
  zoom = 13,
  className = ""
}: TacticalLeafletProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`w-full h-full bg-[#111] flex items-center justify-center ${className}`}>
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // CartoDB Dark Matter tile for a cyber/tactical feel
  const mapboxStyleUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'; 

  return (
    <div className={`relative w-full h-full z-0 bg-[#111] ${className}`}>
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
          <Marker key={`obj-${obj.id}`} position={[obj.latitude, obj.longitude]}>
            <Popup className="tactical-popup">
              <div className="p-1">
                <h3 className="text-xs font-bold font-display uppercase tracking-wider">{obj.name}</h3>
                <p className="text-[10px] text-gray-500 uppercase mt-1">Estado: <span className="text-primary font-bold">{obj.status}</span></p>
                <button className="mt-2 text-[9px] bg-primary text-black px-2 py-1 uppercase tracking-widest font-bold w-full rounded-sm hover:-translate-y-0.5 transition-transform">
                  Ver Detalles (Drill-down)
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Render Resources (Guardias Activos) */}
        {resources.map((res) => (
           <Marker key={`res-${res.id}`} position={[res.latitude, res.longitude]}>
              <Popup>
                <strong>{res.name}</strong><br/>
                Estado: {res.status}
              </Popup>
           </Marker>
        ))}

        <ZoomControl position="bottomright" />
      </MapContainer>
    </div>
  );
}

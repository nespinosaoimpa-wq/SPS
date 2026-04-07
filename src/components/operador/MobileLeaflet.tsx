'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility'; // This automatically fixes missing marker icons in React Leaflet

// We must lazy-load the map components because they depend on the `window` object
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });
const ZoomControl = dynamic(() => import('react-leaflet').then(mod => mod.ZoomControl), { ssr: false });

interface MobileLeafletProps {
  currentPosition?: [number, number];
  routePoints?: [number, number][]; // Line path to follow
  destinations?: { id: string; name: string; position: [number, number] }[];
}

export default function MobileLeaflet({
  currentPosition = [-34.6037, -58.3816], // Default Buenos Aires
  routePoints = [],
  destinations = []
}: MobileLeafletProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // We use CartoDB Positron for a light, clean look very similar to PedidoYa/Uber
  const mapboxStyleUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'; 
  
  return (
    <div className="w-full h-[100dvh] relative z-0">
      <MapContainer 
        center={currentPosition} 
        zoom={15} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url={mapboxStyleUrl}
        />
        
        {/* Route (Patrol path) */}
        {routePoints.length > 0 && (
          <Polyline 
            positions={routePoints} 
            color="#3b82f6" 
            weight={5} 
            opacity={0.7} 
            dashArray="10, 10" 
          />
        )}

        {/* Contracted Points (Destinations) */}
        {destinations.map(dest => (
          <Marker key={dest.id} position={dest.position} />
        ))}

        {/* Current Position Marker (Cadet/Guard) */}
        <Marker position={currentPosition} />

        <ZoomControl position="topright" />
      </MapContainer>
    </div>
  );
}

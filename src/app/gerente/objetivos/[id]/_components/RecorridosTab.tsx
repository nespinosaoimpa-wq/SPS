'use client';

import React, { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/lib/supabase';
import { Shield, Clock, User, ChevronRight } from 'lucide-react';

// Configure Mapbox Token - Asume que la env var está configurada en el proyecto
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface RecorridosTabProps {
  objectiveId: string;
}

export default function RecorridosTab({ objectiveId }: RecorridosTabProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [rounds, setRounds] = useState<any[]>([]);
  const [selectedRound, setSelectedRound] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Markers refs for start and end
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const endMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  // 1. Fetch patrol rounds history (last 5 days)
  useEffect(() => {
    const fetchRounds = async () => {
      setIsLoading(true);
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('patrol_rounds')
        .select(`
          *,
          resources(name)
        `)
        .eq('objective_id', objectiveId)
        .gte('started_at', fiveDaysAgo)
        .order('started_at', { ascending: false });

      if (error) {
        console.error('Error fetching patrol rounds:', error);
      } else {
        setRounds(data || []);
      }
      setIsLoading(false);
    };

    fetchRounds();
  }, [objectiveId]);

  // 2. Initialize isolated Mapbox instance
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-60.7, -31.6], // Default center, will be overridden
      zoom: 14,
      pitch: 45,
      antialias: true
    });

    map.current.on('style.load', () => {
      const currentMap = map.current;
      if (!currentMap) return;

      // Add 3D buildings (Solid Engineering Maquette style)
      // We look for the first symbol layer to insert buildings below labels
      const layers = currentMap.getStyle().layers;
      let labelLayerId;
      for (let i = 0; i < layers.length; i++) {
        if (layers[i].type === 'symbol' && layers[i].layout && layers[i].layout['text-field']) {
          labelLayerId = layers[i].id;
          break;
        }
      }

      currentMap.addLayer(
        {
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 15,
          paint: {
            'fill-extrusion-color': '#e2ded4',
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'height']
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 1.0 // SOLID, no transparency
          }
        },
        labelLayerId
      );

      // Sources for the Route
      currentMap.addSource('route-shadow', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      
      currentMap.addSource('route-main', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      currentMap.addSource('route-points', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      // Shadow Layer (Land id™ effect)
      currentMap.addLayer({
        id: 'route-shadow-layer',
        type: 'line',
        source: 'route-shadow',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#18181b', // zinc-900 mate
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 4, 18, 10],
          'line-opacity': 0.8
        }
      });

      // Main Layer (Institutional Gold)
      currentMap.addLayer({
        id: 'route-main-layer',
        type: 'line',
        source: 'route-main',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#D4AF37',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2, 18, 6],
          'line-blur': 0.5
        }
      });

      // Invisible Points for Forensic Hover Interactivity
      currentMap.addLayer({
        id: 'route-points-hover',
        type: 'circle',
        source: 'route-points',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 4, 18, 12],
          'circle-color': 'transparent',
          'circle-stroke-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            '#18181b',
            'transparent'
          ],
          'circle-stroke-width': 2
        }
      });

      // Create Popup instance
      popupRef.current = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'forensic-popup',
        offset: 15
      });

      // Hover logic
      let hoveredPointId: string | number | null = null;

      currentMap.on('mousemove', 'route-points-hover', (e) => {
        if (!e.features || e.features.length === 0) return;
        currentMap.getCanvas().style.cursor = 'crosshair';
        
        const feature = e.features[0];
        
        if (hoveredPointId !== null) {
          currentMap.setFeatureState(
            { source: 'route-points', id: hoveredPointId },
            { hover: false }
          );
        }
        hoveredPointId = feature.id as number;
        currentMap.setFeatureState(
          { source: 'route-points', id: hoveredPointId },
          { hover: true }
        );

        // Populate popup
        const props = feature.properties;
        const html = `
          <div class="bg-white border border-zinc-200 shadow-xl rounded-lg text-zinc-900 text-xs p-3 min-w-[140px]">
            <div class="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-100">
              <div class="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></div>
              <span class="font-black uppercase tracking-widest text-[9px] text-zinc-500">Telemetría</span>
            </div>
            <div class="space-y-1">
              <div class="flex justify-between">
                <span class="font-bold text-zinc-400">Hora:</span>
                <span class="font-mono font-black">${props?.time}</span>
              </div>
              <div class="flex justify-between">
                <span class="font-bold text-zinc-400">Velocidad:</span>
                <span class="font-mono font-black">${props?.speed} km/h</span>
              </div>
              <div class="flex justify-between">
                <span class="font-bold text-zinc-400">Precisión:</span>
                <span class="font-mono font-black">±${props?.accuracy} m</span>
              </div>
            </div>
          </div>
        `;
        
        // Custom CSS injected globally for the popup wrapper since Mapbox creates its own DOM node
        const coords = (feature.geometry as any).coordinates.slice();
        if (popupRef.current) {
          popupRef.current.setLngLat(coords as [number, number]).setHTML(html).addTo(currentMap);
        }
      });

      currentMap.on('mouseleave', 'route-points-hover', () => {
        currentMap.getCanvas().style.cursor = '';
        if (hoveredPointId !== null) {
          currentMap.setFeatureState(
            { source: 'route-points', id: hoveredPointId },
            { hover: false }
          );
        }
        hoveredPointId = null;
        if (popupRef.current) popupRef.current.remove();
      });
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // 3. Process selected round and update map data (NO RE-RENDERS)
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded() || !selectedRound) return;
    
    const telemetry = selectedRound.telemetry_path || [];
    if (!Array.isArray(telemetry) || telemetry.length === 0) {
      alert("La ronda seleccionada no contiene datos de telemetría.");
      return;
    }

    // Extract coords and build GeoJSON
    const coords = telemetry.map((pt: any) => [pt.lng, pt.lat]);
    
    const lineString: GeoJSON.Feature = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: coords
      },
      properties: {}
    };

    const pointsCollection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: telemetry.map((pt: any, i: number) => ({
        type: 'Feature',
        id: i,
        geometry: {
          type: 'Point',
          coordinates: [pt.lng, pt.lat]
        },
        properties: {
          time: pt.timestamp ? new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A',
          speed: pt.speed ? Number(pt.speed).toFixed(1) : '0.0',
          accuracy: pt.accuracy ? Number(pt.accuracy).toFixed(1) : '0'
        }
      }))
    };

    const currentMap = map.current;
    
    // Update sources
    (currentMap.getSource('route-shadow') as mapboxgl.GeoJSONSource).setData(lineString);
    (currentMap.getSource('route-main') as mapboxgl.GeoJSONSource).setData(lineString);
    (currentMap.getSource('route-points') as mapboxgl.GeoJSONSource).setData(pointsCollection);

    // Update markers (start/end) perfectly clamped to the map pitch/rotation
    if (startMarkerRef.current) startMarkerRef.current.remove();
    if (endMarkerRef.current) endMarkerRef.current.remove();

    const startEl = document.createElement('div');
    startEl.className = 'w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-lg';
    startMarkerRef.current = new mapboxgl.Marker({ element: startEl, pitchAlignment: 'map', rotationAlignment: 'map' })
      .setLngLat(coords[0] as [number, number])
      .addTo(currentMap);

    const endEl = document.createElement('div');
    endEl.className = 'w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg';
    endMarkerRef.current = new mapboxgl.Marker({ element: endEl, pitchAlignment: 'map', rotationAlignment: 'map' })
      .setLngLat(coords[coords.length - 1] as [number, number])
      .addTo(currentMap);

    // Fit bounds dynamically
    const bounds = new mapboxgl.LngLatBounds();
    coords.forEach((coord: any) => bounds.extend(coord));
    
    currentMap.fitBounds(bounds, {
      padding: 50,
      pitch: 45,
      duration: 1000
    });

  }, [selectedRound]);

  // Global styles for the mapbox popup to ensure styling constraints without CSS modules
  useEffect(() => {
    const styleId = 'mapbox-popup-overrides';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        .forensic-popup .mapboxgl-popup-content {
          padding: 0;
          background: transparent;
          border-radius: 0.5rem;
          box-shadow: none;
        }
        .forensic-popup .mapboxgl-popup-tip {
          display: none;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="flex h-[600px] w-full rounded-2xl overflow-hidden border border-zinc-200 shadow-sm bg-zinc-50">
      
      {/* Columna Izquierda: Timeline Histórico */}
      <div className="w-[35%] min-w-[320px] max-w-[400px] h-full flex flex-col bg-zinc-50 border-r border-zinc-200">
        <div className="p-5 border-b border-zinc-200 bg-white">
          <h2 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Auditoría de Recorridos</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Últimos 5 Días</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="w-8 h-8 border-2 border-zinc-200 border-t-[#D4AF37] rounded-full animate-spin"></div>
            </div>
          ) : rounds.length > 0 ? (
            rounds.map((round) => {
              const start = new Date(round.started_at);
              const end = round.ended_at ? new Date(round.ended_at) : null;
              
              let durationStr = "En curso";
              if (end) {
                const diffMs = end.getTime() - start.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                durationStr = \`\${diffMins} MIN\`;
              }

              const isSelected = selectedRound?.id === round.id;

              return (
                <div 
                  key={round.id}
                  onClick={() => setSelectedRound(round)}
                  className={\`w-full text-left p-4 rounded-xl cursor-pointer transition-all bg-white shadow-sm border
                    \${isSelected 
                      ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/50' 
                      : 'border-zinc-200 hover:border-zinc-300 hover:shadow-md'
                    }\`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={\`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border
                        \${isSelected ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]' : 'bg-zinc-50 border-zinc-100 text-zinc-400'}\`}
                      >
                        <Shield size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-zinc-900 uppercase tracking-tight line-clamp-1">
                          {round.resources?.name || 'Recurso Desconocido'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={\`w-1.5 h-1.5 rounded-full \${end ? 'bg-zinc-300' : 'bg-emerald-500 animate-pulse'}\`}></span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                            {end ? 'Completado' : 'Patrullando'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className={isSelected ? 'text-[#D4AF37]' : 'text-zinc-300'} />
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Inicio</span>
                        <span className="text-[10px] font-mono font-black text-zinc-900">
                          {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="w-px h-6 bg-zinc-200"></div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Fin</span>
                        <span className="text-[10px] font-mono font-black text-zinc-900">
                          {end ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-zinc-50 px-2 py-1 rounded-md border border-zinc-100">
                      <Clock size={10} className="text-zinc-400" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{durationStr}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 italic">No hay rondas recientes</p>
            </div>
          )}
        </div>
      </div>

      {/* Columna Derecha: Visor de Mapa Mapbox */}
      <div className="flex-1 relative bg-zinc-200">
        <div ref={mapContainer} className="w-full h-full" />
        
        {!selectedRound && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 transition-opacity">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-zinc-200 mb-4">
              <Shield size={28} className="text-zinc-300" />
            </div>
            <p className="text-xs font-black text-zinc-900 uppercase tracking-widest">Esperando Selección</p>
            <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Seleccioná un rondín del historial para visualizar la telemetría</p>
          </div>
        )}
      </div>

    </div>
  );
}

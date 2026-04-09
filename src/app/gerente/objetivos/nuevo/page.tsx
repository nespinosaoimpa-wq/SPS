'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  MapPin, 
  FileText, 
  Camera, 
  Upload, 
  ChevronLeft,
  Search,
  CheckCircle2,
  X,
  Target,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const TacticalLeaflet = dynamic(() => import('@/components/gerente/TacticalLeaflet'), { ssr: false });

export default function NuevoObjetivo() {
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>({ lat: -31.6107, lng: -60.6973 }); // Santa Fe default
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen bg-zinc-50 pl-32 pr-12 py-12">
      
      {/* 1. HEADER */}
      <div className="flex justify-between items-end mb-12">
        <div className="space-y-1">
          <Link href="/gerente/mapa">
            <Button variant="ghost" className="text-zinc-500 hover:text-zinc-900 gap-2 font-black uppercase text-[10px] -ml-2 mb-2">
              <ChevronLeft size={16} /> Volver al Mapa Operativo
            </Button>
          </Link>
          <h1 className="text-5xl font-black text-zinc-900 tracking-tighter">Alta de <span className="text-primary">Nuevo Objetivo</span></h1>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.3em] font-display">Logística Operativa :: Registro de Puesto de Vigilancia</p>
        </div>
        <div className="flex items-center gap-8 bg-white px-6 py-4 border border-zinc-200 rounded-2xl shadow-sm">
           {[1, 2, 3].map((s) => (
             <div key={s} className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all",
                  step === s ? "bg-zinc-900 text-white" : step > s ? "bg-green-100 text-green-600" : "bg-zinc-100 text-zinc-400"
                )}>
                   {step > s ? <CheckCircle2 size={16} /> : s}
                </div>
                {s < 3 && <div className="w-8 h-px bg-zinc-200" />}
             </div>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-10">
        
        {/* LEFT: INTERACTIVE MAP PICKER (70%) */}
        <div className="col-span-8">
           <Card className="h-[600px] bg-white border-zinc-200 shadow-xl overflow-hidden relative flex flex-col">
              <CardHeader className="bg-zinc-50 border-b border-zinc-100 flex flex-row items-center justify-between px-8 py-4">
                 <div className="flex items-center gap-3">
                    <Target size={18} className={cn(step === 1 ? "text-primary animate-pulse" : "text-zinc-400")} />
                    <div>
                       <CardTitle className="text-xs text-zinc-900 tracking-widest font-black uppercase">Localización en Santa Fe</CardTitle>
                       <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-tighter italic">Carga de coordenadas georeferenciadas</p>
                    </div>
                 </div>
                 {coords && (
                   <div className="flex gap-4">
                      <div className="text-right">
                         <p className="text-[8px] font-black text-zinc-400 uppercase">Latitud</p>
                         <p className="text-[10px] font-mono font-bold text-zinc-900">{coords.lat.toFixed(6)}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[8px] font-black text-zinc-400 uppercase">Longitud</p>
                         <p className="text-[10px] font-mono font-bold text-zinc-900">{coords.lng.toFixed(6)}</p>
                      </div>
                   </div>
                 )}
              </CardHeader>
              <CardContent className="p-0 flex-1 relative grayscale-[0.2]">
                 <TacticalLeaflet 
                   center={[coords?.lat || -31.6107, coords?.lng || -60.6973]} 
                   zoom={15}
                 />
                 <div className="absolute top-6 left-6 z-[1000] w-72">
                    <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                       <Input placeholder="Buscar dirección o punto..." className="pl-10 h-12 bg-white/95 border-white shadow-xl text-xs font-bold uppercase" />
                    </div>
                 </div>
                 
                 {/* Visual Selector Overlay (Simulated) */}
                 <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1000]">
                    <div className="relative">
                       <div className="w-1 h-1 bg-primary rounded-full shadow-[0_0_20px_rgba(255,215,0,1)]" />
                       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-primary/40 rounded-full animate-ping pointer-events-none" />
                       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary rounded-full" />
                    </div>
                 </div>
              </CardContent>
              <div className="bg-zinc-50 border-t border-zinc-100 p-6 flex justify-between items-center px-8">
                 <p className="text-[10px] text-zinc-500 font-bold uppercase italic tracking-tighter italic">Haga clic en el mapa para ajustar la ubicación precisa del objetivo.</p>
                 <Button onClick={() => setStep(2)} disabled={step > 1} className="bg-zinc-900 hover:bg-black text-white px-8 gap-2 font-black uppercase text-[10px]">
                   Confirmar Ubicación <ArrowRight size={14} />
                 </Button>
              </div>
           </Card>
        </div>

        {/* RIGHT: BUSINESS DETAILS & UPLOADS (30%) */}
        <div className="col-span-4 space-y-8">
           
           <Card className={cn(
             "bg-white border-zinc-200 shadow-sm transition-all duration-500",
             step < 2 ? "opacity-40 grayscale pointer-events-none" : "opacity-100"
           )}>
              <CardHeader className="p-8 pb-4">
                 <CardTitle className="text-xs text-zinc-900 tracking-widest font-black uppercase">Detalles del Cliente</CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-6">
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1">Nombre Comercial</label>
                       <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                          <Input placeholder="E.G. CONSORCIO PORTOFINO" className="pl-10 h-11 border-zinc-100 bg-zinc-50 text-[11px] font-bold uppercase" />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1">Dirección Registrada</label>
                       <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                          <Input placeholder="CALLE Y NÚMERO..." className="pl-10 h-11 border-zinc-100 bg-zinc-50 text-[11px] font-bold uppercase" />
                       </div>
                    </div>
                 </div>
                 <Button onClick={() => setStep(3)} className="w-full h-11 bg-zinc-900 text-white font-black uppercase text-[10px]">Siguiente Paso</Button>
              </CardContent>
           </Card>

           <Card className={cn(
             "bg-zinc-900 text-white border-none shadow-2xl transition-all duration-500",
             step < 3 ? "opacity-0 translate-y-20 pointer-events-none" : "opacity-100 translate-y-0"
           )}>
              <CardHeader className="p-8 pb-4">
                 <CardTitle className="text-xs text-white tracking-widest font-black uppercase">Gestión Documental</CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-6">
                 
                 <div className="space-y-3">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Plan de Emergencia (PDF)</p>
                    <div className="p-4 border border-zinc-800 rounded-xl bg-white/5 flex items-center justify-between group hover:bg-white/10 cursor-pointer transition-all">
                       <div className="flex items-center gap-3">
                          <FileText size={16} className="text-zinc-500" />
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Seleccionar Archivo</span>
                       </div>
                       <Upload size={14} className="text-zinc-600 group-hover:text-primary transition-colors" />
                    </div>
                 </div>

                 <div className="space-y-3">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Foto del Objetivo (Frontal)</p>
                    <div className="p-4 border border-zinc-800 rounded-xl bg-white/5 flex items-center justify-between group hover:bg-white/10 cursor-pointer transition-all">
                       <div className="flex items-center gap-3">
                          <Camera size={16} className="text-zinc-500" />
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Subir Imagen</span>
                       </div>
                       <Upload size={14} className="text-zinc-600 group-hover:text-primary transition-colors" />
                    </div>
                 </div>

                 <div className="pt-4">
                    <Button variant="vanguard" className="w-full h-14 bg-white text-zinc-900 hover:bg-primary font-black uppercase tracking-[0.2em]">FINALIZAR ALTA</Button>
                    <p className="text-[8px] text-zinc-600 font-bold uppercase text-center mt-4 italic">El punto será visible en el mapa operativo instantáneamente.</p>
                 </div>
              </CardContent>
           </Card>

        </div>

      </div>

    </div>
  );
}

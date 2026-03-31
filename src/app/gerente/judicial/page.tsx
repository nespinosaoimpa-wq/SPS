'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldAlert, 
  FileLock2, 
  Hash, 
  Search, 
  Download, 
  Camera,
  MapPin,
  CheckCircle2,
  AlertOctagon,
  FileDigit,
  Fingerprint
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

const evidenceData = [
  { id: 'EV-8821', time: '23:40', type: 'Posición GPS', user: 'Op. Méndez', hash: '8e7f1...a2b3', status: 'Congelado' },
  { id: 'EV-8820', time: '23:38', type: 'Foto Evidencia', user: 'Op. Ruiz', hash: 'f4d2c...9e8d', status: 'Congelado' },
  { id: 'EV-8819', time: '23:35', type: 'Log de Voz', user: 'Radio M-02', hash: '2b0a3...c1d5', status: 'Congelado' },
];

export default function JudicialPage() {
  const [isFrozen, setIsFrozen] = useState(false);
  const [panicCountdown, setPanicCountdown] = useState(120); // 2 hours in minutes

  const handlePanic = async () => {
    try {
      await api.judicial.freeze({
        frozen_by: '550e8400-e29b-41d4-a716-446655440000', // Placeholder
        reason: 'Activación manual de pánico judicial',
        latitude: -31.62, // Placeholder
        longitude: -60.70, // Placeholder
      });
      setIsFrozen(true);
    } catch (error) {
      console.error('Error initiating judicial freeze:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Módulo Judicial</h1>
          <p className="text-xs text-red-500 uppercase font-display tracking-widest mt-1 font-bold">Resguardo Legal de Evidencia Digital — Cadena de Custodia</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 border-red-500/20 text-red-500 hover:bg-red-500/10">
            <ShieldAlert size={16} /> AUDITORÍA DE ACCESOS
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Panic Button Control */}
        <Card className="lg:col-span-1 border-red-500/40 bg-red-500/5 relative overflow-hidden">
          <div className="p-6">
            <CardHeader className="p-0 border-none mb-6">
              <CardTitle className="text-red-500 flex items-center gap-2">
                <AlertOctagon size={18} /> Protocolo de Emergencia
              </CardTitle>
              <CardDescription className="text-[10px] text-gray-400 uppercase mt-2">
                ACCIÓN IRREVERSIBLE: CONGELAMIENTO DE BASE DE DATOS PARA PERICIA JUDICIAL
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0 space-y-6">
              <div className="text-center p-8 border-2 border-dashed border-red-500/20 bg-black/40">
                {!isFrozen ? (
                  <>
                    <ShieldAlert size={48} className="text-red-600 mx-auto mb-4 animate-pulse" />
                    <p className="text-xs text-white uppercase font-bold mb-6">Presione para asegurar escena digital</p>
                    <Button 
                      variant="destructive" 
                      className="w-full h-16 bg-red-600 text-lg font-black shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                      onClick={handlePanic}
                    >
                      PÁNICO JUDICIAL
                    </Button>
                  </>
                ) : (
                  <>
                    <FileLock2 size={48} className="text-green-500 mx-auto mb-4" />
                    <p className="text-xs text-green-500 uppercase font-bold mb-2">SISTEMA CONGELADO</p>
                    <div className="text-4xl font-mono text-white mb-4">01:59:59</div>
                    <p className="text-[10px] text-gray-500 uppercase">Tiempo restante de resguardo</p>
                  </>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-black/20 border border-primary/5 text-[10px]">
                  <Fingerprint className="text-primary" size={16} />
                  <div className="flex-1">
                    <p className="text-gray-500 uppercase">Firma Digital</p>
                    <p className="text-white font-mono break-all">id_sig_sha256_99b0c2a...</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-black/20 border border-primary/5 text-[10px]">
                  <CheckCircle2 className="text-green-500" size={16} />
                  <div className="flex-1">
                    <p className="text-gray-500 uppercase">Integridad</p>
                    <p className="text-white font-bold uppercase">Verificada por SPS-Vault</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Evidence Integrity Table */}
        <Card className="lg:col-span-2 border-primary/10">
          <CardHeader className="border-b border-primary/10">
            <CardTitle className="text-xs flex items-center gap-2">
              <FileDigit size={14} className="text-primary" />
              Trazabilidad de Evidencia Registrada
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left order-collapse">
              <thead>
                <tr className="bg-black/60 border-b border-primary/10">
                  <th className="p-4 text-[9px] text-gray-500 uppercase font-display tracking-widest">ID</th>
                  <th className="p-4 text-[9px] text-gray-500 uppercase font-display tracking-widest">TIPO / HORA</th>
                  <th className="p-4 text-[9px] text-gray-500 uppercase font-display tracking-widest">FUENTE</th>
                  <th className="p-4 text-[9px] text-gray-500 uppercase font-display tracking-widest">INTEGRIDAD (SHA-256)</th>
                  <th className="p-4 text-[9px] text-gray-500 uppercase font-display tracking-widest text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {evidenceData.map((row, i) => (
                  <tr key={i} className="border-b border-primary/5 hover:bg-primary/5 transition-colors">
                    <td className="p-4">
                      <span className="text-xs font-mono text-white">{row.id}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white uppercase">{row.type}</span>
                        <span className="text-[10px] text-gray-500 uppercase">{row.time}</span>
                      </div>
                    </td>
                    <td className="p-4 text-xs uppercase text-gray-400">{row.user}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 px-2 py-1 bg-black/40 border border-primary/10 w-fit">
                        <Hash size={10} className="text-primary" />
                        <span className="text-[10px] font-mono text-primary">{row.hash}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-gray-500 hover:text-primary transition-colors">
                        <Download size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
          <div className="p-4 text-center border-t border-primary/5">
            <button className="text-[10px] text-primary uppercase tracking-widest font-display flex items-center gap-2 mx-auto">
              <Camera size={12} /> Solicitar Grabación de Búsqueda Secuencial
            </button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Investigative Camera radius finder */}
        <Card className="border-primary/10 bg-secondary/30">
          <CardHeader>
            <CardTitle className="text-xs">Buscador de Cámaras en Radio de Escape</CardTitle>
            <CardDescription className="text-[10px] uppercase">Radio: 500m desde coordenada de incidente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-6">
              <Input placeholder="LATITUD / LONGITUD" className="bg-black/40 text-[10px] tracking-widest" />
              <Button variant="tactical" className="whitespace-nowrap">LOCALIZAR</Button>
            </div>
            <div className="space-y-3">
              {[
                { name: 'CAM-12 (Esq. 4 y 7)', dist: '120m', status: 'Online' },
                { name: 'CAM-08 (Acceso Sur)', dist: '340m', status: 'Online' },
              ].map((cam, i) => (
                <div key={i} className="p-3 border border-primary/10 flex justify-between items-center text-[10px]">
                  <div className="flex items-center gap-3 font-bold text-white">
                    <Camera size={14} className="text-primary" /> {cam.name}
                  </div>
                  <div className="flex gap-4 uppercase font-display">
                    <span className="text-gray-500">Dist: {cam.dist}</span>
                    <span className="text-green-500">{cam.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Certificate Export */}
        <Card className="border-primary/10 bg-secondary/30">
          <CardHeader>
            <CardTitle className="text-xs">Generación de Certificado de Pericia</CardTitle>
            <CardDescription className="text-[10px] uppercase">Documentación oficial para presentaciones legales</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
              <Download size={32} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="text-xs text-white font-bold uppercase mb-1">Acta Judicial SPS_2026_03_30_X.pdf</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Incluye firmas digitales y hashes de integridad</p>
            </div>
            <Button className="w-full">DESCARGAR ACTA OFICIAL</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Reuse cn
function cn(...inputs: string[]) {
  return inputs.filter(Boolean).join(' ');
}

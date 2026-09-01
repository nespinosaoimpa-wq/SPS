'use client';

import React, { useEffect } from 'react';
import { RefreshCw, Shield, Home, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function OperadorErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[704 OPERADOR ERROR]', error);
  }, [error]);

  const handleResetSession = () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('704_shift_active');
        window.localStorage.removeItem('704_current_shift');
        window.location.href = '/operador';
      }
    } catch (e) {
      window.location.href = '/operador';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
      {/* Brand Header */}
      <div className="w-16 h-16 bg-zinc-900 border border-[#D4AF37]/30 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(212,175,55,0.15)] overflow-hidden">
        <img src="/logo_704.jpeg" alt="704 OS" className="w-full h-full object-cover" />
      </div>

      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37] mb-1">
        704 OS • SISTEMA OPERATIVO DE SEGURIDAD
      </span>

      <h1 className="text-2xl font-black uppercase tracking-tight text-white mb-2">
        Sincronización en Proceso
      </h1>

      <p className="text-xs text-zinc-400 font-medium max-w-xs mb-6 leading-relaxed">
        No te preocupes, tus datos de fichaje y novedades están 100% seguros. Presiona reintentar para restablecer la conexión.
      </p>

      {error?.message && (
        <div className="mb-6 p-3 bg-red-950/40 border border-red-500/20 rounded-xl max-w-xs w-full">
          <p className="text-[10px] font-mono text-red-400 break-all leading-tight">
            {error.message}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button
          onClick={() => reset()}
          className="w-full h-14 bg-[#D4AF37] hover:bg-[#b8972e] text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <RefreshCw size={16} /> Reintentar Conexión
        </Button>

        <Button
          variant="outline"
          onClick={handleResetSession}
          className="w-full h-14 bg-zinc-900 border-zinc-800 text-zinc-300 font-black uppercase tracking-widest text-xs rounded-xl hover:bg-zinc-800 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Home size={16} /> Ir al Inicio
        </Button>
      </div>

      <p className="mt-12 text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600">
        704 • GESTIÓN TÁCTICA DIGITAL
      </p>
    </div>
  );
}

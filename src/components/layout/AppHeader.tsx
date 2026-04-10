'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Search, Clock, ShieldCheck, Activity, Shield } from 'lucide-react';

export function AppHeader() {
  const pathname = usePathname();
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const isOperador = pathname?.startsWith('/operador');

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Hide on login/home
  if (pathname === '/login' || pathname === '/') return null;

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-20 h-20 bg-zinc-950/80 backdrop-blur-3xl border-b border-primary/10 z-[80] flex items-center justify-between px-6 lg:px-12 safe-top transition-all duration-500">
      <div className="flex items-center gap-6 flex-1">
        {/* Mobile Logo / Brand */}
        <div className="lg:hidden flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-900 border border-primary/20 flex items-center justify-center">
             <Shield className="text-primary" size={20} />
          </div>
        </div>

        {/* Dynamic Title */}
        <div className="hidden lg:block">
          <h1 className="text-2xl font-black text-white tracking-widest uppercase">
            {isOperador ? "Operational Terminal" : "Strategic Control Hub"}
          </h1>
          <p className="text-[8px] text-primary/60 font-mono tracking-[0.4em] uppercase mt-1">SPS Logic Layer 01</p>
        </div>
        
        {/* Search */}
        <div className="hidden lg:flex max-w-md w-full relative group ml-8 text-nowrap">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
          <input 
            placeholder="BUSCAR ACTIVOS..." 
            className="w-full h-10 pl-12 bg-white/5 border border-white/5 rounded-xl uppercase text-[10px] tracking-widest focus:outline-none focus:border-primary/20 transition-all text-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 lg:gap-8">
        {/* Tactical HUD (Desktop Only) */}
        <div className="hidden lg:flex items-center gap-6">
          <div className="flex items-center gap-3 px-4 py-2 bg-black/40 border border-white/5 rounded-xl">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono text-primary font-bold">
              {mounted ? time.toLocaleTimeString('es-AR', { hour12: false }) : '--:--:--'}
            </span>
            <span className="text-[10px] text-gray-500 font-mono">UTC-3</span>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 border border-primary/10 bg-primary/5 rounded-xl">
            <Activity className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-[9px] text-primary font-black uppercase tracking-widest">SATELLITE LINK OK</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button className="lg:hidden w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400">
            <Search size={18} />
          </button>
          <div className="relative cursor-pointer group">
            <Bell className="w-6 h-6 text-gray-500 group-hover:text-primary transition-colors" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-[9px] flex items-center justify-center font-bold text-white border-2 border-zinc-950 animate-pulse">
              3
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 border border-green-500/10 bg-green-500/5 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            <span className="text-[9px] text-green-500 font-black uppercase tracking-widest">ENCRYPTED</span>
          </div>
        </div>
      </div>
    </header>
  );
}

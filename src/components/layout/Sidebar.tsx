'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Users, Settings, LogOut, Shield,
  ClipboardList, Home, User, BookOpen,
  CheckCircle2, Package, Calculator
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { useShift } from '@/components/providers/ShiftProvider';

const adminItems = [
  { name: 'Mapa', href: '/gerente', icon: MapPin },
  { name: 'Personal', href: '/gerente/personal', icon: Users },
  { name: 'Objetivos', href: '/gerente/objetivos', icon: ClipboardList },
  { name: 'Libro', href: '/gerente/libro', icon: BookOpen },
  { name: 'Stock', href: '/gerente/inventario', icon: Package },
  { name: 'Planillas', href: '/gerente/planillas', icon: Calculator },
  { name: 'Accesos', href: '/gerente/accesos', icon: Settings },
];

const guardiaItems = [
  { name: 'Inicio', href: '/operador', icon: Home },
  { name: 'Fichaje', href: '/operador/fichaje', icon: CheckCircle2 },
  { name: 'Novedades', href: '/operador/novedades', icon: BookOpen },
  { name: 'Perfil', href: '/operador/perfil', icon: User },
];

export function Sidebar() {
  const { user, role, signOut } = useAuth();
  const pathname = usePathname();
  const { theme } = useShift();
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isGuardia = pathname?.startsWith('/operador');
  const navItems = isGuardia ? guardiaItems : adminItems;
  const mobileNavItems: any[] = [...navItems];

  if (isMobile && !isGuardia) {
    mobileNavItems.push({ name: 'Salir', onClick: () => { signOut(); window.location.href = '/login'; }, icon: LogOut });
  }

  if (!mounted) return null;
  if (pathname === '/login' || pathname === '/' || pathname === '/register' || pathname?.startsWith('/operador')) return null;

  // ============ MOBILE: Bottom Tab Bar ============
  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 h-20 z-[100] flex items-center justify-around px-2 safe-bottom border-t bg-white border-zinc-200">
        {mobileNavItems.map((item: any) => {
          const isActive = item.href && !item.onClick && (
            pathname === item.href ||
            (item.href !== '/gerente' && item.href !== '/operador' && pathname?.startsWith(item.href))
          );

          const iconEl = (
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
              isActive ? 'bg-[#D4AF37] text-black' : item.name === 'Salir' ? 'text-red-400' : 'text-zinc-400'
            )}>
              <item.icon size={20} />
            </div>
          );

          if (item.onClick) {
            return (
              <button key={item.name} onClick={item.onClick} className="flex flex-col items-center justify-center gap-1 p-2 w-full">
                {iconEl}
                <span className="text-[10px] font-semibold text-red-400">{item.name}</span>
              </button>
            );
          }

          return (
            <Link key={item.name} href={item.href} className="flex flex-col items-center justify-center gap-1 p-2 w-full">
              {iconEl}
              <span className={cn('text-[10px] font-semibold transition-colors', isActive ? 'text-[#D4AF37]' : 'text-zinc-400')}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    );
  }

  // ============ DESKTOP: Left Sidebar — always dark with gold accents ============
  return (
    <div className="fixed left-0 top-0 bottom-0 w-[220px] z-[90] flex flex-col bg-zinc-950 border-r border-white/5">

      {/* Brand */}
      <div className="p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#D4AF37] rounded-xl flex items-center justify-center shadow-lg shadow-[#D4AF37]/20">
            <Shield className="w-5 h-5 text-black" />
          </div>
          <div>
            <h2 className="text-white font-black text-sm tracking-tight">SPS 704</h2>
            <p className="text-zinc-500 text-[9px] font-semibold uppercase tracking-widest">
              {isGuardia ? 'Panel Operativo' : 'Panel de Control'}
            </p>
          </div>
        </div>

        <AnimatePresence>
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 pt-4 border-t border-white/5"
            >
              <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white/5 rounded-xl border border-white/5">
                <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-black font-black uppercase text-sm ring-2 ring-[#D4AF37]/20 shrink-0">
                  {user.email?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-white truncate">
                    {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario'}
                  </p>
                  <p className="text-[9px] text-[#D4AF37] font-bold uppercase tracking-widest">
                    {role === 'gerente' ? 'Administración' : 'Operativo'}
                  </p>
                </div>
                <button
                  onClick={() => { signOut(); window.location.href = '/login'; }}
                  className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                  title="Cerrar Sesión"
                >
                  <LogOut size={13} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 py-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/gerente' && item.href !== '/operador' && pathname?.startsWith(item.href));

          return (
            <Link key={item.name} href={item.href}>
              <div className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-semibold',
                isActive
                  ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/15'
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
              )}>
                <item.icon size={16} />
                <span>{item.name}</span>
                {isActive && <div className="ml-auto w-1 h-4 bg-[#D4AF37] rounded-full" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={() => { signOut(); window.location.href = '/login'; }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-white/5 transition-all text-sm font-semibold"
        >
          <LogOut size={16} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}

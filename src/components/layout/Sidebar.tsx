'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Users, 
  Settings,
  LogOut,
  Shield,
  ClipboardList,
  Home,
  User,
  BookOpen,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShift } from '@/components/providers/ShiftProvider';

// Admin: solo lo esencial (mapa + personal)
const adminItems = [
  { name: 'Mapa', href: '/gerente', icon: MapPin },
  { name: 'Personal', href: '/gerente/personal', icon: Users },
  { name: 'Objetivos', href: '/gerente/objetivos', icon: ClipboardList },
];

// Guardia: fichaje + novedades + libro + perfil
const guardiaItems = [
  { name: 'Inicio', href: '/operador', icon: Home },
  { name: 'Fichaje', href: '/operador/fichaje', icon: CheckCircle2 },
  { name: 'Novedades', href: '/operador/novedades', icon: BookOpen },
  { name: 'Perfil', href: '/operador/perfil', icon: User },
];

export function Sidebar() {
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

  // Prevent hydration mismatch
  if (!mounted) return null;

  // No mostrar en login
  if (pathname === '/login' || pathname === '/') return null;

  // ============ MOBILE: Bottom Tab Bar ============
  if (isMobile) {
    return (
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 h-20 z-[100] flex items-center justify-around px-2 safe-bottom border-t transition-colors",
        theme === 'dark' ? "bg-black border-white/10" : "bg-white border-gray-200"
      )}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/gerente' && item.href !== '/operador' && pathname?.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href} className="flex flex-col items-center justify-center gap-1 p-2 w-full">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                isActive 
                  ? "bg-primary text-black" 
                  : "text-gray-400"
              )}>
                <item.icon size={20} />
              </div>
              <span className={cn(
                "text-[10px] font-semibold transition-colors",
                isActive ? "text-primary" : "text-gray-400"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    );
  }

  // ============ DESKTOP: Left Sidebar ============
  return (
    <div className={cn(
      "fixed left-0 top-0 bottom-0 w-[240px] z-[90] flex flex-col transition-colors border-r",
      theme === 'dark' ? "bg-black border-white/5" : "bg-[#111] border-transparent"
    )}>
      
      {/* Brand */}
      <div className="p-6 pb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-black" />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm tracking-wide">SPS</h2>
            <p className="text-gray-500 text-[10px] font-medium">
              {isGuardia ? "Panel del Guardia" : "Panel de Control"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/gerente' && item.href !== '/operador' && pathname?.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href}>
              <div className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                isActive 
                  ? "bg-primary text-black" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}>
                <item.icon size={18} />
                <span>{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <Link href="/login" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:text-red-400 hover:bg-white/5 transition-all text-sm font-medium">
          <LogOut size={18} />
          <span>Cerrar Sesión</span>
        </Link>
      </div>
    </div>
  );
}

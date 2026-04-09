'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  ClipboardList, 
  BarChart3, 
  ShieldAlert, 
  Video, 
  LogOut,
  Shield,
  Users,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/gerente', icon: LayoutDashboard },
  { name: 'Mapa Operativo', href: '/gerente/mapa', icon: MapIcon },
  { name: 'Gestión de Personal', href: '/gerente/personal', icon: Users },
  { name: 'Inventario y Equipos', href: '/gerente/inventario', icon: Package },
  { name: 'Auditoría Comercial', href: '/gerente/auditoria', icon: ClipboardList },
  { name: 'Análisis y Riesgo', href: '/gerente/analisis', icon: BarChart3 },
  { name: 'Mapa de Riesgo', href: '/gerente/mapa-riesgo', icon: ShieldAlert },
  { name: 'Cámaras', href: '/gerente/camaras', icon: Video },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 h-full bg-secondary border-r border-primary/20 flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6 flex items-center gap-3 border-b border-primary/10">
        <div className="w-10 h-10 bg-black border border-primary flex items-center justify-center" 
             style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-primary tracking-tighter leading-none">SPS</h2>
          <p className="text-[8px] text-gray-500 uppercase tracking-widest">Tactical Command</p>
        </div>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <div className={cn(
                "group flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all relative overflow-hidden",
                isActive 
                  ? "text-primary bg-primary/5" 
                  : "text-gray-400 hover:text-primary hover:bg-primary/5"
              )}>
                {isActive && (
                  <motion.div 
                    layoutId="active-nav"
                    className="absolute left-0 top-0 w-1 h-full bg-primary"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-gray-500 group-hover:text-primary")} />
                <span className="font-display uppercase tracking-wider">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-primary/10 space-y-4">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
            RG
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold text-white truncate">Roberto Gómez</p>
            <p className="text-[10px] text-primary/70 uppercase">Gerente de Turno</p>
          </div>
        </div>
        
        <Link href="/login">
          <div className="flex items-center gap-3 px-4 py-3 text-xs text-gray-500 hover:text-red-500 transition-colors cursor-pointer uppercase font-display tracking-widest">
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </div>
        </Link>
      </div>
    </div>
  );
}

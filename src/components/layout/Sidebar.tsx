'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  Package,
  ChevronRight,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Monitor Operativo', href: '/gerente', icon: LayoutDashboard },
  { name: 'Mapa Operativo', href: '/gerente/mapa', icon: MapIcon },
  { name: 'Gestión Humana', href: '/gerente/personal', icon: Users },
  { name: 'Administración', href: '/gerente/admin-finanzas', icon: ClipboardList },
  { name: 'Inventario y Unidades', href: '/gerente/inventario', icon: Package },
  { name: 'Informes y Métricas', href: '/gerente/auditoria', icon: BarChart3 },
  { name: 'Cámaras', href: '/gerente/camaras', icon: Video },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div 
      initial={false}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      animate={{ 
        width: isExpanded ? 280 : 80,
        x: 0
      }}
      transition={{ 
        type: "spring", 
        stiffness: 250, 
        damping: 25,
        mass: 0.8
      }}
      className="fixed left-6 inset-y-6 z-50 liquid-glass rounded-[2rem] flex flex-col items-center overflow-hidden border border-white/5 refractive-edge group/dock"
    >
      {/* Brand Section */}
      <div className="py-8 flex flex-col items-center">
        <motion.div 
           animate={{ rotate: isExpanded ? [0, 90, 0] : 0 }}
           className="w-12 h-12 bg-black/80 border border-primary/40 flex items-center justify-center relative shadow-[0_0_15px_rgba(255,215,0,0.1)]" 
           style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
          <Shield className="w-6 h-6 text-primary" />
          <div className="absolute inset-0 bg-primary/10 animate-pulse pointer-events-none" />
        </motion.div>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 text-center overflow-hidden whitespace-nowrap"
            >
              <h2 className="text-xl font-black text-white tracking-widest leading-none text-nowrap">SPS BUSINESS</h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                 <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                 <p className="text-[7px] text-primary uppercase tracking-[0.4em] italic font-black">Online Workspace</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Matrix */}
      <nav className="flex-1 w-full px-4 py-8 space-y-4 flex flex-col items-center overflow-y-auto overflow-x-hidden no-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href} className="w-full">
              <motion.div 
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 transition-all relative rounded-2xl group/item",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-gray-500 hover:text-white"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-glow"
                    className="absolute inset-0 bg-primary/5 rounded-2xl border border-primary/20 shadow-[0_0_20px_rgba(255,215,0,0.05)]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                
                <div className="relative z-10 flex-shrink-0">
                  <item.icon className={cn(
                    "w-6 h-6 transition-transform group-hover/item:scale-110",
                    isActive ? "text-primary drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]" : "text-gray-600 group-hover/item:text-primary"
                  )} />
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.span 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="font-mono text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap z-10 flex-1 flex items-center justify-between"
                    >
                      {item.name}
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_rgba(255,215,0,0.8)]" />}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User Status / Profile */}
      <div className="w-full p-6 border-t border-white/5 space-y-4 flex flex-col items-center">
        <div className="relative">
           <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-primary text-xs font-black shadow-inner overflow-hidden">
             {isExpanded ? <User size={18} /> : "RG"}
             <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent pointer-events-none" />
           </div>
           <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-black rounded-full" />
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center overflow-hidden whitespace-nowrap"
            >
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Roberto Gómez</p>
              <p className="text-[8px] text-primary/70 uppercase tracking-tighter italic">Gerente Operativo</p>
              
              <Link href="/login" className="block mt-4 pt-4 border-t border-white/5 group/logout">
                <div className="flex items-center justify-center gap-2 text-[8px] text-gray-600 hover:text-red-500 transition-colors uppercase font-black tracking-[0.3em]">
                  <LogOut className="w-3 h-3 group-hover/logout:translate-x-1 transition-transform" />
                  Terminal Off
                </div>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dock Interaction Handle */}
      {!isExpanded && (
         <div className="absolute bottom-2 flex flex-col gap-1">
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <div className="w-1 h-3 rounded-full bg-white/40" />
            <div className="w-1 h-1 rounded-full bg-white/20" />
         </div>
      )}
    </motion.div>
  );
}

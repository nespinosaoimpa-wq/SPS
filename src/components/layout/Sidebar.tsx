'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Users, 
  ClipboardList, 
  Package, 
  BarChart3, 
  Video,
  Shield,
  User,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Monitor', href: '/gerente', icon: LayoutDashboard },
  { name: 'Mapa', href: '/gerente/mapa', icon: MapIcon },
  { name: 'Personal', href: '/gerente/personal', icon: Users },
  { name: 'Admin', href: '/gerente/admin-finanzas', icon: ClipboardList },
  { name: 'Inventario', href: '/gerente/inventario', icon: Package },
  { name: 'Métricas', href: '/gerente/auditoria', icon: BarChart3 },
  { name: 'Cámaras', href: '/gerente/camaras', icon: Video },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // MOBILE VIEW: FLOATING GLASS DOCK
  if (isMobile) {
    return (
      <nav className="fixed bottom-6 left-6 right-6 h-20 bg-zinc-950/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] z-[100] flex items-center justify-around px-2 shadow-2xl overflow-hidden shadow-black/50">
        {/* Active Indicator Background */}
        <div className="absolute inset-0 overflow-hidden rounded-[2.5rem] pointer-events-none">
          <div 
            className="absolute top-0 w-20 h-[1.5px] bg-primary/60 blur-[2px] transition-all duration-500" 
            style={{ 
              left: `${navItems.findIndex(item => pathname === item.href) * (100 / navItems.length) + (100 / navItems.length / 2)}%`,
              transform: 'translateX(-50%)'
            }} 
          />
        </div>

        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className="relative flex flex-col items-center justify-center p-2 group w-full"
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 relative",
                isActive 
                  ? "bg-primary text-black scale-110 shadow-[0_0_20px_rgba(244,180,0,0.4)]" 
                  : "text-zinc-500 hover:text-white"
              )}>
                <item.icon size={22} className={cn(isActive ? "animate-pulse" : "")} />
                {isActive && (
                  <motion.div 
                    layoutId="active-dot"
                    className="absolute -bottom-1.5 w-1 h-1 bg-white rounded-full"
                  />
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    );
  }

  // DESKTOP VIEW: LEFT SIDEBAR
  return (
    <motion.div 
      initial={false}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      animate={{ width: isExpanded ? 280 : 80 }}
      transition={{ type: "spring", stiffness: 250, damping: 25 }}
      className="fixed left-6 inset-y-6 z-50 liquid-glass rounded-[2rem] flex flex-col items-center overflow-hidden border border-white/5 refractive-edge group/dock"
    >
      {/* Brand Section */}
      <div className="py-8 flex flex-col items-center">
        <div className="w-12 h-12 bg-black/80 border border-primary/40 flex items-center justify-center relative shadow-[0_0_15px_rgba(255,215,0,0.1)]" 
             style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
          <Shield className="w-6 h-6 text-primary" />
        </div>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-center overflow-hidden whitespace-nowrap">
              <h2 className="text-xl font-black text-white tracking-widest text-nowrap">SPS BUSINESS</h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                 <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                 <p className="text-[7px] text-primary uppercase tracking-[0.4em] italic font-black text-nowrap">Online Workspace</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Matrix */}
      <nav className="flex-1 w-full px-4 py-8 space-y-4 flex flex-col items-center overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href} className="w-full">
              <motion.div 
                whileHover={{ x: 5 }}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 transition-all relative rounded-2xl group/item",
                  isActive ? "bg-primary/10 text-primary" : "text-gray-500 hover:text-white"
                )}
              >
                <div className="relative z-10 flex-shrink-0">
                  <item.icon size={22} className={cn(isActive ? "text-primary drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]" : "text-gray-600 group-hover/item:text-primary")} />
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-mono text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap z-10">
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User / Logout */}
      <div className="w-full p-6 border-t border-white/5 flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-primary text-xs font-black">
          {isExpanded ? <User size={18} /> : "RG"}
        </div>
        
        {isExpanded && (
          <Link href="/login" className="flex items-center gap-2 text-[8px] text-zinc-600 hover:text-red-500 uppercase font-black tracking-widest">
            <LogOut size={12} /> Salir
          </Link>
        )}
      </div>
    </motion.div>
  );
}

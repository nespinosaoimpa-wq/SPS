'use client';

import React from 'react';
import { 
  Home, 
  Shield, 
  ClipboardList, 
  Map as MapIcon, 
  User,
  Bell
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ShiftProvider } from '@/components/providers/ShiftProvider';

export default function OperadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { icon: Home, label: 'Inicio', href: '/operador' },
    { icon: ClipboardList, label: 'Rondines', href: '/operador/rondines' },
    { icon: Shield, label: 'Seguridad', href: '/operador/seguridad' },
    { icon: MapIcon, label: 'Mapa', href: '/operador/mapa' },
    { icon: User, label: 'Perfil', href: '/operador/perfil' },
  ];

  return (
    <ShiftProvider>
      <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto border-x border-primary/10 relative shadow-2xl shadow-primary/5">
        {/* Mobile Top Bar */}
        <header className="h-16 border-b border-primary/20 flex items-center justify-between px-6 sticky top-0 z-50 bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black border border-primary flex items-center justify-center" 
                 style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display font-bold text-primary tracking-tighter">SPS MOBILE</span>
          </div>
          <div className="relative">
            <Bell className="w-5 h-5 text-gray-400" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-background" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-24">
          {children}
        </main>

        {/* Bottom Tactical Navigation */}
        <nav className="h-20 bg-secondary border-t border-primary/20 flex items-center justify-around px-2 fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.label} href={item.href} className="flex-1">
                <div className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-colors",
                  isActive ? "text-primary" : "text-gray-500 hover:text-primary/70"
                )}>
                  <item.icon size={20} className={isActive ? "animate-pulse" : ""} />
                  <span className="text-[9px] uppercase font-display tracking-widest">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </ShiftProvider>
  );
}

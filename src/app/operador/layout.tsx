'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CheckCircle2, BookOpen, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShift } from '@/components/providers/ShiftProvider';

const navItems = [
  { name: 'Inicio', href: '/operador', icon: Home },
  { name: 'Fichaje', href: '/operador/fichaje', icon: CheckCircle2 },
  { name: 'Novedades', href: '/operador/novedades', icon: BookOpen },
  { name: 'Perfil', href: '/operador/perfil', icon: User },
];

export default function OperadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { theme } = useShift();

  return (
    <div className="operador-shell" style={{ paddingTop: 0, paddingLeft: 0, margin: 0 }}>
      {/* Override root layout padding for operator without using styled-jsx */}
      <style dangerouslySetInnerHTML={{ __html: `
        .operador-shell {
          margin-top: -4rem !important; /* Cancel the pt-16 from root layout main */
        }
        @media (min-width: 1024px) {
          .operador-shell {
            margin-left: -240px !important; /* Cancel the lg:pl-[240px] from root layout */
          }
        }
      ` }} />
      
      {children}

      {/* Operator Bottom Navigation */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-around px-2 border-t transition-colors safe-bottom",
        theme === 'dark' ? "bg-black border-white/10" : "bg-white border-gray-200"
      )} style={{ height: '84px', paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/operador' && pathname?.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href} className="flex flex-col items-center justify-center gap-1 p-2 w-full active:scale-95 transition-transform">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm",
                isActive 
                  ? "bg-primary text-black shadow-primary/20" 
                  : theme === 'dark' ? "text-gray-500 bg-white/5" : "text-gray-400 bg-gray-50"
              )}>
                <item.icon size={22} />
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-wider transition-colors",
                isActive ? "text-primary" : theme === 'dark' ? "text-gray-500" : "text-gray-400"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

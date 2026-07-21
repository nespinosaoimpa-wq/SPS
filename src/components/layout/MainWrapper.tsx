'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Routes that do NOT show the main manager sidebar/header
  const isMonitor = typeof window !== 'undefined' && window.location.search.includes('monitor=true');
  const isAuthOrOperatorOrHome = 
    pathname === '/' || 
    pathname === '/login' || 
    pathname === '/register' || 
    pathname?.startsWith('/operador');

  const isFullSize = isAuthOrOperatorOrHome || isMonitor;

  return (
    <main className={cn(
      "min-h-screen transition-all duration-300",
      isFullSize 
        ? "pt-0 pl-0 pb-0" // Full width/height for these pages
        : "pt-16 lg:pl-[240px] pb-24 lg:pb-0" // Standard manager layout
    )}>
      <div className="w-full h-full">
        {children}
      </div>
    </main>
  );
}

'use client';

import React from 'react';
import { 
  PlusCircle, 
  MessageSquare, 
  Video, 
  User,
  Settings,
  ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { icon: PlusCircle, label: 'Tickets', href: '/cliente' },
    { icon: MessageSquare, label: 'Mensajes', href: '/cliente/mensajes' },
    { icon: Video, label: 'Cámaras', href: '/cliente/camaras' },
    { icon: User, label: 'Mi Perfil', href: '/cliente/perfil' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto border-x border-primary/10 relative shadow-2xl shadow-primary/5">
      {/* Client Top Bar */}
      <header className="h-16 border-b border-primary/20 flex items-center justify-between px-6 sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/20 flex items-center justify-center rounded-lg border border-primary/50">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <span className="font-display font-bold text-white tracking-widest uppercase text-xs">SPS V.I.P.</span>
        </div>
        <div className="flex items-center gap-4">
          <Settings className="w-5 h-5 text-gray-400" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>

      {/* Bottom Client Navigation */}
      <nav className="h-20 bg-secondary border-t border-primary/20 flex items-center justify-around px-2 fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.label} href={item.href} className="flex-1">
              <div className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors",
                isActive ? "text-primary" : "text-gray-500 hover:text-primary/70"
              )}>
                <item.icon size={20} />
                <span className="text-[9px] uppercase font-display tracking-widest">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

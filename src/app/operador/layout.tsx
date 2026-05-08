'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, CheckCircle2, BookOpen, User, Bell, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShift } from '@/components/providers/ShiftProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

const navItems = [
  { name: 'Inicio', href: '/operador', icon: Home },
  { name: 'Novedades', href: '/operador/novedades', icon: ShieldAlert },
  { name: 'Libro', href: '/operador/libro', icon: BookOpen },
  { name: 'Buzón', href: '/operador/notificaciones', icon: Bell },
  { name: 'Perfil', href: '/operador/perfil', icon: User },
];

export default function OperadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { theme, isShiftActive } = useShift();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Add a class to the html/body to trigger the scoped CSS overrides in globals.css
    document.documentElement.classList.add('operator-mode-layout');
    return () => {
      document.documentElement.classList.remove('operator-mode-layout');
    };
  }, []);

  // Fetch unread notification count
  useEffect(() => {
    if (!user?.id) return;

    const fetchUnread = async () => {
      try {
        const res = await fetch(`/api/notifications?resource_id=${user.id}&unread_only=true`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setUnreadCount(data.length);
        }
      } catch (e) {}
    };

    fetchUnread();

    // Listen for new notifications
    const channel = supabase
      .channel(`op-notifs-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const notif = payload.new as any;
          if (notif.resource_id === user.id || notif.resource_id?.includes?.(user.id)) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Real-time listener for manager commands/messages
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`op-commands-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_notifications', filter: `receiver_id=eq.${user.id}` },
        (payload) => {
          const notif = payload.new as any;
          alert(`MESA DE CONTROL: ${notif.message}`);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <div className="operador-shell overflow-hidden min-h-screen">
      {children}

      {/* Floating SOS Button (Global) */}
      <AnimatePresence>
        {isShiftActive && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-24 right-4 z-[110]"
          >
            <Link href="/operador/novedades?type=emergencia">
              <button className="w-14 h-14 bg-red-600 text-white rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center justify-center border-4 border-white/20 animate-pulse active:scale-90 transition-transform">
                <ShieldAlert size={28} />
              </button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Operator Bottom Navigation */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-around px-2 border-t transition-colors safe-bottom",
        theme === 'dark' ? "bg-black border-white/10" : "bg-white border-gray-200"
      )} style={{ height: '84px' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/operador' && pathname?.startsWith(item.href));
          const isBuzon = item.href === '/operador/notificaciones';
          return (
            <Link key={item.name} href={item.href} className="flex flex-col items-center justify-center gap-1 p-2 w-full active:scale-95 transition-transform relative">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm relative",
                isActive 
                  ? "bg-primary text-black shadow-primary/20" 
                  : theme === 'dark' ? "text-gray-500 bg-white/5" : "text-gray-400 bg-gray-50"
              )}>
                <item.icon size={22} />
                {/* Notification badge */}
                {isBuzon && unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                    <span className="text-[8px] font-black text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  </div>
                )}
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


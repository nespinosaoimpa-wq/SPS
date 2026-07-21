'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Shield, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';

export function AppHeader() {
  const { user, role } = useAuth();
  const pathname = usePathname();
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const isGuardia = pathname?.startsWith('/operador');

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const shareData = {
      title: '704 OS',
      text: 'Plataforma de gestión táctica y seguridad privada - 704 OS',
      url: window.location.origin
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.origin);
        alert('📋 ¡Enlace copiado al portapapeles! Puedes enviarlo por WhatsApp u otro medio.');
      } catch (err) {
        alert(`Comparte este enlace: ${window.location.origin}`);
      }
    }
  };

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Hide on login/home/register and all operator routes (they have their own UI)
  const isMonitor = typeof window !== 'undefined' && window.location.search.includes('monitor=true');
  if (isMonitor || pathname === '/login' || pathname === '/' || pathname === '/register' || pathname?.startsWith('/operador')) return null;

  // Hide on desktop for admin (sidebar handles branding)
  // Show only on mobile, but HIDE on mobile if on the manager map view to save space
  const isManagerDashboard = pathname === '/gerente';

  return (
    <header className={cn(
      "fixed top-0 right-0 left-0 lg:left-[240px] h-16 bg-white/80 backdrop-blur-lg border-b border-gray-200 z-[80] items-center justify-between px-4 lg:px-8 safe-top transition-all",
      isManagerDashboard ? "hidden lg:flex" : "flex"
    )}>
      {/* Left: Mobile brand + Page context */}
      <div className="flex items-center gap-3">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200/50">
            <img src="/logo_704.jpeg" className="w-full h-full object-cover" alt="Logo 704" />
          </div>
          <span className="font-bold text-sm text-gray-900">704</span>
        </div>

        {/* Desktop: page title */}
        <div className="hidden lg:block">
          <p className="text-xs text-gray-400 font-medium">
            {mounted ? time.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Time */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
          <span className="text-sm font-semibold text-gray-700">
            {mounted ? time.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </span>
        </div>

        {/* Share Button */}
        <button 
          onClick={handleShare}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          title="Compartir enlace de la plataforma"
        >
          <Share2 className="w-5 h-5 text-gray-500" />
        </button>

        {/* Notifications */}
        <button className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <Bell className="w-5 h-5 text-gray-500" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-black text-xs font-bold uppercase ring-2 ring-white shadow-sm overflow-hidden bg-cover bg-center"
             style={user?.user_metadata?.avatar_url ? { backgroundImage: `url(${user.user_metadata.avatar_url})` } : {}}>
          {!user?.user_metadata?.avatar_url && (
            user?.email?.charAt(0) || (role === 'gerente' ? 'A' : 'G')
          )}
        </div>
      </div>
    </header>
  );
}

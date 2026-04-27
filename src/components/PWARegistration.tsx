'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export default function PWARegistration() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already running as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Register service worker
    if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('704 SW registered: ', registration);
        },
        (err) => {
          console.log('704 SW registration failed: ', err);
        }
      );
    }

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Only show banner if not dismissed recently
      const dismissed = localStorage.getItem('704_pwa_dismissed');
      if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Install outcome:', outcome);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    localStorage.setItem('704_pwa_dismissed', Date.now().toString());
  };

  // Don't show anything if already installed or no prompt available
  if (isStandalone || !showInstallBanner) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[200] animate-slide-up lg:left-auto lg:right-6 lg:bottom-6 lg:w-96">
      <div className="bg-black/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-5 border border-primary/20 flex items-center gap-4">
        <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-lg">
          <Download size={24} className="text-black" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-black uppercase tracking-tight">Instalar 704</p>
          <p className="text-gray-400 text-[10px] font-medium mt-0.5">Acceso rápido desde tu pantalla de inicio</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button 
            onClick={handleDismiss}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={16} />
          </button>
          <button 
            onClick={handleInstall}
            className="px-4 py-2 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-primary/90 transition-all shadow-lg"
          >
            Instalar
          </button>
        </div>
      </div>
    </div>
  );
}

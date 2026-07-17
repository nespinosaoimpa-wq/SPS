'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Shield } from 'lucide-react';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('704_cookie_consent');
      if (!consent) {
        setIsVisible(true);
      }
    } catch (e) {
      console.warn("localStorage inhibited:", e);
      setIsVisible(true);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem('704_cookie_consent', 'all');
    setIsVisible(false);
  };

  const acceptEssential = () => {
    localStorage.setItem('704_cookie_consent', 'essential');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-3 md:p-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="max-w-4xl mx-auto bg-gray-900/98 backdrop-blur-md text-white rounded-xl md:rounded-2xl shadow-2xl p-4 md:py-3.5 md:px-5 border border-gray-800 flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center">
        
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-primary" />
            <h3 className="font-bold text-sm md:text-sm tracking-tight">Privacidad y Cookies</h3>
          </div>
          <p className="text-xs text-gray-400 font-medium leading-relaxed">
            Utilizamos cookies esenciales para el funcionamiento de la plataforma y cookies analíticas para mejorar tu experiencia. 
            Conoce más en nuestra <Link href="/legal/privacidad" className="text-primary underline hover:text-primary/80 transition-colors">Política de Privacidad</Link>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto shrink-0">
          <Button 
            variant="outline" 
            className="w-full sm:w-auto h-9 px-4 border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white uppercase font-bold text-[9px] tracking-wider" 
            onClick={acceptEssential}
          >
            Solo Esenciales
          </Button>
          <Button 
            variant="primary" 
            className="w-full sm:w-auto h-9 px-4 bg-primary text-black hover:bg-primary/90 uppercase font-bold text-[9px] tracking-wider" 
            onClick={acceptAll}
          >
            Aceptar Todas
          </Button>
        </div>

      </div>
    </div>
  );
}

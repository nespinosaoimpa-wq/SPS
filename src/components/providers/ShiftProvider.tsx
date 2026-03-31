'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ShiftContextType {
  isShiftActive: boolean;
  shiftData: any | null;
  startShift: (data: any) => void;
  endShift: () => void;
  triggerManAlive: () => void;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export function ShiftProvider({ children }: { children: ReactNode }) {
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [shiftData, setShiftData] = useState<any | null>(null);
  
  // Man Alive state
  const [showManAliveDialog, setShowManAliveDialog] = useState(false);
  const [manAliveTimer, setManAliveTimer] = useState<NodeJS.Timeout | null>(null);
  const MAN_ALIVE_INTERVAL = 10 * 60 * 1000; // 10 minutes for Demo MVP
  
  const startShift = (data: any) => {
    setIsShiftActive(true);
    setShiftData(data);
    resetManAlive();
  };

  const endShift = () => {
    setIsShiftActive(false);
    setShiftData(null);
    if (manAliveTimer) clearTimeout(manAliveTimer);
    setShowManAliveDialog(false);
  };

  const resetManAlive = () => {
    if (manAliveTimer) clearTimeout(manAliveTimer);
    setShowManAliveDialog(false);
    
    // Set next interval
    const timer = setTimeout(() => {
      triggerManAlive();
    }, MAN_ALIVE_INTERVAL);
    
    setManAliveTimer(timer);
  };

  const triggerManAlive = () => {
    if ("vibrate" in navigator) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }
    // In a real app, we'd also play a loud alarm sound here
    setShowManAliveDialog(true);
    
    // Auto-alert to base if not confirmed in 2 minutes
    setTimeout(() => {
      // Check if dialog is still open (meaning not confirmed)
      // We would send an SOS/ManDown API call here
    }, 2 * 60 * 1000);
  };

  const confirmAlive = () => {
    // Here we could call an API: POST /api/alive/confirm
    resetManAlive();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (manAliveTimer) clearTimeout(manAliveTimer);
    };
  }, [manAliveTimer]);

  return (
    <ShiftContext.Provider value={{ isShiftActive, shiftData, startShift, endShift, triggerManAlive }}>
      {children}

      <AnimatePresence>
        {showManAliveDialog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-red-950 border-2 border-red-500 rounded-lg p-8 w-full max-w-sm text-center shadow-[0_0_50px_rgba(239,68,68,0.4)]"
            >
              <ShieldAlert className="w-24 h-24 text-red-500 mx-auto mb-6 animate-pulse" />
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">CONTROL DE PRESENCIA</h2>
              <p className="text-red-200 text-sm uppercase font-bold tracking-widest mb-8">
                Confirme su estado de alerta o se disparará alarma de Hombre Caído en Base.
              </p>
              
              <Button 
                onClick={confirmAlive}
                className="w-full h-20 bg-red-600 hover:bg-red-500 text-white text-xl font-black uppercase tracking-widest gap-3"
              >
                <Fingerprint className="w-8 h-8" />
                CONFIRMAR VIVO
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ShiftContext.Provider>
  );
}

export function useShift() {
  const context = useContext(ShiftContext);
  if (context === undefined) {
    throw new Error('useShift must be used within a ShiftProvider');
  }
  return context;
}

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
            className="fixed inset-0 z-[200] flex items-center justify-center bg-white/60 backdrop-blur-md p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white border border-gray-100 rounded-[2.5rem] p-10 w-full max-w-sm text-center shadow-2xl shadow-primary/10"
            >
              <div className="w-24 h-24 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-8 animate-bounce">
                <ShieldAlert size={48} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-3">Control de Presencia</h2>
              <p className="text-gray-500 text-sm font-medium mb-10 leading-relaxed px-4">
                Por favor, confirmá que te encontrás en tu puesto para mantener el registro de actividad.
              </p>
              
              <Button 
                onClick={confirmAlive}
                className="w-full h-16 bg-primary hover:bg-primary-dark text-black text-sm font-black uppercase tracking-widest gap-3 rounded-2xl shadow-lg shadow-primary/20"
              >
                <Fingerprint className="w-6 h-6" />
                Confirmar Presencia
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

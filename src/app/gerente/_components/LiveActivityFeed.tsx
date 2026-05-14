'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LiveActivityFeedProps {
  liveFeed: any[];
  isMobile: boolean;
}

export function LiveActivityFeed({ liveFeed, isMobile }: LiveActivityFeedProps) {
  if (isMobile) return null;

  return (
    <div className="absolute top-20 right-6 z-[40] w-72 pointer-events-none">
      <AnimatePresence>
        {liveFeed.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 pointer-events-auto"
          >
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
                 <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-100">Centro de Monitoreo</h3>
              </div>
              <span className="text-[8px] text-white/30 font-bold uppercase">Vivo</span>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar mt-3">
              {liveFeed.map((log, i) => (
                <motion.div 
                  key={log.id + i} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-3 pl-3 py-2 rounded-lg transition-colors border-l-2",
                    log.type === 'event' ? "bg-red-500/10 border-red-500/50" : "bg-zinc-800/30 border-[#D4AF37]/50"
                  )}
                >
                  <div className="flex-1">
                    <div className="flex justify-between items-start text-[8px] uppercase tracking-tighter">
                      <p className={cn("font-black", log.type === 'event' ? "text-red-400" : "text-[#D4AF37]")}>
                        {log.type === 'event' ? 'Evento Reportado' : 'U-TRACK SYNC'}
                      </p>
                      <p className="text-white/40">{new Date(log.recorded_at || log.created_at).toLocaleTimeString()}</p>
                    </div>
                    <p className="text-[9px] text-white/70 font-medium mt-1 line-clamp-2">
                      {log.type === 'event' ? log.content : `Sinc: ${log.resource_name || log.resource_id?.substring(0,8)}`}
                    </p>
                    {log.accuracy && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] font-black text-[#D4AF37] uppercase tracking-widest">Prec: {Math.round(log.accuracy)}m</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

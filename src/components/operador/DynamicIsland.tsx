'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Satellite, Activity, Zap, Wifi, WifiOff, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DynamicIslandProps {
  accuracy: number | null;
  distanceToTarget: number | null;
  syncStatus: 'online' | 'offline' | 'pending';
  lastPointTimestamp: number | null;
  isVisible: boolean;
  theme?: 'light' | 'dark';
}

export default function DynamicIsland({
  accuracy,
  distanceToTarget,
  syncStatus,
  lastPointTimestamp,
  isVisible,
  theme = 'dark',
}: DynamicIslandProps) {
  const [expanded, setExpanded] = useState(false);

  if (!isVisible) return null;

  const accuracyLevel =
    accuracy && accuracy <= 15 ? 'excellent' : accuracy && accuracy <= 50 ? 'good' : 'poor';
  const accentColor = {
    excellent: { dot: 'bg-emerald-400', text: 'text-emerald-400', ring: 'ring-emerald-400/30', glow: 'shadow-emerald-500/20' },
    good:      { dot: 'bg-amber-400',   text: 'text-amber-400',   ring: 'ring-amber-400/30',   glow: 'shadow-amber-500/20' },
    poor:      { dot: 'bg-red-400',      text: 'text-red-400',     ring: 'ring-red-400/30',     glow: 'shadow-red-500/20' },
  }[accuracyLevel];

  const secondsAgo = lastPointTimestamp ? Math.round((Date.now() - lastPointTimestamp) / 1000) : null;

  return (
    <div className="fixed top-[env(safe-area-inset-top,12px)] left-0 right-0 z-[55] flex justify-center pointer-events-none px-4 pt-2">
      <motion.div
        layout
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'pointer-events-auto cursor-pointer relative overflow-hidden',
          'bg-black/90 backdrop-blur-2xl border border-white/[0.08]',
          'shadow-2xl',
          accentColor.glow
        )}
        animate={{
          borderRadius: expanded ? 28 : 50,
          width: expanded ? 300 : 190,
          height: expanded ? 'auto' : 44,
        }}
        transition={{
          layout: { type: 'spring', damping: 28, stiffness: 350 },
          borderRadius: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
        }}
      >
        {/* Subtle ring glow */}
        <motion.div
          className={cn('absolute inset-0 rounded-[inherit] ring-1 ring-inset', accentColor.ring)}
          animate={{ opacity: expanded ? 0.6 : 0.3 }}
        />

        <AnimatePresence mode="popLayout">
          {!expanded ? (
            /* ─── COMPACT STATE ─── */
            <motion.div
              key="compact"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2.5 px-4 h-[44px]"
            >
              {/* Live dot */}
              <div className="relative">
                <div className={cn('w-2 h-2 rounded-full', accentColor.dot)} />
                <div className={cn('absolute inset-0 w-2 h-2 rounded-full animate-ping', accentColor.dot, 'opacity-50')} />
              </div>

              {/* Accuracy */}
              <span className={cn('text-[13px] font-black tabular-nums', accentColor.text)}>
                {accuracy ? `${Math.round(accuracy)}m` : '---'}
              </span>

              {/* Divider */}
              <div className="w-px h-3.5 bg-white/10" />

              {/* Sync indicator */}
              {syncStatus === 'online' ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-400/70" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-red-400/70" />
              )}

              {/* Pulse timer */}
              <span className="text-[10px] font-bold text-white/30 tabular-nums ml-auto">
                {secondsAgo !== null ? `${secondsAgo}s` : '—'}
              </span>
            </motion.div>
          ) : (
            /* ─── EXPANDED STATE ─── */
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="p-5 space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className={cn('w-2.5 h-2.5 rounded-full', accentColor.dot)} />
                    <div className={cn('absolute inset-0 rounded-full animate-ping', accentColor.dot, 'opacity-40')} />
                  </div>
                  <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.25em]">
                    Telemetría Activa
                  </span>
                </div>
                <span className="text-[9px] font-mono text-white/20">
                  SPS-704
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* GPS Accuracy */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Satellite className="w-3 h-3 text-white/30" />
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Precisión</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={cn('text-xl font-black tabular-nums', accentColor.text)}>
                      {accuracy ? accuracy.toFixed(1) : '---'}
                    </span>
                    <span className="text-[9px] font-bold text-white/20">m</span>
                  </div>
                </div>

                {/* Distance to Target */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3 h-3 text-white/30" />
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Distancia</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black tabular-nums text-blue-400">
                      {distanceToTarget ? Math.round(distanceToTarget) : '---'}
                    </span>
                    <span className="text-[9px] font-bold text-white/20">m</span>
                  </div>
                </div>

                {/* Sync Status */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Radio className="w-3 h-3 text-white/30" />
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Sync</span>
                  </div>
                  <div className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider',
                    syncStatus === 'online'  ? 'bg-emerald-500/15 text-emerald-400' :
                    syncStatus === 'pending' ? 'bg-amber-500/15 text-amber-400' :
                                               'bg-red-500/15 text-red-400'
                  )}>
                    {syncStatus === 'online' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    {syncStatus}
                  </div>
                </div>

                {/* Last Pulse */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-white/30" />
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Pulso</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-white/50">
                    {secondsAgo !== null ? `${secondsAgo}s` : 'Waiting...'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

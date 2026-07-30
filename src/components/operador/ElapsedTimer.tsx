'use client';

import React, { useState, useEffect } from 'react';

interface ElapsedTimerProps {
  startTime: Date | string;
  className?: string;
  isPaused?: boolean;
}

/**
 * Isolated timer component — only THIS component re-renders every second,
 * not the entire operator page. Extracted for performance.
 */
export default function ElapsedTimer({ startTime, className, isPaused = false }: ElapsedTimerProps) {
  const [elapsed, setElapsed] = useState('00:00:00');
  const [pausedAtDiff, setPausedAtDiff] = useState<number | null>(null);

  useEffect(() => {
    const start = new Date(startTime).getTime();

    if (isPaused) {
      if (pausedAtDiff === null) {
        setPausedAtDiff(Date.now() - start);
      }
      return;
    } else {
      setPausedAtDiff(null);
    }

    const tick = () => {
      const diff = Date.now() - start;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    };

    tick(); // immediate first render
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime, isPaused]);

  if (isPaused) {
    return (
      <span className={className}>
        {elapsed} <span className="text-red-500 text-xs font-black uppercase tracking-wider block mt-1 animate-pulse">(RELOJ PAUSADO POR ABANDONO)</span>
      </span>
    );
  }

  return <span className={className}>{elapsed}</span>;
}

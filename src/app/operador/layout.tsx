'use client';

import React from 'react';
import { ShiftProvider } from '@/components/providers/ShiftProvider';

export default function OperadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ShiftProvider>
      {children}
    </ShiftProvider>
  );
}

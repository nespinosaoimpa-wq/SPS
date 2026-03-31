import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header title="PANEL DE CONTROL ESTRATÉGICO" />
        <main className="flex-1 ml-64 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

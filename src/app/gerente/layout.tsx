import React from 'react';
import { AlarmListener } from '@/components/gerente/AlarmListener';
import PushNotificationManager from '@/components/providers/PushNotificationManager';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AlarmListener />
      <PushNotificationManager />
      {children}
    </>
  );
}

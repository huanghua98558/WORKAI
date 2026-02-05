'use client';

import React from 'react';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NotificationProvider>
      {children}
    </NotificationProvider>
  );
}

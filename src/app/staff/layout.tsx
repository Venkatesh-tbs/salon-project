'use client';

import { ReactNode } from 'react';
import { NotificationsInitializer } from '@/components/notifications-initializer';

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#07050f]">
      {/* Activates real-time notification hook for staff users */}
      <NotificationsInitializer />
      {children}
    </div>
  );
}
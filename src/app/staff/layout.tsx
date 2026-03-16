import { ReactNode } from 'react';
import { StaffSidebar } from '@/components/staff/sidebar';

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-black">
      <StaffSidebar />
      <main className="flex-1 overflow-y-auto w-full p-8 text-white">
        {children}
      </main>
    </div>
  );
}

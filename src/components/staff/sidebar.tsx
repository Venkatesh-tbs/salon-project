'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  LogOut,
} from 'lucide-react';
import { logoutFlow } from '@/firebase/auth/client-flow';
import { useRouter } from 'next/navigation';
import { NotificationsBell } from '@/components/admin/notifications-bell';

const sidebarItems = [
  {
    title: 'My Dashboard',
    href: '/staff/dashboard',
    icon: LayoutDashboard,
  },
];

export function StaffSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logoutFlow();
    router.push('/staff/login');
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r border-white/10 bg-zinc-950 px-3 py-4">
      <div className="mb-8 px-3 flex items-center justify-between">
        <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Staff Portal
        </h2>
        <NotificationsBell />
      </div>
      <nav className="flex-1 space-y-1">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-white'
                )}
                aria-hidden="true"
              />
              {item.title}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="group flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut
            className="mr-3 h-5 w-5 flex-shrink-0 text-zinc-400 group-hover:text-white"
            aria-hidden="true"
          />
          Logout
        </button>
      </div>
    </div>
  );
}

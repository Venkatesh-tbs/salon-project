'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Scissors,
  BarChart,
  CalendarMinus,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { logoutFlow } from '@/firebase/auth/client-flow';
import { useRouter } from 'next/navigation';
import { NotificationsBell } from '@/components/admin/notifications-bell';
import { useState } from 'react';

const sidebarItems = [
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Bookings',
    href: '/admin/bookings',
    icon: CalendarDays,
  },
  {
    title: 'Services',
    href: '/admin/services',
    icon: Scissors,
  },
  {
    title: 'Staff',
    href: '/admin/staff',
    icon: Users,
  },
  {
    title: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart,
  },
  {
    title: 'Leave Requests',
    href: '/admin/leave-requests',
    icon: CalendarMinus,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await logoutFlow();
    router.push('/admin/login');
  };

  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* ── MOBILE HEADER ── */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-white/10 relative z-40">
        <h2 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          BarberShop
        </h2>
        <div className="flex items-center gap-3">
          <NotificationsBell />
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="p-1 text-zinc-400 hover:text-white transition-colors"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* ── MOBILE BACKDROP ── */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* ── SIDEBAR DRAWER ── */}
      <div className={cn(
        "fixed md:static inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-white/10 bg-zinc-950 px-3 py-4 transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="hidden md:flex mb-8 px-3 items-center justify-between">
          <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            BarberShop
          </h2>
          <NotificationsBell />
        </div>
        <nav className="flex-1 space-y-1 mt-4 md:mt-0">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                className={cn(
                  'group flex items-center rounded-md px-3 py-3 md:py-2 text-sm font-medium transition-colors',
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
            className="group flex w-full items-center rounded-md px-3 py-3 md:py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut
              className="mr-3 h-5 w-5 flex-shrink-0 text-zinc-400 group-hover:text-white"
              aria-hidden="true"
            />
            Logout
          </button>
        </div>
      </div>
    </>
  );
}

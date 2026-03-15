"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Users, Settings, LogOut, Flame } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Calendar View", href: "/admin?tab=calendar", icon: Calendar },
    { name: "Clients", href: "/admin?tab=clients", icon: Users },
  ];

  return (
    <div className="flex h-screen w-64 flex-col border-r border-white/10 glass-panel p-4 justify-between transition-all">
      <div>
        <div className="flex items-center gap-3 px-4 py-4 mb-8">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-purple to-brand-pink shadow-[0_0_20px_rgba(241,7,163,0.4)]">
            <Flame className="h-5 w-5 text-white" />
            <div className="absolute inset-0 rounded-xl bg-white/20 blur-sm mix-blend-overlay"></div>
          </div>
          <span className="text-2xl font-heading font-bold tracking-tight text-white glow-text">LUXE</span>
        </div>

        <nav className="space-y-2">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? "bg-brand-purple/20 text-white shadow-[0_0_15px_rgba(123,47,247,0.2)]"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1/2 w-1 rounded-r-full bg-brand-pink shadow-[0_0_10px_#F107A3]"></div>
                )}
                <link.icon className={`h-5 w-5 transition-colors ${isActive ? "text-brand-pink drop-shadow-[0_0_8px_rgba(241,7,163,0.8)]" : "text-white/40 group-hover:text-brand-neon"}`} />
                {link.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-2">
        <Link
          href="/admin/settings"
          className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-all"
        >
          <Settings className="h-5 w-5 text-white/40 group-hover:text-white transition-colors" />
          Settings
        </Link>
        <button
          className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );
}

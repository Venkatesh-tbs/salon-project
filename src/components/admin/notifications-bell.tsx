'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Loader2, CalendarClock, XCircle, CalendarCheck } from 'lucide-react';
import { useNotifications, AppNotification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

export function NotificationsBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'BOOKING': return <CalendarCheck className="w-4 h-4 text-emerald-400" />;
      case 'CANCEL': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'RESCHEDULE': return <CalendarClock className="w-4 h-4 text-amber-400" />;
      default: return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse border border-zinc-950"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden text-left origin-top-right animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-zinc-900/50">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={() => markAllAsRead()}
                className="text-xs text-brand-neon hover:text-fuchsia-400 transition-colors flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>
          
          <div className="max-h-80 overflow-y-auto w-full">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-zinc-500 text-sm">
                No notifications yet.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map((notif: AppNotification) => (
                  <div 
                    key={notif.id} 
                    className={`flex items-start gap-3 p-4 transition-colors hover:bg-white/5 ${!notif.read ? 'bg-fuchsia-500/5' : ''}`}
                  >
                    <div className="mt-0.5 shrink-0 p-1.5 rounded-full bg-zinc-800 border border-white/5">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notif.read ? 'text-white font-medium' : 'text-zinc-300'}`}>
                        {notif.message}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!notif.read && (
                      <button 
                        onClick={() => markAsRead(notif.id)}
                        className="shrink-0 p-1 rounded hover:bg-white/10 text-zinc-400 transition-colors mt-0.5"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

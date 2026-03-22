import { useState, useEffect, useRef } from 'react';
import { ref, onValue, update, get } from 'firebase/database';
import { db } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export type NotificationType = 'BOOKING' | 'CANCEL' | 'RESCHEDULE' | 'CONFIRMED' | 'COMPLETED';

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  createdAt: number;
  read: boolean;
  staffId?: string | null;
  hiddenFor?: Record<string, boolean>; // per-user clear support
}

/**
 * Resolves the current user context from Firebase.
 * - Staff: returns their staffId (used as the userId key)
 * - Admin: returns '__admin__' as a stable key
 */
async function resolveUserContext(): Promise<{ userId: string; currentStaffId: string | null; isAdmin: boolean }> {
  if (typeof document === 'undefined') return { userId: '__admin__', currentStaffId: null, isAdmin: true };

  const rawEmail = document.cookie
    .split('; ')
    .find((r) => r.startsWith('session_email='))
    ?.split('=')[1];

  const staffEmailVal = decodeURIComponent(rawEmail || '').trim().toLowerCase();

  if (!staffEmailVal) {
    console.log('[Notifications] No session_email cookie — treating as admin');
    return { userId: '__admin__', currentStaffId: null, isAdmin: true };
  }

  const staffSnap = await get(ref(db, 'staff'));
  if (!staffSnap.exists()) {
    return { userId: '__admin__', currentStaffId: null, isAdmin: true };
  }

  let resolvedStaffId: string | null = null;
  staffSnap.forEach((child) => {
    const member = child.val();
    const memberEmail = (member.email || '').trim().toLowerCase();
    if (memberEmail === staffEmailVal) {
      resolvedStaffId = member.staffId || child.key;
      console.log('[Notifications] Resolved staffId:', resolvedStaffId);
    }
  });

  if (resolvedStaffId) {
    return { userId: resolvedStaffId, currentStaffId: resolvedStaffId, isAdmin: false };
  }

  console.log('[Notifications] No staff match — treating as admin');
  return { userId: '__admin__', currentStaffId: null, isAdmin: true };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const isFirstLoad = useRef(true);
  const seenIds = useRef(new Set<string>());
  // Store resolved user context in a ref so async functions can access it
  const userCtx = useRef<{ userId: string; currentStaffId: string | null; isAdmin: boolean } | null>(null);

  useEffect(() => {
    let unsubscribeNotifications: (() => void) | null = null;

    const setupNotifications = async () => {
      const ctx = await resolveUserContext();
      userCtx.current = ctx;
      const { userId, currentStaffId, isAdmin } = ctx;

      const notificationsRef = ref(db, 'notifications');

      unsubscribeNotifications = onValue(notificationsRef, (snapshot) => {
        if (!snapshot.exists()) {
          setNotifications([]);
          setUnreadCount(0);
          return;
        }

        const data = snapshot.val();
        let parsed: AppNotification[] = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));

        // 1. Filter by role/staffId
        parsed = parsed.filter((n) => {
          if (isAdmin) return true;
          return n.staffId === currentStaffId;
        });

        // 2. Filter out notifications this user has personally cleared (hiddenFor)
        parsed = parsed.filter((n) => !n.hiddenFor?.[userId]);

        parsed.sort((a, b) => b.createdAt - a.createdAt);

        const unread = parsed.filter((n) => !n.read).length;

        // Detect genuinely new unread notifications (not yet seen this session)
        const newItems = parsed.filter((n) => !n.read && !seenIds.current.has(n.id));
        parsed.forEach((n) => seenIds.current.add(n.id));

        if (!isFirstLoad.current) {
          const titleMap: Record<string, string> = {
            BOOKING: '📅 New Booking!',
            CANCEL: '❌ Booking Cancelled',
            RESCHEDULE: '🔄 Booking Updated',
            CONFIRMED: '✅ Booking Confirmed',
            COMPLETED: '✅ Session Complete',
          };
          newItems.forEach((n) => {
            console.log('[Notifications] Toast:', n.type, '| staffId:', n.staffId);
            toast({
              title: titleMap[n.type] ?? 'Notification',
              description: n.message,
              duration: 5000,
            });
          });
        } else {
          isFirstLoad.current = false;
          console.log('[Notifications] Initial load —', parsed.length, 'notifications registered');
        }

        setNotifications(parsed);
        setUnreadCount(unread);
      });
    };

    setupNotifications();

    return () => {
      if (unsubscribeNotifications) unsubscribeNotifications();
    };
  }, [toast]);

  const markAsRead = async (id: string) => {
    try {
      await update(ref(db, `notifications/${id}`), { read: true });
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const updates: Record<string, any> = {};
      notifications.forEach((n) => {
        if (!n.read) updates[`${n.id}/read`] = true;
      });
      if (Object.keys(updates).length > 0) {
        await update(ref(db, 'notifications'), updates);
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  /**
   * Per-user clear: marks notifications as hidden for the current user only.
   * Other users' views are completely unaffected.
   */
  const clearAll = async () => {
    if (!userCtx.current) return;
    const { userId } = userCtx.current;
    try {
      const updates: Record<string, any> = {};
      notifications.forEach((n) => {
        updates[`${n.id}/hiddenFor/${userId}`] = true;
      });
      if (Object.keys(updates).length > 0) {
        await update(ref(db, 'notifications'), updates);
      }
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, clearAll };
}

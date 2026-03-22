import { useState, useEffect } from 'react';
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
}

/**
 * Resolves the current user's staffId from Firebase.
 * Uses session_email cookie to look up staff members.
 * Returns null for admins (who have no staff entry).
 */
async function resolveCurrentStaffId(): Promise<{ staffId: string | null; isAdmin: boolean }> {
  if (typeof document === 'undefined') return { staffId: null, isAdmin: true };

  const rawEmail = document.cookie
    .split('; ')
    .find((r) => r.startsWith('session_email='))
    ?.split('=')[1];

  const staffEmailVal = decodeURIComponent(rawEmail || '').trim().toLowerCase();

  if (!staffEmailVal) {
    // No session email found — treat as admin (sees global notifications)
    console.log('[Notifications] No session_email cookie found — treating as global user');
    return { staffId: null, isAdmin: true };
  }

  const staffSnap = await get(ref(db, 'staff'));
  if (!staffSnap.exists()) {
    console.log('[Notifications] No staff node found in DB');
    return { staffId: null, isAdmin: true };
  }

  let resolvedStaffId: string | null = null;
  staffSnap.forEach((child) => {
    const member = child.val();
    const memberEmail = (member.email || '').trim().toLowerCase();
    if (memberEmail === staffEmailVal) {
      resolvedStaffId = member.staffId || child.key;
      console.log('[Notifications] Resolved staffId:', resolvedStaffId, 'for email:', staffEmailVal);
    }
  });

  if (resolvedStaffId) {
    return { staffId: resolvedStaffId, isAdmin: false };
  }

  // Email found but no matching staff record — treat as admin
  console.log('[Notifications] Email not matched in staff node — treating as admin for:', staffEmailVal);
  return { staffId: null, isAdmin: true };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    let unsubscribeNotifications: (() => void) | null = null;

    const setupNotifications = async () => {
      const { staffId: currentStaffId, isAdmin } = await resolveCurrentStaffId();

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

        // Filter logic:
        // - Admin (isAdmin=true, currentStaffId=null): sees ALL notifications (global + targeted)
        // - Staff (isAdmin=false, currentStaffId=some_id): sees global (staffId null/undefined) OR their own
        // - Backward compat: notifications without staffId are global — visible to all
        parsed = parsed.filter((n) => {
          if (isAdmin) return true; // admins see everything
          // staff see notifications where staffId is absent/null OR matches their staffId
          return !n.staffId || n.staffId === currentStaffId;
        });

        parsed.sort((a, b) => b.createdAt - a.createdAt);

        const unread = parsed.filter((n) => !n.read).length;

        setNotifications((prev) => {
          if (prev.length > 0) {
            const prevIds = new Set(prev.map((p) => p.id));
            const newItems = parsed.filter((n) => !prevIds.has(n.id) && !n.read);

            newItems.forEach((n) => {
              const titleMap: Record<string, string> = {
                BOOKING: '📅 New Booking!',
                CANCEL: '❌ Booking Cancelled',
                RESCHEDULE: '🔄 Booking Updated',
                CONFIRMED: '✅ Booking Confirmed',
                COMPLETED: '✅ Session Complete',
              };
              toast({
                title: titleMap[n.type] ?? 'Notification',
                description: n.message,
                duration: 5000,
              });
            });
          }
          return parsed;
        });

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
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const updates: Record<string, any> = {};
      notifications.forEach((n) => {
        if (!n.read) {
          updates[`${n.id}/read`] = true;
        }
      });
      if (Object.keys(updates).length > 0) {
        await update(ref(db, 'notifications'), updates);
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}

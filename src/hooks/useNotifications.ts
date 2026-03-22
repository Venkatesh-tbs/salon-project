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
  // Track whether this is the very first snapshot received
  const isFirstLoad = useRef(true);
  // Track previously seen IDs to detect newcomers across re-renders
  const seenIds = useRef(new Set<string>());

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
        // - Admin (isAdmin=true): sees ALL notifications (global + targeted)
        // - Staff (isAdmin=false): sees ONLY notifications strictly assigned to their staffId
        parsed = parsed.filter((n) => {
          if (isAdmin) return true; // admins see everything
          // staff: strict match only — global (null/undefined staffId) is NOT shown to staff
          return n.staffId === currentStaffId;
        });

        parsed.sort((a, b) => b.createdAt - a.createdAt);

        const unread = parsed.filter((n) => !n.read).length;

        // Detect new unread items not yet seen — works on first load and real-time updates
        const newItems = parsed.filter((n) => !n.read && !seenIds.current.has(n.id));
        // Update the seen-IDs registry
        parsed.forEach((n) => seenIds.current.add(n.id));

        // On first load: don't toast existing backlog — just register them as seen
        if (!isFirstLoad.current) {
          const titleMap: Record<string, string> = {
            BOOKING: '📅 New Booking!',
            CANCEL: '❌ Booking Cancelled',
            RESCHEDULE: '🔄 Booking Updated',
            CONFIRMED: '✅ Booking Confirmed',
            COMPLETED: '✅ Session Complete',
          };
          newItems.forEach((n) => {
            console.log('[Notifications] Toasting:', n.type, n.message, 'staffId:', n.staffId);
            toast({
              title: titleMap[n.type] ?? 'Notification',
              description: n.message,
              duration: 5000,
            });
          });
        } else {
          isFirstLoad.current = false;
          console.log('[Notifications] Initial load — registered', parsed.length, 'notifications, skipping backlog toasts');
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

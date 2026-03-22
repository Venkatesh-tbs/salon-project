import { useState, useEffect, useRef } from 'react';
import { ref, onValue, update, get, runTransaction } from 'firebase/database';
import { db } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';

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
 * Uses the guaranteed-unique Firebase Auth UID as the userId key.
 */
async function resolveUserContext(authUid?: string): Promise<{ userId: string; currentStaffId: string | null; isAdmin: boolean }> {
  const defaultUserId = authUid || 'unauthenticated';
  if (typeof document === 'undefined') return { userId: defaultUserId, currentStaffId: null, isAdmin: true };

  const rawEmail = document.cookie
    .split('; ')
    .find((r) => r.startsWith('session_email='))
    ?.split('=')[1];

  const staffEmailVal = decodeURIComponent(rawEmail || '').trim().toLowerCase();

  if (!staffEmailVal) {
    console.log(`[Notifications] No session_email cookie — treating as admin (${defaultUserId})`);
    return { userId: defaultUserId, currentStaffId: null, isAdmin: true };
  }

  const staffSnap = await get(ref(db, 'staff'));
  if (!staffSnap.exists()) {
    return { userId: defaultUserId, currentStaffId: null, isAdmin: true };
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
    // Both are unique, use authUid if present, fallback to staffId
    const finalUserId = authUid || resolvedStaffId;
    return { userId: finalUserId, currentStaffId: resolvedStaffId, isAdmin: false };
  }

  console.log(`[Notifications] No staff match — treating as admin (${defaultUserId})`);
  return { userId: defaultUserId, currentStaffId: null, isAdmin: true };
}

export function useNotifications() {
  const { user, loading: authLoading } = useUser();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const isFirstLoad = useRef(true);
  const seenIds = useRef(new Set<string>());
  // Store resolved user context in a ref so async functions can access it
  const userCtx = useRef<{ userId: string; currentStaffId: string | null; isAdmin: boolean } | null>(null);

  useEffect(() => {
    if (authLoading) return; // Wait for Firebase Auth to resolve the UID

    let unsubscribeNotifications: (() => void) | null = null;
    const authUid = user?.uid;

    const setupNotifications = async () => {
      const ctx = await resolveUserContext(authUid);
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
  }, [toast, user, authLoading]);

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
   * Per-user clear logic using Firebase runTransaction for 100% isolation safety.
   * Ensures we NEVER overwrite other users' hidden states, even under race conditions.
   */
  const clearAll = async () => {
    if (!userCtx.current) return;
    const { userId } = userCtx.current;
    
    try {
      await Promise.all(
        notifications.map((n) => {
          const notificationRef = ref(db, `notifications/${n.id}`);
          
          return runTransaction(notificationRef, (currentData) => {
            if (currentData === null) return currentData; // Node doesn't exist anymore
            
            console.log(`[Notifications] Clear ${n.id} | Before:`, currentData.hiddenFor);
            
            const updatedHiddenFor = {
              ...(currentData.hiddenFor || {}),
              [userId]: true
            };
            
            console.log(`[Notifications] Clear ${n.id} | After:`, updatedHiddenFor);
            
            return {
              ...currentData,
              hiddenFor: updatedHiddenFor
            };
          });
        })
      );
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, clearAll };
}

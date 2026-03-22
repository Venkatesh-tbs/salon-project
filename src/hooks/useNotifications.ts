import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export type NotificationType = 'BOOKING' | 'CANCEL' | 'RESCHEDULE';

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  createdAt: number;
  read: boolean;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const notificationsRef = ref(db, 'notifications');
    
    // Subscribe to realtime database changes
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const parsed: AppNotification[] = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));

        // Sort by newest first
        parsed.sort((a, b) => b.createdAt - a.createdAt);

        // Calculate unread
        const unread = parsed.filter((n) => !n.read).length;
        
        setNotifications((prev) => {
          // Check for new notifications to toast
          if (prev.length > 0) {
            const prevIds = new Set(prev.map(p => p.id));
            const newNotifications = parsed.filter(n => !prevIds.has(n.id) && !n.read);
            
            newNotifications.forEach(n => {
              toast({
                title: n.type === 'BOOKING' ? 'New Booking!' : n.type === 'CANCEL' ? 'Booking Cancelled' : 'Booking Updated',
                description: n.message,
                duration: 5000,
              });
            });
          }
          return parsed;
        });

        setUnreadCount(unread);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    });

    return () => unsubscribe();
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

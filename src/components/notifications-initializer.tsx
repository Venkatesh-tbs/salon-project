'use client';

import { useNotifications } from '@/hooks/useNotifications';

/**
 * Headless component — renders nothing but activates the real-time
 * useNotifications hook so that toast alerts fire for the current user.
 * Mount this anywhere inside a FirebaseClientProvider subtree.
 */
export function NotificationsInitializer() {
  useNotifications(); // Side effect: subscribes to Firebase & fires toasts
  return null;
}

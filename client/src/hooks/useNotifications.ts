/**
 * useNotifications.ts — Fetches notifications with:
 * - Initial load on mount
 * - 60-second polling interval
 * - Re-fetch on window focus
 * - markRead / markAllRead mutations
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getNotifications,
  markRead as apiMarkRead,
  markAllRead as apiMarkAllRead,
} from '../api/notifications';
import { Notification } from '../types';

interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
      setError(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Failed to load notifications';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  // 60-second polling
  useEffect(() => {
    const id = setInterval(fetchNotifs, 60_000);
    return () => clearInterval(id);
  }, [fetchNotifs]);

  // Window focus refetch
  useEffect(() => {
    const handleFocus = () => fetchNotifs();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchNotifs]);

  const markRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n))
    );
    try {
      await apiMarkRead(id);
    } catch {
      // Rollback on failure
      await fetchNotifs();
    }
  }, [fetchNotifs]);

  const markAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await apiMarkAllRead();
    } catch {
      await fetchNotifs();
    }
  }, [fetchNotifs]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch: fetchNotifs,
    markRead,
    markAllRead,
  };
}

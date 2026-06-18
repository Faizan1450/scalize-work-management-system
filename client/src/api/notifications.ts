/**
 * api/notifications.ts — Notification API functions.
 */
import api from './axios';
import { Notification } from '../types';

export async function getNotifications(unreadOnly?: boolean): Promise<Notification[]> {
  const q = unreadOnly ? '?unread=true' : '';
  const { data } = await api.get<Notification[]>(`/notifications${q}`);
  return data;
}

export async function markRead(id: string): Promise<Notification> {
  const { data } = await api.patch<Notification>(`/notifications/${id}/read`);
  return data;
}

export async function markAllRead(): Promise<void> {
  await api.patch('/notifications/read-all');
}

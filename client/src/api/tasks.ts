/**
 * api/tasks.ts — All task API functions matching the 13 server endpoints.
 * All functions throw on non-2xx (axios does this by default).
 * Callers should wrap in try/catch for error handling.
 */
import api from './axios';
import { Task } from '../types';

export interface ListTasksParams {
  assigneeId?: string;
  date?: string;
  from?: string;
  to?: string;
  isOpenTask?: boolean;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  estimatedDurationMins: number;
  dueDate: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  assigneeId?: string | null;
  isOpenTask?: boolean;
  plannedDate?: string | null;
}

export interface EditTaskPayload {
  title?: string;
  description?: string;
  estimatedDurationMins?: number;
  dueDate?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
}

// ── List / Get ─────────────────────────────────────────────────────────────────

export async function listTasks(params: ListTasksParams = {}): Promise<Task[]> {
  const query = new URLSearchParams();
  if (params.assigneeId) query.set('assigneeId', params.assigneeId);
  if (params.date) query.set('date', params.date);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.isOpenTask !== undefined) query.set('isOpenTask', String(params.isOpenTask));
  const { data } = await api.get<Task[]>(`/tasks?${query.toString()}`);
  return data;
}

export async function getTask(id: string): Promise<Task> {
  const { data } = await api.get<Task>(`/tasks/${id}`);
  return data;
}

// ── Create ─────────────────────────────────────────────────────────────────────

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const { data } = await api.post<Task>('/tasks', payload);
  return data;
}

// ── Status ─────────────────────────────────────────────────────────────────────

export async function updateStatus(
  id: string,
  status: 'not_started' | 'in_progress' | 'completed'
): Promise<Task> {
  const { data } = await api.patch<Task>(`/tasks/${id}/status`, { status });
  return data;
}

// ── Schedule ──────────────────────────────────────────────────────────────────

export async function scheduleTask(
  id: string,
  plannedDate: string,
  plannedStartTime: string
): Promise<Task> {
  const { data } = await api.patch<Task>(`/tasks/${id}/schedule`, {
    plannedDate,
    plannedStartTime,
  });
  return data;
}

// ── Move ───────────────────────────────────────────────────────────────────────

export async function moveTask(
  id: string,
  toDate: string,
  comment?: string
): Promise<Task> {
  const { data } = await api.patch<Task>(`/tasks/${id}/move`, { toDate, comment: comment ?? '' });
  return data;
}

// ── Edit ───────────────────────────────────────────────────────────────────────

export async function editTask(id: string, payload: EditTaskPayload): Promise<Task> {
  const { data } = await api.patch<Task>(`/tasks/${id}`, payload);
  return data;
}

// ── Reassign ───────────────────────────────────────────────────────────────────

export async function reassignTask(id: string, assigneeId: string): Promise<Task> {
  const { data } = await api.patch<Task>(`/tasks/${id}/assignee`, { assigneeId });
  return data;
}

// ── Delete ─────────────────────────────────────────────────────────────────────

export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/tasks/${id}`);
}

// ── Comment ────────────────────────────────────────────────────────────────────

export async function addComment(id: string, text: string): Promise<Task> {
  const { data } = await api.post<Task>(`/tasks/${id}/comments`, { text });
  return data;
}

// ── Claim open task ────────────────────────────────────────────────────────────

export async function claimOpenTask(
  id: string,
  assigneeId: string,
  overrides?: { title?: string; description?: string; dueDate?: string; plannedDate?: string }
): Promise<Task> {
  const { data } = await api.patch<Task>(`/tasks/${id}/claim-open`, {
    assigneeId,
    ...overrides,
  });
  return data;
}

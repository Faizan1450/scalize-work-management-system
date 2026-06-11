import api from './axios';
import { ApiUser } from './types';

export interface CreateUserPayload {
  name: string;
  userId: string;
  password: string;
  workSchedule: Record<string, number>;
  leadIds?: string[];
  phone?: string;
  email?: string;
  joiningDate?: string;
  designation?: string;
}

export interface UpdateUserPayload {
  name?: string;
  userId?: string;
  roles?: ('owner' | 'lead' | 'employee')[];
  workSchedule?: Record<string, number>;
  phone?: string;
  email?: string;
  joiningDate?: string;
  designation?: string;
  isActive?: boolean;
}

/** GET /api/users */
export async function listUsers(includeInactive = false): Promise<ApiUser[]> {
  const res = await api.get<ApiUser[]>('/users', {
    params: includeInactive ? { includeInactive: 'true' } : {},
  });
  return res.data;
}

/** POST /api/users */
export async function createUser(data: CreateUserPayload): Promise<ApiUser> {
  const res = await api.post<ApiUser>('/users', data);
  return res.data;
}

/** PATCH /api/users/:id */
export async function updateUser(id: string, data: UpdateUserPayload): Promise<ApiUser> {
  const res = await api.patch<ApiUser>(`/users/${id}`, data);
  return res.data;
}

/** PATCH /api/users/:id/leads */
export async function updateLeads(id: string, leadIds: string[]): Promise<ApiUser> {
  const res = await api.patch<ApiUser>(`/users/${id}/leads`, { leadIds });
  return res.data;
}

/** PATCH /api/users/:id/password */
export async function resetPassword(id: string, newPassword: string): Promise<void> {
  await api.patch(`/users/${id}/password`, { newPassword });
}

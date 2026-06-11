import api from './axios';
import { ApiUser } from './types';

export interface LoginResponse {
  token: string;
  user: ApiUser;
}

/** POST /api/auth/login — public */
export async function login(userId: string, password: string): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/login', { userId, password });
  return res.data;
}

/** GET /api/auth/me — returns fresh user from DB */
export async function me(): Promise<ApiUser> {
  const res = await api.get<ApiUser>('/auth/me');
  return res.data;
}

/** POST /api/auth/change-password — self-service */
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await api.post('/auth/change-password', { oldPassword, newPassword });
}

/**
 * AuthContext — holds the REAL logged-in user from GET /api/auth/me.
 *
 * This is SEPARATE from AppContext (mock data for Employee/Lead views).
 * Two identities in Phase 2:
 *  - authUser: real backend user (drives login, role availability, Owner view)
 *  - mockUser: Phase 1 AppContext currentUser (drives mock Employee/Lead views)
 *
 * Phase 3: these are unified. Until then, keep them cleanly separate.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ApiUser } from '../api/types';
import { login as apiLogin, me as apiMe } from '../api/auth';

const TOKEN_KEY = 'swms_token';

interface AuthContextValue {
  /** The real logged-in user (null if not authenticated) */
  authUser: ApiUser | null;
  /** True while the initial /me check is in flight */
  authLoading: boolean;
  /** Log in with userId + password. Stores token, sets authUser. */
  login: (userId: string, password: string) => Promise<void>;
  /** Clear token + authUser */
  logout: () => void;
  /** Refresh authUser from server (e.g. after role change) */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<ApiUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // On mount: check if we already have a valid token
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setAuthLoading(false);
      return;
    }
    apiMe()
      .then((user) => setAuthUser(user))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setAuthLoading(false));
  }, []);

  const login = useCallback(async (userId: string, password: string) => {
    const { token, user } = await apiLogin(userId, password);
    localStorage.setItem(TOKEN_KEY, token);
    setAuthUser(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const user = await apiMe();
    setAuthUser(user);
  }, []);

  return (
    <AuthContext.Provider value={{ authUser, authLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

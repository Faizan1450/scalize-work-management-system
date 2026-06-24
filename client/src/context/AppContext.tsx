/**
 * AppContext.tsx — Phase 3 slim version.
 *
 * Holds ONLY UI state: currentRole (for sidebar/guards) + selectedDate (for week strip).
 * All task/notification/user data lives in API hooks, NOT here.
 *
 * Correction 6: RESET_MOCK_STATE → RESET_STATE throughout.
 */
import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { AppState, AppAction, Role } from '../types';
import { useAuth } from './AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  const now = new Date();
  // IST = UTC+5:30
  const ist = new Date(now.getTime() + 330 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function deriveRoleFromPath(path: string): Role {
  if (path.startsWith('/lead')) return 'lead';
  if (path.startsWith('/owner')) return 'owner';
  return 'employee';
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: AppState = {
  currentRole: typeof window !== 'undefined' ? deriveRoleFromPath(window.location.pathname) : 'employee',
  selectedDate: todayISO(),
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ROLE':
      return { ...state, currentRole: action.role };

    case 'SET_DATE':
      return { ...state, selectedDate: action.date };

    // Correction 6: renamed from RESET_MOCK_STATE → RESET_STATE
    case 'RESET_STATE':
      return { ...initialState, selectedDate: todayISO() };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { authUser } = useAuth();

  useEffect(() => {
    if (authUser) {
      const isRoleAllowed = authUser.roles.includes(state.currentRole);
      if (!isRoleAllowed) {
        const fallbackRole = (authUser.roles[0] as Role) || 'employee';
        dispatch({ type: 'SET_ROLE', role: fallbackRole });
      }
    }
  }, [authUser, state.currentRole]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

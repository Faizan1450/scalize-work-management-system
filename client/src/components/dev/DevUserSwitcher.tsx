// DEV-ONLY: remove in Phase 2
// This component exists solely to let testers impersonate any mock user during
// Phase 1 verification. It is NOT product UI.

import React, { useState, useRef, useEffect } from 'react';
import { FlaskConical, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../ui/Avatar';
import { Role } from '../../types';

const roleDashboards: Record<Role, string> = {
  owner: '/owner/employees',
  lead: '/lead',
  employee: '/employee',
};

const roleBadgeColors: Record<Role, string> = {
  owner: 'bg-purple-100 text-purple-700',
  lead: 'bg-blue-100 text-blue-700',
  employee: 'bg-slate-100 text-slate-600',
};

export function DevUserSwitcher() {
  const { state, dispatch, currentUser } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  function switchTo(userId: string) {
    const user = state.users.find((u) => u.id === userId);
    if (!user) return;

    const firstRole = user.roles[0];

    // 1. Switch current user
    dispatch({ type: 'SET_USER', userId });
    // 2. Switch to that user's first available role
    dispatch({ type: 'SET_ROLE', role: firstRole });
    // 3. Navigate to their dashboard
    navigate(roleDashboards[firstRole]);

    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        id="dev-user-switcher-btn"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all
          ${open
            ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
            : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-dashed border-amber-300'
          }`}
        title="DEV ONLY — Switch mock user for testing"
      >
        <FlaskConical size={13} className="flex-shrink-0" />
        <span className="flex-1 text-left">DEV: Switch User</span>
        <span className="text-amber-400 font-normal text-[10px]">Phase 1</span>
      </button>

      {/* User picker panel */}
      {open && (
        <div
          id="dev-user-switcher-panel"
          className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-amber-200 rounded-xl shadow-2xl z-[200] overflow-hidden"
          style={{ minWidth: 220 }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-3 py-2 bg-amber-50 border-b border-amber-100">
            <div className="flex items-center gap-1.5">
              <FlaskConical size={11} className="text-amber-600" />
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">
                DEV — Mock User
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-5 h-5 flex items-center justify-center rounded text-amber-400 hover:text-amber-600 hover:bg-amber-100"
            >
              <X size={12} />
            </button>
          </div>

          {/* User list */}
          <div className="max-h-72 overflow-y-auto py-1">
            {state.users.map((user) => {
              const isActive = user.id === currentUser.id;
              return (
                <button
                  key={user.id}
                  id={`dev-switch-to-${user.id}`}
                  onClick={() => switchTo(user.id)}
                  disabled={isActive}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors
                    ${isActive
                      ? 'bg-amber-50 cursor-default'
                      : 'hover:bg-slate-50 cursor-pointer'
                    }`}
                >
                  <Avatar name={user.name} color={user.avatarColor} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${isActive ? 'text-amber-800' : 'text-slate-800'}`}>
                      {user.name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">@{user.userId}</p>
                  </div>
                  <div className="flex flex-col gap-0.5 items-end flex-shrink-0">
                    {user.roles.map((r) => (
                      <span
                        key={r}
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${roleBadgeColors[r]}`}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                  {isActive && (
                    <Check size={12} className="text-amber-600 flex-shrink-0 ml-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="px-3 py-1.5 border-t border-amber-100 bg-amber-50">
            <p className="text-[9px] text-amber-500 text-center">
              Switches user + role + navigates to their dashboard
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

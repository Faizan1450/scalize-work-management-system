import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Settings, Lock, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { NotificationDropdown } from './NotificationDropdown';
import { Role } from '../../types';
import { Avatar } from '../ui/Avatar';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';

const roleLabels: Record<Role, string> = {
  owner: 'Owner',
  lead: 'Lead',
  employee: 'Employee',
};

const roleBadgeColors: Record<Role, string> = {
  owner: 'bg-purple-100 text-purple-700',
  lead: 'bg-blue-100 text-blue-700',
  employee: 'bg-slate-100 text-slate-600',
};

const roleDashboardPaths: Record<Role, string> = {
  owner: '/owner/employees',
  lead: '/lead',
  employee: '/employee',
};

export function Header() {
  const { state, dispatch } = useApp();
  // FIX 2b: identity (avatar, name, @userId, roles) comes from REAL authUser, not mock
  const { authUser, logout } = useAuth();
  const navigate = useNavigate();
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const roleSwitcherRef = useRef<HTMLDivElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  // Role switcher options come from the REAL user's roles (authUser)
  const availableRoles = (authUser?.roles ?? []) as Role[];

  // Close dropdowns on outside click / Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (roleSwitcherRef.current && !roleSwitcherRef.current.contains(e.target as Node)) {
        setRoleSwitcherOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setRoleSwitcherOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  function switchRole(role: Role) {
    dispatch({ type: 'SET_ROLE', role });
    setRoleSwitcherOpen(false);
    navigate(roleDashboardPaths[role]);
  }

  function handleLogout() {
    setProfileOpen(false);
    dispatch({ type: 'RESET_STATE' });
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <>
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 z-30">
      {/* App branding */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 bg-primary-700 rounded-lg flex items-center justify-center">
          <span className="text-white text-xs font-bold">S</span>
        </div>
        <div>
          <span className="text-sm font-bold text-slate-900 tracking-tight">SWMS</span>
          <span className="text-slate-300 mx-1.5 text-xs">·</span>
          <span className="text-xs text-slate-400">SCALive</span>
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-3">
        {/* Role switcher — options from REAL authUser.roles */}
        <div ref={roleSwitcherRef} className="relative">
          <button
            id="role-switcher-btn"
            onClick={() => setRoleSwitcherOpen((v) => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              roleBadgeColors[state.currentRole]
            } border-current/20 hover:opacity-80`}
          >
            Viewing as {roleLabels[state.currentRole]}
            {availableRoles.length > 1 && <ChevronDown size={12} />}
          </button>

          {roleSwitcherOpen && availableRoles.length > 1 && (
            <div
              id="role-switcher-dropdown"
              className="absolute right-0 top-9 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden py-1"
            >
              {availableRoles.map((role) => (
                <button
                  key={role}
                  id={`switch-role-${role}-btn`}
                  onClick={() => switchRole(role)}
                  className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:bg-slate-50 ${
                    state.currentRole === role
                      ? 'text-primary-700 bg-primary-50'
                      : 'text-slate-700'
                  }`}
                >
                  {roleLabels[role]}
                  {state.currentRole === role && (
                    <span className="ml-1 text-primary-400">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <NotificationDropdown />

        {/* Profile dropdown — uses REAL authUser identity */}
        <div ref={profileRef} className="relative">
          <button
            id="profile-avatar-btn"
            onClick={() => setProfileOpen((v) => !v)}
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 transition-all"
            aria-label="Open profile menu"
            aria-expanded={profileOpen}
            aria-haspopup="true"
          >
            {/* Avatar uses real authUser name + a deterministic color from their avatarColor */}
            <Avatar name={authUser?.name ?? '?'} color={authUser?.avatarColor ?? '#1e3a5f'} size="sm" />
          </button>

          {profileOpen && (
            <div
              id="profile-dropdown"
              role="menu"
              className="absolute right-0 top-10 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
            >
              {/* User info header — real authUser */}
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900 truncate">{authUser?.name ?? '—'}</p>
                <p className="text-xs text-slate-400 truncate">@{authUser?.userId ?? '—'}</p>
                <span className={`mt-1.5 inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleBadgeColors[state.currentRole]}`}>
                  {roleLabels[state.currentRole]}
                </span>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  id="profile-view-profile-btn"
                  role="menuitem"
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                  title="Coming in Phase 3"
                  onClick={() => setProfileOpen(false)}
                >
                  <User size={13} className="text-slate-400" />
                  View Profile
                  <span className="ml-auto text-[9px] text-slate-300 font-medium">Phase 3</span>
                </button>

                <button
                  id="profile-settings-btn"
                  role="menuitem"
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                  title="Coming in Phase 3"
                  onClick={() => setProfileOpen(false)}
                >
                  <Settings size={13} className="text-slate-400" />
                  Settings
                  <span className="ml-auto text-[9px] text-slate-300 font-medium">Phase 3</span>
                </button>

                <button
                  id="profile-change-password-btn"
                  role="menuitem"
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                  onClick={() => { setProfileOpen(false); setChangePasswordOpen(true); }}
                >
                  <Lock size={13} className="text-slate-400" />
                  Change Password
                </button>
              </div>

              {/* Logout */}
              <div className="border-t border-slate-100 py-1">
                <button
                  id="profile-logout-btn"
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={13} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
    <ChangePasswordModal isOpen={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </>
  );
}

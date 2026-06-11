import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GitBranch,
  Inbox,
  CalendarOff,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui/Avatar';
import { DevUserSwitcher } from '../dev/DevUserSwitcher';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

export function Sidebar() {
  const { state } = useApp();
  // FIX 2b: sidebar identity (avatar, name, @userId) from REAL authUser
  const { authUser } = useAuth();

  const employeeLinks: NavItem[] = [
    { to: '/employee', icon: <LayoutDashboard size={16} />, label: 'My Day' },
  ];

  const leadLinks: NavItem[] = [
    { to: '/lead', icon: <Users size={16} />, label: 'Team' },
  ];

  const ownerLinks: NavItem[] = [
    { to: '/owner/employees', icon: <Users size={16} />, label: 'Employees' },
    { to: '/owner/hierarchy', icon: <GitBranch size={16} />, label: 'Hierarchy' },
    { to: '/owner/open-tasks', icon: <Inbox size={16} />, label: 'Open Tasks' },
    { to: '/owner/leaves', icon: <CalendarOff size={16} />, label: 'Leave Requests' },
  ];

  let navLinks: NavItem[] = [];
  if (state.currentRole === 'employee') navLinks = employeeLinks;
  else if (state.currentRole === 'lead') navLinks = leadLinks;
  else if (state.currentRole === 'owner') navLinks = ownerLinks;

  return (
    <aside className="w-56 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 h-full">
      {/* Real user profile — authUser identity */}
      <div className="p-4 border-b border-slate-100">
        <Avatar
          name={authUser?.name ?? '?'}
          color={authUser?.avatarColor ?? '#1e3a5f'}
          size="md"
          showName
        />
        <p className="text-[11px] text-slate-400 mt-1 ml-11">@{authUser?.userId ?? '—'}</p>
      </div>

      {/* Navigation — driven by currentRole (mock view selector) */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navLinks.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/employee' || item.to === '/lead'}
            id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            className={({ isActive }) =>
              isActive ? 'sidebar-link-active' : 'sidebar-link'
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer — DEV user switcher (mock data identity only) */}
      <div className="p-3 border-t border-slate-100">
        <DevUserSwitcher />
      </div>
    </aside>
  );
}

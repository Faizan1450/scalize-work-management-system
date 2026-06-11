import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Users, UserCheck, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

interface RoleCard {
  role: Role;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  iconBg: string;
  navigateTo: string;
}

const roleCards: RoleCard[] = [
  {
    role: 'employee',
    label: 'Employee',
    description: 'Plan your day, manage tasks, and track your progress on the timeline.',
    icon: <UserCheck size={28} />,
    color: 'hover:border-slate-400',
    iconBg: 'bg-slate-100 text-slate-600',
    navigateTo: '/employee',
  },
  {
    role: 'lead',
    label: 'Lead',
    description: 'Monitor team occupancy, assign tasks, and view member progress.',
    icon: <Users size={28} />,
    color: 'hover:border-blue-400',
    iconBg: 'bg-blue-50 text-blue-600',
    navigateTo: '/lead',
  },
  {
    role: 'owner',
    label: 'Owner',
    description: 'Manage employees, configure hierarchy, handle open tasks and leaves.',
    icon: <Briefcase size={28} />,
    color: 'hover:border-purple-400',
    iconBg: 'bg-purple-50 text-purple-600',
    navigateTo: '/owner/employees',
  },
];

export function RoleSelect() {
  const { dispatch } = useApp();
  const { authUser, logout } = useAuth();
  const navigate = useNavigate();

  // Phase 2: roles come from the REAL logged-in user (authUser), not mock data.
  // Employee/Lead views still use mock data from AppContext internally.
  const availableRoleCards = roleCards.filter((rc) =>
    authUser?.roles.includes(rc.role)
  );

  function handleSelect(card: RoleCard) {
    dispatch({ type: 'SET_ROLE', role: card.role });
    navigate(card.navigateTo);
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-14 h-14 bg-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-white text-2xl font-black">S</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          SWMS — SCALive Work Management
        </h1>
        <p className="text-sm text-slate-500">
          Signed in as{' '}
          <span className="font-semibold text-slate-700">{authUser?.name}</span>
          {' '}·{' '}
          <span className="text-slate-400">@{authUser?.userId}</span>
        </p>
      </div>

      {/* Role selection */}
      <div className="mb-6 text-center">
        <p className="text-sm font-medium text-slate-500">Continue as</p>
      </div>

      <div className="flex gap-5 flex-wrap justify-center max-w-2xl w-full">
        {availableRoleCards.map((card) => (
          <button
            key={card.role}
            id={`role-card-${card.role}`}
            onClick={() => handleSelect(card)}
            className={`
              flex-1 min-w-52 max-w-64 bg-white border-2 border-slate-200 rounded-2xl p-6
              text-left cursor-pointer transition-all duration-200
              hover:shadow-lg ${card.color} hover:-translate-y-0.5
              focus:outline-none focus:ring-2 focus:ring-primary-700/30
            `}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${card.iconBg}`}>
              {card.icon}
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1.5">{card.label}</h2>
            <p className="text-xs text-slate-500 leading-relaxed">{card.description}</p>
          </button>
        ))}
      </div>

      {/* Logout */}
      <button
        id="role-select-logout-btn"
        onClick={handleLogout}
        className="mt-10 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        <LogOut size={13} />
        Sign out
      </button>

      <p className="text-xs text-slate-400 mt-4">
        SCALive · Phase 2 — Internal Use Only
      </p>
    </div>
  );
}

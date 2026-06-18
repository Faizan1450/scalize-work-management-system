import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { useApp } from '../context/AppContext';
import { Role } from '../types';

const rolePrefixes: Record<Role, string> = {
  employee: '/employee',
  lead: '/lead',
  owner: '/owner',
};

const roleDashboards: Record<Role, string> = {
  employee: '/employee',
  lead: '/lead',
  owner: '/owner/employees',
};

export function AppShell() {
  const { state } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const expectedPrefix = rolePrefixes[state.currentRole];
    if (!location.pathname.startsWith(expectedPrefix)) {
      navigate(roleDashboards[state.currentRole], { replace: true });
    }
  }, [state.currentRole, location.pathname, navigate]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}


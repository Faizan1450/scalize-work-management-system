import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppShell } from './pages/AppShell';
import { RoleSelect } from './pages/RoleSelect';
import { Login } from './pages/Login';
import { EmployeeDashboard } from './pages/employee/EmployeeDashboard';
import { LeadDashboard } from './pages/lead/LeadDashboard';
import { TeamMemberDetail } from './pages/lead/TeamMemberDetail';
import { EmployeeManagement } from './pages/owner/EmployeeManagement';
import { HierarchyConfig } from './pages/owner/HierarchyConfig';
import { OpenTaskQueue } from './pages/owner/OpenTaskQueue';
import { LeaveRequests } from './pages/owner/LeaveRequests';

/**
 * ProtectedRoute — redirects to /login if authUser is null (not authenticated).
 * Shows nothing while initial auth check is in flight.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authUser, authLoading } = useAuth();
  if (authLoading) return null;
  if (!authUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/**
 * FIX 2b — RoleGuard: ensures authUser actually holds the required role.
 * This is the CLIENT-SIDE gate. The API always enforces the real rule (403).
 *
 * authUser.roles decides WHETHER a route is accessible.
 * state.currentRole decides WHICH view is shown (AppShell redirect).
 *
 * Without this, an employee-only user who types /owner/employees in the
 * address bar would pass ProtectedRoute, hit the API with a 403, get the
 * silent-catch empty state, and see "No employees yet" instead of a redirect.
 */
function RoleGuard({
  requiredRole,
  children,
}: {
  requiredRole: 'owner' | 'lead' | 'employee';
  children: React.ReactNode;
}) {
  const { authUser } = useAuth();
  if (!authUser?.roles.includes(requiredRole)) {
    // Redirect to role-select so the user picks what they can access
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* AppProvider holds shared app state (role, selectedDate) — Employee/Lead views use real API data since Phase 3 */}
        <AppProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Protected */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <RoleSelect />
                </ProtectedRoute>
              }
            />

            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              {/* Employee */}
              <Route path="/employee" element={<EmployeeDashboard />} />

              {/* Lead */}
              <Route
                path="/lead"
                element={
                  <RoleGuard requiredRole="lead">
                    <LeadDashboard />
                  </RoleGuard>
                }
              />
              <Route
                path="/lead/member/:id"
                element={
                  <RoleGuard requiredRole="lead">
                    <TeamMemberDetail />
                  </RoleGuard>
                }
              />

              {/* Owner — real API; requires authUser.roles.includes('owner') */}
              <Route path="/owner" element={<Navigate to="/owner/employees" replace />} />
              <Route
                path="/owner/employees"
                element={
                  <RoleGuard requiredRole="owner">
                    <EmployeeManagement />
                  </RoleGuard>
                }
              />
              <Route
                path="/owner/hierarchy"
                element={
                  <RoleGuard requiredRole="owner">
                    <HierarchyConfig />
                  </RoleGuard>
                }
              />
              <Route
                path="/owner/open-tasks"
                element={
                  <RoleGuard requiredRole="owner">
                    <OpenTaskQueue />
                  </RoleGuard>
                }
              />
              <Route
                path="/owner/leaves"
                element={
                  <RoleGuard requiredRole="owner">
                    <LeaveRequests />
                  </RoleGuard>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

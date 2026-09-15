
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth, type UserRole } from './contexts/auth';
import { AppShell } from './components/layout/AppShell';
import { CreateTicket } from './pages/CreateTicket';
import { MyTickets } from './pages/MyTickets';
import { RequesterTicketDetail } from './pages/RequesterTicketDetail';
import { Login } from './pages/Login';
import { ChangePassword } from './pages/ChangePassword';
import { StaffTicketQueue } from './pages/StaffTicketQueue';
import { StaffTicketDetail } from './pages/StaffTicketDetail';
import { UserManagement } from './pages/UserManagement';
import { ForbiddenPage, NotFoundPage } from './pages/RouteStates';
import { getHomePath } from './utils/navigation';
import './App.css';

function GuardLoading() {
  return <main className="container py-5 text-center"><h1>Loading...</h1></main>;
}

function ProtectedShell() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <GuardLoading />;
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
          notice: 'Your session has expired. Please sign in again.',
        }}
      />
    );
  }
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  return <AppShell />;
}

function PasswordChangeAccess() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <GuardLoading />;
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
          notice: 'Your session has expired. Please sign in again.',
        }}
      />
    );
  }
  return <ChangePassword />;
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <GuardLoading />;
  if (user) return <Navigate to={user.mustChangePassword ? '/change-password' : getHomePath(user.role)} replace />;
  return <>{children}</>;
}

function RoleGuard({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { user } = useAuth();

  if (!user) return null;
  if (!roles.includes(user.role)) return <ForbiddenPage homePath={getHomePath(user.role)} />;
  return <>{children}</>;
}

function HomeRedirect() {
  const { user } = useAuth();
  return user ? <Navigate to={getHomePath(user.role)} replace /> : null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/change-password" element={<PasswordChangeAccess />} />
          <Route path="/app" element={<ProtectedShell />}>
            <Route index element={<HomeRedirect />} />
          </Route>
          <Route path="/" element={<ProtectedShell />}>
            <Route index element={<HomeRedirect />} />

            <Route path="tickets" element={<RoleGuard roles={['REQUESTER']}><MyTickets /></RoleGuard>} />
            <Route path="tickets/new" element={<RoleGuard roles={['REQUESTER']}><CreateTicket /></RoleGuard>} />
            <Route path="tickets/create" element={<RoleGuard roles={['REQUESTER']}><Navigate to="/tickets/new" replace /></RoleGuard>} />
            <Route path="tickets/:id" element={<RoleGuard roles={['REQUESTER']}><RequesterTicketDetail /></RoleGuard>} />

            <Route path="staff/tickets" element={<RoleGuard roles={['IT_STAFF', 'ADMINISTRATOR']}>
              <StaffTicketQueue />
            </RoleGuard>} />
            <Route path="staff/tickets/:id" element={<RoleGuard roles={['IT_STAFF', 'ADMINISTRATOR']}>
              <StaffTicketDetail />
            </RoleGuard>} />
            <Route path="admin/users" element={<RoleGuard roles={['ADMINISTRATOR']}>
              <UserManagement />
            </RoleGuard>} />

            <Route path="*" element={<NotFoundPage homePath="/" />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

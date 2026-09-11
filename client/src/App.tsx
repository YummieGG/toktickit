
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { RequesterProvider } from './contexts/RequesterContext';
import { AppShell } from './components/layout/AppShell';
import { RequesterSelect } from './pages/RequesterSelect';
import { CreateTicket } from './pages/CreateTicket';
import { MyTickets } from './pages/MyTickets';
import { RequesterTicketDetail } from './pages/RequesterTicketDetail';
import { Login } from './pages/Login';
import { ChangePassword } from './pages/ChangePassword';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';

function GuardLoading() {
  return <main className="container py-5 text-center"><h1>Loading...</h1></main>;
}

function AuthenticatedLegacyRoute({ children }: { children: ReactNode }) {
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
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RequesterProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/" element={<AuthenticatedLegacyRoute><AppShell /></AuthenticatedLegacyRoute>}>
              <Route index element={<RequesterSelect />} />
              <Route path="tickets" element={<MyTickets />} />
              <Route path="tickets/create" element={<CreateTicket />} />
              <Route path="tickets/:id" element={<RequesterTicketDetail />} />
            </Route>
          </Routes>
        </RequesterProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

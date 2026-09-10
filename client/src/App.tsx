
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RequesterProvider } from './contexts/RequesterContext';
import { AppShell } from './components/layout/AppShell';
import { RequesterSelect } from './pages/RequesterSelect';
import { CreateTicket } from './pages/CreateTicket';
import { MyTickets } from './pages/MyTickets';
import { RequesterTicketDetail } from './pages/RequesterTicketDetail';
import { Login } from './pages/Login';
import { ChangePassword } from './pages/ChangePassword';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RequesterProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/" element={<AppShell />}>
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

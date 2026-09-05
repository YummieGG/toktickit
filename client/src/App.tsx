
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RequesterProvider } from './contexts/RequesterContext';
import { AppShell } from './components/layout/AppShell';
import { RequesterSelect } from './pages/RequesterSelect';
import { CreateTicket } from './pages/CreateTicket';
import { MyTickets } from './pages/MyTickets';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <RequesterProvider>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<RequesterSelect />} />
            <Route path="tickets" element={<MyTickets />} />
            <Route path="tickets/create" element={<CreateTicket />} />
            <Route
              path="tickets/:id"
              element={
                <div className="card shadow-sm p-4 text-center mt-4" style={{ borderColor: 'var(--surface-border)' }}>
                  <h2 className="mb-2">Ticket Detail</h2>
                  <p className="mb-0" style={{ color: 'var(--text-secondary)' }}>
                    Ticket detail view will be implemented in Issue #16.
                  </p>
                </div>
              }
            />
          </Route>
        </Routes>
      </RequesterProvider>
    </BrowserRouter>
  );
}

export default App;

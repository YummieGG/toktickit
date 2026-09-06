
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RequesterProvider } from './contexts/RequesterContext';
import { AppShell } from './components/layout/AppShell';
import { RequesterSelect } from './pages/RequesterSelect';
import { CreateTicket } from './pages/CreateTicket';
import { MyTickets } from './pages/MyTickets';
import { RequesterTicketDetail } from './pages/RequesterTicketDetail';
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
            <Route path="tickets/:id" element={<RequesterTicketDetail />} />
          </Route>
        </Routes>
      </RequesterProvider>
    </BrowserRouter>
  );
}

export default App;

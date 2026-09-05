
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RequesterProvider } from './contexts/RequesterContext';
import { AppShell } from './components/layout/AppShell';
import { RequesterSelect } from './pages/RequesterSelect';
import { CreateTicket } from './pages/CreateTicket';
import './App.css';

// Placeholder for future phases
const TicketsPlaceholder = () => (
  <div className="text-center mt-5">
    <p className="text-muted">You are now logged in to the development context.</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <RequesterProvider>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<RequesterSelect />} />
            {/* Future routes will go here */}
            <Route path="tickets" element={<TicketsPlaceholder />} />
            <Route path="tickets/create" element={<CreateTicket />} />
          </Route>
        </Routes>
      </RequesterProvider>
    </BrowserRouter>
  );
}

export default App;

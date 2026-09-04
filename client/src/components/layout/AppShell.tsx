import React, { useState } from 'react';
import { Outlet, useNavigate, Link, NavLink } from 'react-router-dom';
import { useRequester } from '../../contexts/RequesterContext';
import { Button } from '../ui/Button';

export const AppShell: React.FC = () => {
  const { requester, setRequester } = useRequester();
  const navigate = useNavigate();
  
  const [isNavOpen, setIsNavOpen] = useState(false);

  const handleChangeRequester = () => {
    setRequester(null);
    navigate('/');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link ${isActive ? 'fw-bold text-white' : 'text-light'}`;
    
  // Inline style for specific brand color from ui-spec.md
  const headerStyle = {
    backgroundColor: '#006B3C'
  };

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <nav className="navbar navbar-expand-md navbar-dark shadow-sm" style={headerStyle}>
        <div className="container">
          <Link className="navbar-brand fw-bold text-white" to={requester ? '/tickets' : '/'}>
            TokTickIT
          </Link>
          
          {requester && (
            <>
              <button 
                className="navbar-toggler" 
                type="button" 
                onClick={() => setIsNavOpen(!isNavOpen)}
                aria-controls="navbarNav" 
                aria-expanded={isNavOpen} 
                aria-label="Toggle navigation"
              >
                <span className="navbar-toggler-icon"></span>
              </button>

              <div className={`collapse navbar-collapse ${isNavOpen ? 'show' : ''}`} id="navbarNav">
                <ul className="navbar-nav me-auto">
                  <li className="nav-item">
                    <NavLink to="/tickets" className={navLinkClass}>
                      My Tickets
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink to="/tickets/create" className={navLinkClass}>
                      Create Ticket
                    </NavLink>
                  </li>
                </ul>

                <div className="d-flex align-items-center mt-2 mt-md-0">
                  <span className="text-white me-3">
                    Logged in as: {requester.name}
                  </span>
                  <Button 
                    variant="tertiary"
                    onClick={handleChangeRequester}
                    className="btn-sm"
                    style={{ color: 'rgba(255,255,255,0.9)', outlineColor: 'rgba(255,255,255,0.5)' }} // Override for dark background
                  >
                    Change Requester
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* Warning banner as required by AC */}
      <div className="bg-warning text-dark text-center py-1 fw-bold fs-6 shadow-sm">
        ⚠️ This is for testing only, not actual authentication
      </div>

      <main className="flex-grow-1 container py-4">
        <Outlet />
      </main>
      
      <footer className="bg-white text-center py-3 text-muted border-top">
        <small>© 2026 TokTickIT. Lab 2 Requester Ticketing MVP.</small>
      </footer>
    </div>
  );
};

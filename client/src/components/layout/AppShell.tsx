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
    `nav-link px-2 px-lg-3 py-1 rounded-pill text-nowrap transition ${isActive ? 'fw-bold text-white shadow-sm' : 'text-white-50'}`;

  const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
    backgroundColor: isActive ? '#0B7A46' : 'transparent',
  });
    
  // Inline style for specific brand color from ui-spec.md
  const headerStyle = {
    backgroundColor: '#006B3C'
  };

  return (
    <div className="d-flex flex-column min-vh-100" style={{ backgroundColor: 'var(--page-background)' }}>
      <nav className="navbar navbar-expand-md navbar-dark shadow-sm" style={headerStyle}>
        <div className="container">
          <Link className="navbar-brand fw-bold text-white text-nowrap me-3" to={requester ? '/tickets' : '/'}>
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
                <ul className="navbar-nav me-auto gap-1 my-2 my-md-0">
                  <li className="nav-item">
                    <NavLink to="/tickets" end className={navLinkClass} style={navLinkStyle}>
                      My Tickets
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink to="/tickets/create" className={navLinkClass} style={navLinkStyle}>
                      Create Ticket
                    </NavLink>
                  </li>
                </ul>

                <div className="d-flex align-items-center ms-md-auto gap-2 my-2 my-md-0 text-nowrap">
                  <span className="text-white text-nowrap" style={{ fontSize: '0.875rem' }}>
                    Logged in as: {requester.name}
                  </span>
                  <Button 
                    variant="tertiary"
                    onClick={handleChangeRequester}
                    className="btn-sm text-white text-nowrap px-2 py-0"
                    style={{ color: '#ffffff', textDecoration: 'underline', fontSize: '0.85rem' }}
                  >
                    Change Requester
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* Warning banner as required by AC & ui-spec.md */}
      <div
        className="text-center py-2 fw-semibold fs-6 shadow-sm border-bottom"
        style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)', borderColor: '#FFE0B2' }}
      >
        ⚠️ This is for testing only, not actual authentication
      </div>

      <main className="flex-grow-1 container py-4" style={{ maxWidth: '1140px' }}>
        <Outlet />
      </main>
      
      <footer
        className="text-center py-3 border-top"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--surface-border)', color: 'var(--text-secondary)' }}
      >
        <small>© 2026 TokTickIT. Lab 2 Requester Ticketing MVP.</small>
      </footer>
    </div>
  );
};

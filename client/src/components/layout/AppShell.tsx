import React, { useState } from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { ROLE_LABELS, useAuth } from '../../contexts/auth';
import { Button } from '../ui/Button';

export const AppShell: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) return null;

  const isRequester = user.role === 'REQUESTER';
  const isStaff = user.role === 'IT_STAFF';
  const isAdministrator = user.role === 'ADMINISTRATOR';

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      navigate('/login', { replace: true });
    }
  };

  const closeNavigation = () => setIsNavOpen(false);

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
      <nav className="navbar navbar-expand-lg navbar-dark shadow-sm" style={headerStyle}>
        <div className="container">
          <Link className="navbar-brand fw-bold text-white text-nowrap me-3" to="/">
            TokTickIT
          </Link>

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
                  {isRequester && <>
                    <li className="nav-item">
                      <NavLink to="/tickets" end className={navLinkClass} style={navLinkStyle} onClick={closeNavigation}>
                        My Tickets
                      </NavLink>
                    </li>
                    <li className="nav-item">
                      <NavLink to="/tickets/new" className={navLinkClass} style={navLinkStyle} onClick={closeNavigation}>
                        Create Ticket
                      </NavLink>
                    </li>
                  </>}
                  {isStaff && <li className="nav-item">
                    <NavLink to="/staff/tickets" className={navLinkClass} style={navLinkStyle} onClick={closeNavigation}>
                      Staff Queue
                    </NavLink>
                  </li>}
                  {isAdministrator && <>
                    <li className="nav-item">
                      <NavLink to="/admin/users" className={navLinkClass} style={navLinkStyle} onClick={closeNavigation}>
                        User Management
                      </NavLink>
                    </li>
                    <li className="nav-item">
                      <NavLink to="/staff/tickets" className={navLinkClass} style={navLinkStyle} onClick={closeNavigation}>
                        Ticket Queue
                      </NavLink>
                    </li>
                  </>}
                </ul>

                <div className="d-flex align-items-center ms-md-auto gap-2 my-2 my-md-0 text-nowrap">
                  <span className="text-white text-nowrap" style={{ fontSize: '0.875rem' }} aria-label="Current user">
                    {user.name} · {user.email} · {ROLE_LABELS[user.role]}
                  </span>
                  <Link
                    to="/change-password"
                    className="btn btn-zen-tertiary btn-sm text-white text-nowrap px-2 py-0"
                    style={{ color: '#ffffff', textDecoration: 'underline', fontSize: '0.85rem' }}
                    onClick={closeNavigation}
                  >
                    Change Password
                  </Link>
                  <Button
                    variant="tertiary"
                    onClick={() => void handleLogout()}
                    isLoading={isLoggingOut}
                    className="btn-sm text-white text-nowrap px-2 py-0"
                    style={{ color: '#ffffff', textDecoration: 'underline', fontSize: '0.85rem' }}
                  >
                    Logout
                  </Button>
                </div>
              </div>
            </>
        </div>
      </nav>

      <main className="flex-grow-1 container py-4" style={{ maxWidth: '1140px' }}>
        <Outlet />
      </main>
      
      <footer
        className="text-center py-3 border-top"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--surface-border)', color: 'var(--text-secondary)' }}
      >
        <small>© 2026 TokTickIT. Authenticated Support Portal.</small>
      </footer>
    </div>
  );
};

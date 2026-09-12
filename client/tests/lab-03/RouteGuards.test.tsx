import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';

type Role = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';

function userFor(role: Role) {
  return {
    id: role === 'REQUESTER' ? 1 : role === 'IT_STAFF' ? 2 : 3,
    name: `${role} User`,
    email: `${role.toLowerCase()}@example.com`,
    role,
    isActive: true,
    mustChangePassword: false,
  };
}

function authenticatedFetch(role: Role) {
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url === '/api/auth/me') {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: userFor(role) }) });
    }
    if (url === '/api/categories') {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: [] }) });
    }
    if (url.startsWith('/api/tickets')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          data: [],
          pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
        }),
      });
    }
    if (url === '/api/auth/logout') {
      return Promise.resolve({ ok: true, status: 204, json: async () => ({}) });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
}

describe('Issue #40 route guards and authenticated shell', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('redirects an unauthenticated protected route without loading protected data', async () => {
    window.history.pushState({}, '', '/tickets/new');
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } }),
    });

    render(<App />);

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
    expect(screen.getByText('Your session has expired. Please sign in again.')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/me', { credentials: 'include' });
  });

  it('shows safe Access Denied when IT staff opens a requester-only route', async () => {
    window.history.pushState({}, '', '/tickets/new');
    global.fetch = authenticatedFetch('IT_STAFF');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Access Denied' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Create New Ticket' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Staff Queue' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My Tickets' })).not.toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('shows safe Access Denied when a requester opens an administrator route', async () => {
    window.history.pushState({}, '', '/admin/users');
    global.fetch = authenticatedFetch('REQUESTER');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Access Denied' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'User Management' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My Tickets' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Staff Queue' })).not.toBeInTheDocument();
  });

  it('uses requester session identity without a selector or requesterId', async () => {
    window.history.pushState({}, '', '/');
    global.fetch = authenticatedFetch('REQUESTER');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'My Tickets' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/tickets');
    expect(screen.getByLabelText('Current user')).toHaveTextContent('REQUESTER User');
    expect(screen.queryByRole('button', { name: 'Change Requester' })).not.toBeInTheDocument();
    const urls = vi.mocked(global.fetch).mock.calls.map(call => String(call[0]));
    expect(urls).not.toContain('/api/requesters');
    expect(urls.some(url => url.includes('requesterId'))).toBe(false);
  });

  it('blocks normal routes and redirects to /change-password when user must change password', async () => {
    window.history.pushState({}, '', '/tickets');
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/auth/me') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            data: { ...userFor('REQUESTER'), mustChangePassword: true },
          }),
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Change your password' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/change-password');
    expect(screen.queryByRole('heading', { name: 'My Tickets' })).not.toBeInTheDocument();
  });

  it('shows safe Access Denied when administrator opens a requester-only route', async () => {
    window.history.pushState({}, '', '/tickets/new');
    global.fetch = authenticatedFetch('ADMINISTRATOR');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Access Denied' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Create New Ticket' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'User Management' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create Ticket' })).not.toBeInTheDocument();
  });

  it('logs out with credentials and returns to Login', async () => {
    window.history.pushState({}, '', '/staff/tickets');
    global.fetch = authenticatedFetch('IT_STAFF');

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Logout' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }));
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });
});

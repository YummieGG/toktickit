import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';

const activeUser = {
  id: 1,
  name: 'Somchai Prasert',
  email: 'somchai.p@example.com',
  role: 'REQUESTER',
  isActive: true,
  mustChangePassword: false,
};

describe('Issue #39 Login screen', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, '', '/login');
  });

  it('validates fields without sending an incomplete form', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    render(<App />);

    const submit = screen.getByRole('button', { name: 'Sign in' });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    expect(await screen.findByText('Enter your email address')).toBeInTheDocument();
    expect(screen.getByText(/Password must be between 12 and 128/)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/me', { credentials: 'include' });
    expect(global.fetch).not.toHaveBeenCalledWith('/api/auth/login', expect.anything());
  });

  it('submits canonicalized credentials and continues to the existing shell', async () => {
    let authenticated = false;
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/auth/me') {
        return authenticated
          ? Promise.resolve({ ok: true, status: 200, json: async () => ({ data: activeUser }) })
          : Promise.resolve({ ok: false, status: 401 });
      }
      if (url === '/api/auth/login') {
        authenticated = true;
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: activeUser }) });
      }
      if (url === '/api/requesters') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: [] }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: [] }) });
    });
    render(<App />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: '  SOMCHAI.P@EXAMPLE.COM ' } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'ValidPass#12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ email: 'somchai.p@example.com', password: 'ValidPass#12' }),
    })));
    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });

  it('routes a first-login user to Change Password', async () => {
    const firstLoginUser = { ...activeUser, mustChangePassword: true };
    let authenticated = false;
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      if (String(input) === '/api/auth/me') {
        return authenticated
          ? Promise.resolve({ ok: true, status: 200, json: async () => ({ data: firstLoginUser }) })
          : Promise.resolve({ ok: false, status: 401 });
      }
      authenticated = true;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ data: firstLoginUser }),
      });
    });
    render(<App />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'ValidPass#12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(window.location.pathname).toBe('/change-password'), { timeout: 5000 });
    // The full jsdom suite can be under worker load; wait for the route and
    // rendered screen rather than using the default one-second query timeout.
    expect(await screen.findByRole(
      'heading',
      { name: 'Change your password' },
      { timeout: 5000 },
    )).toBeInTheDocument();
  });

  it('redirects an already-authenticated user away from Login after refresh bootstrap', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      if (String(input) === '/api/auth/me') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: activeUser }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: [] }) });
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Development Login' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('displays a safe notice when navigated to Login with session expiry state', async () => {
    window.history.pushState({ notice: 'Your session has expired. Please sign in again.' }, '', '/login');
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });

    render(<App />);

    expect(await screen.findByText('Your session has expired. Please sign in again.')).toBeInTheDocument();
  });

  it('redirects an unauthenticated user from protected routes with a safe expiry notice', async () => {
    window.history.pushState({}, '', '/tickets');
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });

    render(<App />);

    expect(await screen.findByText('Your session has expired. Please sign in again.')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });
});

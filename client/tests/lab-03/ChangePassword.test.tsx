import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';

const firstLoginUser = {
  id: 1,
  name: 'Somchai Prasert',
  email: 'somchai.p@example.com',
  role: 'REQUESTER',
  isActive: true,
  mustChangePassword: true,
};

describe('Issue #39 Change Password screen', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, '', '/change-password');
  });

  it('bootstraps the current user and validates confirmation locally', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: firstLoginUser }) });
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Change your password' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/New password/), { target: { value: 'ValidPass#12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText('Enter your current password')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('submits a valid change and does not render password values', async () => {
    const changedUser = { ...firstLoginUser, mustChangePassword: false };
    global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      if (String(input) === '/api/auth/me') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: firstLoginUser }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: changedUser }) });
    });
    render(<App />);
    await screen.findByRole('heading', { name: 'Change your password' });

    fireEvent.change(screen.getByLabelText(/Current password/), { target: { value: 'OldPass#1234' } });
    fireEvent.change(screen.getByLabelText(/^New password/), { target: { value: 'NewValid#1234' } });
    fireEvent.change(screen.getByLabelText(/Confirm new password/), { target: { value: 'NewValid#1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/auth/change-password', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ currentPassword: 'OldPass#1234', newPassword: 'NewValid#1234', confirmPassword: 'NewValid#1234' }),
    })));
    expect(await screen.findByText('Password changed. Please sign in again.')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('OldPass#1234');
    expect(document.body).not.toHaveTextContent('NewValid#1234');
    await waitFor(() => expect(window.location.pathname).toBe('/login'), { timeout: 1500 });
  });

  it('redirects an unauthenticated direct visit to Login', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } }),
    });
    render(<App />);

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });

  it('routes a must-change user away from the legacy root on refresh', async () => {
    window.history.pushState({}, '', '/');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: firstLoginUser }),
    });
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Change your password' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/change-password');
  });
});

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
    global.fetch = vi.fn();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter your email address')).toBeInTheDocument();
    expect(screen.getByText(/Password must be between 12 and 128/)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('submits canonicalized credentials and shows a safe success state', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: activeUser }),
    });
    render(<App />);

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: '  SOMCHAI.P@EXAMPLE.COM ' } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'ValidPass#12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ email: 'somchai.p@example.com', password: 'ValidPass#12' }),
    })));
    expect(await screen.findByText('Signed in successfully.')).toBeInTheDocument();
  });

  it('routes a first-login user to Change Password', async () => {
    const firstLoginUser = { ...activeUser, mustChangePassword: true };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: firstLoginUser }),
    });
    render(<App />);

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'ValidPass#12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Change your password' })).toBeInTheDocument();
  });
});

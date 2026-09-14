import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';

type Role = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';
type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
};

const admin: User = {
  id: 1,
  name: 'Admin One',
  email: 'admin@example.com',
  role: 'ADMINISTRATOR',
  isActive: true,
  mustChangePassword: false,
};
const staff: User = {
  id: 20,
  name: 'Staff One',
  email: 'staff@example.com',
  role: 'IT_STAFF',
  isActive: true,
  mustChangePassword: false,
};
const requester: User = {
  id: 30,
  name: 'Requester One',
  email: 'requester@example.com',
  role: 'REQUESTER',
  isActive: false,
  mustChangePassword: true,
};

function response(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function installFetch(initialUsers: User[] = [admin, staff, requester]) {
  let users = [...initialUsers];
  const calls: Array<{ method: string; url: string; body: string | null }> = [];
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({ method, url, body: typeof init?.body === 'string' ? init.body : null });

    if (url === '/api/auth/me') return Promise.resolve(response({ data: admin }));
    if (method === 'GET' && url.startsWith('/api/admin/users')) {
      const parsed = new URL(url, 'http://localhost');
      const search = parsed.searchParams.get('search')?.toLowerCase() ?? '';
      const role = parsed.searchParams.get('role');
      const filtered = users.filter(item =>
        (!search || `${item.name} ${item.email}`.toLowerCase().includes(search))
        && (!role || item.role === role),
      );
      return Promise.resolve(response({ data: filtered }));
    }
    if (method === 'POST' && url === '/api/admin/users') {
      const payload = JSON.parse(String(init?.body)) as { name: string; email: string; role: Role; isActive: boolean };
      const created = { id: 40, ...payload, mustChangePassword: true };
      users = [...users, created];
      return Promise.resolve(response({ data: created }, 201));
    }
    if (method === 'PATCH' && url === '/api/admin/users/20') {
      const payload = JSON.parse(String(init?.body)) as Partial<User>;
      const updated = { ...staff, ...payload };
      users = users.map(item => item.id === updated.id ? updated : item);
      return Promise.resolve(response({ data: updated }));
    }
    if (method === 'POST' && url === '/api/admin/users/20/initial-password') return Promise.resolve(response(null, 204));
    throw new Error(`Unexpected request: ${method} ${url}`);
  });
  global.fetch = fetchMock;
  return { fetchMock, calls };
}

describe('Issue #42 Administrator User Management screen', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, '', '/admin/users');
  });

  it('renders safe user projections and sends search and role-filter query controls', async () => {
    const { fetchMock, calls } = installFetch();
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'User Management' })).toBeInTheDocument();
    expect((await screen.findAllByText('Admin One')).length).toBeGreaterThan(1);
    expect((await screen.findAllByText('Staff One')).length).toBeGreaterThan(1);
    expect((await screen.findAllByText('Requester One')).length).toBeGreaterThan(1);
    expect((await screen.findAllByText('Administrator')).length).toBeGreaterThan(1);
    expect((await screen.findAllByText('IT Staff')).length).toBeGreaterThan(1);
    expect((await screen.findAllByText('Inactive')).length).toBeGreaterThan(1);
    expect(screen.queryByText(/passwordHash|ValidPass/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search users'), { target: { value: 'staff@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    await waitFor(() => expect(calls.some(call => call.url === '/api/admin/users?search=staff%40example.com')).toBe(true));

    fireEvent.change(screen.getByLabelText('Role filter'), { target: { value: 'REQUESTER' } });
    await waitFor(() => expect(calls.some(call => call.url === '/api/admin/users?search=staff%40example.com&role=REQUESTER')).toBe(true));
    expect(fetchMock).toHaveBeenCalled();
  });

  it('creates a user with client validation, canonical form fields, and success feedback', async () => {
    const { calls } = installFetch([]);
    render(<App />);
    await screen.findByRole('heading', { name: 'User Management' });

    fireEvent.change(screen.getByLabelText('Name *'), { target: { value: '  New User  ' } });
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: '  NEW@EXAMPLE.COM  ' } });
    fireEvent.change(screen.getByLabelText('Initial password *'), { target: { value: 'ValidPass#12' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Create user', exact: true }).at(-1)!);

    await waitFor(() => expect(calls.some(call => call.method === 'POST' && call.url === '/api/admin/users')).toBe(true));
    const createCall = calls.find(call => call.method === 'POST' && call.url === '/api/admin/users');
    expect(JSON.parse(createCall?.body ?? '{}')).toEqual({
      name: 'New User',
      email: 'new@example.com',
      role: 'REQUESTER',
      isActive: true,
      initialPassword: 'ValidPass#12',
    });
    expect(await screen.findByText('User created successfully.')).toBeInTheDocument();
  });

  it('edits account fields and sets an initial password without displaying credentials', async () => {
    const { calls } = installFetch([staff]);
    render(<App />);
    await screen.findByRole('heading', { name: 'User Management' });
    await screen.findAllByRole('button', { name: 'Edit', exact: true });

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit', exact: true }).at(0)!);
    fireEvent.change(screen.getByLabelText('Name *'), { target: { value: '  Updated Staff  ' } });
    fireEvent.click(screen.getByLabelText('Account active'));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes', exact: true }));
    await waitFor(() => expect(calls.some(call => call.method === 'PATCH' && call.url === '/api/admin/users/20')).toBe(true));
    expect(await screen.findByText('User updated successfully.')).toBeInTheDocument();
    const firstUpdate = calls.find(call => call.method === 'PATCH' && call.url === '/api/admin/users/20');
    expect(JSON.parse(firstUpdate?.body ?? '{}')).toMatchObject({ name: 'Updated Staff', isActive: false });

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit', exact: true }).at(0)!);
    fireEvent.click(screen.getByLabelText('Account active'));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes', exact: true }));
    await waitFor(() => expect(calls.filter(call => call.method === 'PATCH' && call.url === '/api/admin/users/20')).toHaveLength(2));
    const secondUpdate = calls.filter(call => call.method === 'PATCH' && call.url === '/api/admin/users/20').at(-1);
    expect(JSON.parse(secondUpdate?.body ?? '{}')).toMatchObject({ isActive: true });

    fireEvent.change(screen.getByLabelText('New initial password *'), { target: { value: 'ResetPass#34' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set Initial Password', exact: true }));
    await waitFor(() => expect(calls.some(call => call.method === 'POST' && call.url === '/api/admin/users/20/initial-password')).toBe(true));
    expect(await screen.findByText(/Initial password set/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('ResetPass#34');
  });

  it('blocks invalid passwords and shows an explicit self-deactivation warning in the UI', async () => {
    const { calls } = installFetch([admin]);
    render(<App />);
    await screen.findByRole('heading', { name: 'User Management' });
    await screen.findAllByRole('button', { name: 'Edit', exact: true });

    fireEvent.change(screen.getByLabelText('Initial password *'), { target: { value: 'weak' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Create user', exact: true }).at(-1)!);
    expect(await screen.findByText(/Password must be between/)).toBeInTheDocument();
    expect(calls.some(call => call.method === 'POST' && call.url === '/api/admin/users')).toBe(false);

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit', exact: true }).at(0)!);
    expect(screen.getByText('You cannot deactivate your own account.')).toBeInTheDocument();
    expect(screen.getByLabelText('Account active')).toBeDisabled();
  });

  it('keeps the User Management screen forbidden for Requester sessions', async () => {
    const requesterWithoutPasswordChange = { ...requester, isActive: true, mustChangePassword: false };
    const fetchMock = vi.fn((input: RequestInfo | URL) => String(input) === '/api/auth/me'
      ? Promise.resolve(response({ data: requesterWithoutPasswordChange }))
      : Promise.resolve(response({ error: { code: 'FORBIDDEN', message: 'Forbidden' } }, 403)));
    global.fetch = fetchMock;

    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Access Denied' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'User Management' })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(call => String(call[0]).startsWith('/api/admin/users'))).toBe(false);
  });
});

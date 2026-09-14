import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';

const staff = { id: 20, name: 'Staff One', email: 'staff@example.com', role: 'IT_STAFF', isActive: true, mustChangePassword: false };
const categories = [{ id: 1, name: 'Network' }];
const ticket = {
  id: 8, ticketNumber: 'TK-0008', ticketDate: '2026-09-12T03:00:00.000Z', summary: 'VPN access unavailable', category: categories[0],
  requestedPriority: 'HIGH', itPriority: 'CRITICAL', currentStatus: 'IN_PROGRESS', owner: null,
  requester: { id: 7, name: 'Somchai Prasert', email: 'somchai@example.com', role: 'REQUESTER' },
  updatedAt: '2026-09-12T04:00:00.000Z', problemAppearsResolvedAt: null,
};

function response(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function installFetch(user = staff, queueData = [ticket], queueStatus = 200) {
  let authMeCalls = 0;
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url === '/api/auth/me') {
      authMeCalls += 1;
      if (queueStatus === 401 && authMeCalls > 1) return Promise.resolve(response({ error: { code: 'UNAUTHENTICATED', message: 'Session expired' } }, 401));
      return Promise.resolve(response({ data: user }));
    }
    if (url === '/api/categories') return Promise.resolve(response({ data: categories }));
    if (url.startsWith('/api/staff/tickets')) {
      if (queueStatus !== 200) return Promise.resolve(response({ error: { code: 'UNAUTHENTICATED', message: 'Session expired' } }, queueStatus));
      return Promise.resolve(response({ data: queueData, pagination: { page: 1, pageSize: 10, totalItems: queueData.length, totalPages: queueData.length ? 1 : 0, hasNextPage: false, hasPreviousPage: false } }));
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  global.fetch = fetchMock;
  return fetchMock;
}

describe('Issue #41 Staff Ticket Queue screen', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, '', '/staff/tickets');
  });

  it('renders the complete queue fields and sends contract query controls', async () => {
    const fetchMock = installFetch();
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Staff Ticket Queue' })).toBeInTheDocument();
    expect((await screen.findAllByText('TK-0008')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('TK-0008').length).toBeGreaterThan(0);
    expect(screen.getAllByText('VPN access unavailable').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Network').length).toBeGreaterThan(0);
    expect(screen.getAllByText('HIGH').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CRITICAL').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IN_PROGRESS').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Unassigned').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Somchai Prasert').length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith('/api/staff/tickets?sortBy=updatedAt&sortOrder=desc&page=1&pageSize=10', expect.any(Object));

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'RESOLVED' } });
    await waitFor(() => expect(fetchMock.mock.calls.some(call => String(call[0]).includes('status=RESOLVED'))).toBe(true));
    fireEvent.change(screen.getByLabelText('Search tickets'), { target: { value: 'somchai@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(call => String(call[0]).includes('search=somchai%40example.com'))).toBe(true));
  });

  it('shows no-results and retryable failure states', async () => {
    installFetch(staff, []);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'No tickets in the queue' })).toBeInTheDocument();

    cleanup();
    window.history.pushState({}, '', '/staff/tickets');
    const failure = vi.fn((input: RequestInfo | URL) => String(input) === '/api/auth/me'
      ? Promise.resolve(response({ data: staff }))
      : Promise.resolve(response({ error: { message: 'Temporary outage' } }, 500)));
    global.fetch = failure;
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Unable to Load Staff Queue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('redirects to Login when the queue session expires', async () => {
    installFetch(staff, [ticket], 401);
    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(await screen.findByText('Your session has expired. Please sign in again.')).toBeInTheDocument();
  });

  it('keeps the queue forbidden for a Requester', async () => {
    installFetch({ ...staff, role: 'REQUESTER' });
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Access Denied' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Staff Ticket Queue' })).not.toBeInTheDocument();
  });
});

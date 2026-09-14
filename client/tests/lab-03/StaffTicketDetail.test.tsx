import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';

const staff = { id: 20, name: 'Staff One', email: 'staff@example.com', role: 'IT_STAFF', isActive: true, mustChangePassword: false };
const admin = { id: 30, name: 'Admin One', email: 'admin@example.com', role: 'ADMINISTRATOR', isActive: true, mustChangePassword: false };
const detail = {
  id: 8, ticketNumber: 'TK-0008', summary: 'VPN access unavailable', description: 'VPN disconnects after login.', requestedPriority: 'HIGH', itPriority: 'MEDIUM', currentStatus: 'OPEN',
  ticketDate: '2026-09-12T03:00:00.000Z', updatedAt: '2026-09-12T04:00:00.000Z', createdAt: '2026-09-12T03:00:00.000Z', problemAppearsResolvedAt: '2026-09-12T04:00:00.000Z',
  owner: null, category: { id: 1, name: 'Network' }, relatedSystem: { id: 2, name: 'VPN' }, requester: { id: 7, name: 'Somchai Prasert', email: 'somchai@example.com', role: 'REQUESTER' },
  attachments: [{ id: 11, originalName: 'evidence.pdf', storedName: 'stored.pdf', mimeType: 'application/pdf', sizeBytes: 10, isRemoved: false, removalReason: null, removedAt: null, createdAt: '2026-09-12T03:05:00.000Z', ticketId: 8 }],
  comments: [{ id: 1, ticketId: 8, content: 'Please investigate', createdAt: '2026-09-12T03:10:00.000Z', author: { id: 7, name: 'Somchai Prasert', role: 'REQUESTER' } }],
  internalNotes: [{ id: 2, ticketId: 8, content: 'Check gateway logs', createdAt: '2026-09-12T03:15:00.000Z', author: { id: 20, name: 'Staff One', role: 'IT_STAFF' } }],
};

function response(body: unknown, status = 200): Response { return { ok: status >= 200 && status < 300, status, json: async () => body, blob: async () => new Blob() } as Response; }
function installFetch(
  user: typeof staff | typeof admin,
  status: string = 'OPEN',
  options: { detailStatus?: number; conflict?: boolean } = {},
) {
  const current = structuredClone(detail) as typeof detail;
  current.currentStatus = status;
  let authMeCalls = 0;
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === '/api/auth/me') {
      authMeCalls += 1;
      if (options.detailStatus === 401 && authMeCalls > 1) return Promise.resolve(response({ error: { code: 'UNAUTHENTICATED', message: 'Session expired' } }, 401));
      return Promise.resolve(response({ data: user }));
    }
    if (url === '/api/tickets/8' && (!init || !init.method)) {
      if (options.detailStatus !== undefined) return Promise.resolve(response({ error: { code: 'UNAUTHENTICATED', message: 'Session expired' } }, options.detailStatus));
      return Promise.resolve(response({ data: current }));
    }
    if (init?.method === 'PATCH' || init?.method === 'POST') {
      const body = JSON.parse(String(init.body ?? '{}')) as Record<string, unknown>;
      if (options.conflict && url.endsWith('/status')) {
        return Promise.resolve(response({ error: { code: 'CONFLICT', message: 'The resource was modified by another user. Reload and try again.' } }, 409));
      }
      const next = { ...current };
      if (url.endsWith('/it-priority')) next.itPriority = body.itPriority as string;
      if (url.endsWith('/owner')) next.owner = body.ownerId === null ? null : { id: body.ownerId as number, name: 'Assigned Staff', email: 'assigned@example.com', role: 'IT_STAFF' };
      if (url.endsWith('/status')) { next.currentStatus = body.status as string; if (body.status === 'REOPENED') next.problemAppearsResolvedAt = null; }
      if (url.endsWith('/comments')) return Promise.resolve(response({ data: { id: 4, ticketId: 8, content: body.content as string, createdAt: '2026-09-12T04:00:00.000Z', author: { id: user.id, name: user.name, role: user.role } } }, 201));
      if (url.endsWith('/internal-notes')) return Promise.resolve(response({ data: { id: 5, ticketId: 8, content: body.content as string, createdAt: '2026-09-12T04:00:00.000Z', author: { id: user.id, name: user.name, role: user.role } } }, 201));
      return Promise.resolve(response({ data: next }, url.endsWith('/comments') || url.endsWith('/internal-notes') ? 201 : 200));
    }
    if (url.startsWith('/api/attachments/11/download')) return Promise.resolve(response({}, 200));
    throw new Error(`Unexpected request: ${url}`);
  });
  global.fetch = fetchMock;
  return fetchMock;
}

describe('Issue #41 Staff Ticket Detail screen', () => {
  beforeEach(() => { vi.restoreAllMocks(); window.history.pushState({}, '', '/staff/tickets/8'); });

  it('lets Staff update owner, IT Priority, status, public comments, and notes', async () => {
    const fetchMock = installFetch(staff);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'TK-0008' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Internal Notes' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Owner ID'), { target: { value: '21' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/tickets/8/owner', expect.objectContaining({ method: 'PATCH' })));
    fireEvent.change(screen.getByLabelText('IT Priority'), { target: { value: 'CRITICAL' } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/tickets/8/it-priority', expect.objectContaining({ method: 'PATCH' })));
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'IN_PROGRESS' } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/tickets/8/status', expect.objectContaining({ method: 'PATCH' })));
    fireEvent.change(screen.getByLabelText('Add a public comment'), { target: { value: '  status update  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add public comment' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/tickets/8/comments', expect.objectContaining({ method: 'POST' })));
    fireEvent.change(screen.getByLabelText('Add an internal note'), { target: { value: 'gateway checked' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add internal note' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/tickets/8/internal-notes', expect.objectContaining({ method: 'POST' })));
  });

  it('requires confirmation for terminal workflow changes and clears resolution when reopened', async () => {
    const fetchMock = installFetch(staff, 'RESOLVED');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    await screen.findByRole('heading', { name: 'TK-0008' });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'REOPENED' } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/tickets/8/status', expect.objectContaining({ method: 'PATCH' })));
    expect(window.confirm).toHaveBeenCalled();
  });

  it('resets status dropdown when confirmation is cancelled', async () => {
    const fetchMock = installFetch(staff, 'OPEN');
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);
    await screen.findByRole('heading', { name: 'TK-0008' });
    const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'CANCELLED' } });
    expect(window.confirm).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalledWith('/api/tickets/8/status', expect.anything());
    expect(statusSelect.value).toBe('OPEN');
  });

  it('renders a conflict message when another Staff user changes the ticket first', async () => {
    installFetch(staff, 'OPEN', { conflict: true });
    render(<App />);
    await screen.findByRole('heading', { name: 'TK-0008' });

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'IN_PROGRESS' } });

    expect(await screen.findByText('The resource was modified by another user. Reload and try again.')).toBeInTheDocument();
  });

  it('redirects to Login when the detail session expires', async () => {
    installFetch(staff, 'OPEN', { detailStatus: 401 });
    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(await screen.findByText('Your session has expired. Please sign in again.')).toBeInTheDocument();
  });

  it('renders Administrator detail as read-only while keeping notes and attachment metadata visible', async () => {
    installFetch(admin);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'TK-0008' })).toBeInTheDocument();
    expect(screen.getByText('Check gateway logs')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Workflow controls' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add public comment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add internal note' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument();
  });
});

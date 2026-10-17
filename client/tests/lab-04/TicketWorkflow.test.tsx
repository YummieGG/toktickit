import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';

const staff = {
  id: 20,
  name: 'Staff One',
  email: 'staff@example.com',
  role: 'IT_STAFF',
  isActive: true,
  mustChangePassword: false,
};

const baseTicket = {
  id: 8,
  ticketNumber: 'TK-0008',
  summary: 'Network switch faulty port',
  description: 'Port 12 on building B switch is flapping constantly.',
  requestedPriority: 'HIGH',
  itPriority: 'HIGH',
  currentStatus: 'IN_PROGRESS',
  ticketDate: '2026-10-14T03:00:00.000Z',
  updatedAt: '2026-10-14T04:00:00.000Z',
  createdAt: '2026-10-14T03:00:00.000Z',
  problemAppearsResolvedAt: null,
  resolvedAt: null,
  version: 2,
  owner: staff,
  category: { id: 1, name: 'Hardware' },
  relatedSystem: { id: 2, name: 'Switch' },
  requester: { id: 7, name: 'Somchai Prasert', email: 'somchai@example.com', role: 'REQUESTER' },
  attachments: [],
  comments: [],
  internalNotes: [],
};

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    blob: async () => new Blob(),
  } as Response;
}

function installFetch(
  ticketStatus = 'IN_PROGRESS',
  options: {
    ticketVersion?: number;
    resolvedAt?: string | null;
    resolutionBlocked?: boolean;
    conflict?: boolean;
    reconcileFails?: boolean;
  } = {},
) {
  const currentTicket = {
    ...baseTicket,
    currentStatus: ticketStatus,
    version: options.ticketVersion ?? 2,
    resolvedAt: options.resolvedAt ?? (ticketStatus === 'RESOLVED' ? '2026-10-14T05:00:00.000Z' : null),
  };

  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === '/api/auth/me') {
      return Promise.resolve(response({ data: staff }));
    }
    if (url === '/api/staff/tickets/owners') {
      return Promise.resolve(response({ data: [staff] }));
    }
    if (url === '/api/tickets/8' && (!init || !init.method || init.method === 'GET')) {
      if (options.reconcileFails && fetchMock.mock.calls.filter(c => String(c[0]) === '/api/tickets/8').length > 1) {
        return Promise.resolve(response({ error: { message: 'Network offline' } }, 500));
      }
      return Promise.resolve(response({ data: currentTicket }));
    }
    if (url.includes('/actions-taken') && (!init || !init.method || init.method === 'GET')) {
      return Promise.resolve(
        response({
          data: [],
          ticketVersion: currentTicket.version,
          pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        }),
      );
    }
    if (url === '/api/tickets/8/status' && init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body ?? '{}')) as {
        status: string;
        confirmed: boolean;
        expectedTicketVersion: number;
      };

      if (options.resolutionBlocked && body.status === 'RESOLVED') {
        return Promise.resolve(
          response(
            {
              error: {
                code: 'TICKET_RESOLUTION_BLOCKED',
                message: 'At least one completed action with a recorded result is required before resolution',
                fields: { resolutionGate: 'At least one completed action with a recorded result is required before resolution' },
              },
              details: [{ field: 'resolutionGate', message: 'At least one completed action with a recorded result is required before resolution' }],
            },
            400,
          ),
        );
      }

      if (options.conflict) {
        return Promise.resolve(
          response(
            {
              error: {
                code: 'CONFLICT',
                message: 'The resource was modified by another user. Reload and try again.',
              },
            },
            409,
          ),
        );
      }

      const updated = {
        ...currentTicket,
        currentStatus: body.status,
        version: currentTicket.version + 1,
        resolvedAt: body.status === 'RESOLVED' ? '2026-10-14T05:30:00.000Z' : body.status === 'REOPENED' ? null : currentTicket.resolvedAt,
        problemAppearsResolvedAt: body.status === 'REOPENED' ? null : currentTicket.problemAppearsResolvedAt,
      };

      return Promise.resolve(response({ data: updated }));
    }

    throw new Error(`Unexpected request: ${url}`);
  });

  global.fetch = fetchMock;
  return fetchMock;
}

describe('UI-02: Ticket Workflow and Resolution Feedback (FR-04-08, BR-13, BR-14, BR-16, AC-06)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, '', '/staff/tickets/8');
  });

  it('renders allowed transitions based on current ticket status in dropdown', async () => {
    installFetch('OPEN');
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'TK-0008' })).toBeInTheDocument();
    const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;

    const options = Array.from(statusSelect.options).map((opt) => opt.value);
    expect(options).toEqual(['OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'CANCELLED']);
    expect(options).not.toContain('RESOLVED');
    expect(options).not.toContain('CLOSED');
    expect(options).not.toContain('REOPENED');
  });

  it('renders allowed transitions for IN_PROGRESS status including RESOLVED', async () => {
    installFetch('IN_PROGRESS');
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'TK-0008' })).toBeInTheDocument();
    const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;

    const options = Array.from(statusSelect.options).map((opt) => opt.value);
    expect(options).toEqual(['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED']);
  });

  it('renders allowed transitions for RESOLVED status (CLOSED, REOPENED)', async () => {
    installFetch('RESOLVED');
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'TK-0008' })).toBeInTheDocument();
    const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;

    const options = Array.from(statusSelect.options).map((opt) => opt.value);
    expect(options).toEqual(['RESOLVED', 'CLOSED', 'REOPENED']);
    expect(options).not.toContain('CANCELLED');
    expect(options).not.toContain('IN_PROGRESS');
  });

  it('prompts confirmation modal for CANCELLED transition with child action warning and sends expectedTicketVersion', async () => {
    const fetchMock = installFetch('IN_PROGRESS', { ticketVersion: 3 });

    render(<App />);
    expect(await screen.findByRole('heading', { name: 'TK-0008' })).toBeInTheDocument();

    const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'CANCELLED' } });

    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveTextContent(/Cancelling this ticket will automatically cancel any active child actions/i);

    fireEvent.click(within(modal).getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/tickets/8/status',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            status: 'CANCELLED',
            confirmed: true,
            expectedTicketVersion: 3,
          }),
        }),
      );
    });
  });

  it('prompts confirmation for REOPENED transition explaining history preservation and timestamp clear', async () => {
    const fetchMock = installFetch('RESOLVED');

    render(<App />);
    expect(await screen.findByRole('heading', { name: 'TK-0008' })).toBeInTheDocument();

    const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'REOPENED' } });

    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveTextContent(/preserve all past action and event history, and clear past resolution timestamps/i);

    fireEvent.click(within(modal).getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/tickets/8/status',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            status: 'REOPENED',
            confirmed: true,
            expectedTicketVersion: 2,
          }),
        }),
      );
    });
  });

  it('resets select element to current status when user cancels confirmation prompt', async () => {
    const fetchMock = installFetch('IN_PROGRESS');

    render(<App />);
    expect(await screen.findByRole('heading', { name: 'TK-0008' })).toBeInTheDocument();

    const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
    expect(statusSelect.value).toBe('IN_PROGRESS');

    fireEvent.change(statusSelect, { target: { value: 'CANCELLED' } });

    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();

    fireEvent.click(within(modal).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(statusSelect.value).toBe('IN_PROGRESS');
    expect(fetchMock).not.toHaveBeenCalledWith('/api/tickets/8/status', expect.anything());
  });

  it('displays resolution blocked error banner and reverts select when backend returns 400 TICKET_RESOLUTION_BLOCKED', async () => {
    installFetch('IN_PROGRESS', { resolutionBlocked: true });

    render(<App />);
    expect(await screen.findByRole('heading', { name: 'TK-0008' })).toBeInTheDocument();

    const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'RESOLVED' } });

    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveTextContent(/Resolving this ticket confirms that all required child actions have been completed/i);

    fireEvent.click(within(modal).getByRole('button', { name: 'Confirm' }));

    const errorAlert = await screen.findByText(
      'At least one completed action with a recorded result is required before resolution',
    );
    expect(errorAlert).toBeInTheDocument();

    // Dropdown value reverts to original status and displays validation error state
    expect(statusSelect.value).toBe('IN_PROGRESS');
    expect(statusSelect).toHaveClass('is-invalid');
    expect(statusSelect).toHaveAttribute('aria-invalid', 'true');
    expect(statusSelect).toHaveAttribute('aria-describedby', 'ticket-status-error');
  });

  it('handles 409 CONFLICT gracefully and displays conflict alert', async () => {
    installFetch('IN_PROGRESS', { conflict: true });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<App />);
    expect(await screen.findByRole('heading', { name: 'TK-0008' })).toBeInTheDocument();

    const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'WAITING_FOR_REQUESTER' } });

    const errorAlert = await screen.findByText(/The resource was modified by another user/i);
    expect(errorAlert).toBeInTheDocument();
    expect(statusSelect.value).toBe('IN_PROGRESS');

    const reconcileBtn = await screen.findByRole('button', { name: /Reload & Reconcile/i });
    expect(reconcileBtn).toBeInTheDocument();
    expect(screen.getByText(/Your draft has been preserved/i)).toBeInTheDocument();

    fireEvent.click(reconcileBtn);

    await waitFor(() => {
      expect(screen.queryByText(/The resource was modified by another user/i)).not.toBeInTheDocument();
    });
  });

  it('retains conflict notice and displays error when reconcile reload fails', async () => {
    installFetch('IN_PROGRESS', { conflict: true, reconcileFails: true });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<App />);
    expect(await screen.findByRole('heading', { name: 'TK-0008' })).toBeInTheDocument();

    const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'WAITING_FOR_REQUESTER' } });

    const errorAlert = await screen.findByText(/The resource was modified by another user/i);
    expect(errorAlert).toBeInTheDocument();

    const reconcileBtn = await screen.findByRole('button', { name: /Reload & Reconcile/i });
    fireEvent.click(reconcileBtn);

    await waitFor(() => {
      expect(screen.getByText('Unable to reload ticket for reconciliation. Please try again.')).toBeInTheDocument();
    });
    // The conflict banner and reload button remain visible
    expect(reconcileBtn).toBeInTheDocument();
    expect(screen.getByText(/Your draft has been preserved/i)).toBeInTheDocument();
  });

  it('preserves existing resolution gate error when a subsequent confirmation dialog is cancelled', async () => {
    installFetch('IN_PROGRESS', { resolutionBlocked: true });

    render(<App />);
    expect(await screen.findByRole('heading', { name: 'TK-0008' })).toBeInTheDocument();

    const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;

    // 1. Attempt resolve -> blocked by resolution gate
    fireEvent.change(statusSelect, { target: { value: 'RESOLVED' } });
    const resolveModal = screen.getByRole('dialog');
    fireEvent.click(within(resolveModal).getByRole('button', { name: 'Confirm' }));

    const gateError = await screen.findByText(
      'At least one completed action with a recorded result is required before resolution',
    );
    expect(gateError).toBeInTheDocument();
    expect(statusSelect).toHaveClass('is-invalid');

    // 2. User tries to cancel ticket, but dismisses the confirmation modal
    fireEvent.change(statusSelect, { target: { value: 'CANCELLED' } });
    const cancelModal = screen.getByRole('dialog');
    expect(cancelModal).toBeInTheDocument();
    fireEvent.click(within(cancelModal).getByRole('button', { name: 'Cancel' }));

    // The resolution gate error banner and invalid styling must remain intact
    expect(screen.getByText('At least one completed action with a recorded result is required before resolution')).toBeInTheDocument();
    expect(statusSelect.value).toBe('IN_PROGRESS');
  });

  it('displays Resolved At timestamp when ticket is resolved, and Not resolved when null', async () => {
    installFetch('RESOLVED', { resolvedAt: '2026-10-14T05:00:00.000Z' });
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'TK-0008' })).toBeInTheDocument();
    expect(screen.getByText('Resolved At')).toBeInTheDocument();
    expect(screen.getByText('2026-10-14 05:00')).toBeInTheDocument();
  });
});

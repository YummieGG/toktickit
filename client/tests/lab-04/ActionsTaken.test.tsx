import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionsTakenSection } from '../../src/components/tickets/ActionsTakenSection';
import { AuthContext } from '../../src/contexts/auth';
import type { ActionProjection } from '../../src/types/action';

const staffUser = {
  id: 20,
  name: 'Staff One',
  email: 'staff@example.com',
  role: 'IT_STAFF' as const,
  isActive: true,
  mustChangePassword: false,
};

const adminUser = {
  id: 30,
  name: 'Admin One',
  email: 'admin@example.com',
  role: 'ADMINISTRATOR' as const,
  isActive: true,
  mustChangePassword: false,
};

const requesterUser = {
  id: 7,
  name: 'Somchai Prasert',
  email: 'somchai@example.com',
  role: 'REQUESTER' as const,
  isActive: true,
  mustChangePassword: false,
};

const mockActionPending: ActionProjection = {
  id: 101,
  ticketId: 8,
  description: 'Initial diagnosis on VPN gateway connectivity',
  result: null,
  status: 'PENDING',
  followUpRequired: false,
  followUpNote: null,
  attachmentNotes: 'See gateway log screenshot',
  cancelReason: null,
  version: 1,
  performedBy: { id: 20, name: 'Staff One', email: 'staff@example.com', role: 'IT_STAFF' },
  assignee: { id: 20, name: 'Staff One', email: 'staff@example.com', role: 'IT_STAFF' },
  createdAt: '2026-10-14T03:00:00.000Z',
  updatedAt: '2026-10-14T03:00:00.000Z',
};

const mockActionInProgress: ActionProjection = {
  id: 102,
  ticketId: 8,
  description: 'Restarting VPN daemon and checking certificate expiration',
  result: null,
  status: 'IN_PROGRESS',
  followUpRequired: true,
  followUpNote: 'Monitor for 10 minutes after daemon restart',
  attachmentNotes: null,
  cancelReason: null,
  version: 2,
  performedBy: { id: 20, name: 'Staff One', email: 'staff@example.com', role: 'IT_STAFF' },
  assignee: { id: 21, name: 'Staff Two', email: 'staff2@example.com', role: 'IT_STAFF' },
  createdAt: '2026-10-14T03:30:00.000Z',
  updatedAt: '2026-10-14T03:45:00.000Z',
};

const mockActionCompleted: ActionProjection = {
  id: 103,
  ticketId: 8,
  description: 'Renewed SSL certificate and flushed NAT routing table',
  result: 'VPN daemon stabilized; packets routing normally',
  status: 'COMPLETED',
  followUpRequired: false,
  followUpNote: null,
  attachmentNotes: null,
  cancelReason: null,
  version: 3,
  performedBy: { id: 20, name: 'Staff One', email: 'staff@example.com', role: 'IT_STAFF' },
  assignee: { id: 20, name: 'Staff One', email: 'staff@example.com', role: 'IT_STAFF' },
  createdAt: '2026-10-14T04:00:00.000Z',
  updatedAt: '2026-10-14T04:15:00.000Z',
};

const mockOwners = [
  staffUser,
  { id: 21, name: 'Staff Two', email: 'staff2@example.com', role: 'IT_STAFF', isActive: true, mustChangePassword: false },
  adminUser,
];

function renderWithAuth(
  component: React.ReactElement,
  user = staffUser,
) {
  return render(
    <AuthContext.Provider
      value={{
        user,
        isLoading: false,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        refresh: vi.fn(),
      }}
    >
      {component}
    </AuthContext.Provider>,
  );
}

function jsonResponse(data: unknown, status = 200): Promise<Response> {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response);
}

describe('UI-01 Actions Taken UI Component (Issue #58)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders interactive controls for IT Staff on active ticket (AC-04)', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/actions-taken')) {
        return jsonResponse({
          data: [mockActionPending],
          ticketVersion: 2,
          pagination: { totalItems: 1, page: 1, pageSize: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        });
      }
      if (url.includes('/staff/tickets/owners')) {
        return jsonResponse({ data: mockOwners });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });

    renderWithAuth(
      <ActionsTakenSection
        ticketId={8}
        ticketVersion={2}
        ticketStatus="OPEN"
        isReadOnly={false}
      />,
      staffUser,
    );

    expect(await screen.findByRole('heading', { name: 'Actions Taken' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Action/i })).toBeInTheDocument();
    expect(screen.getAllByText('Initial diagnosis on VPN gateway connectivity')[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Start/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Complete/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Cancel/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Edit/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Reassign/i })[0]).toBeInTheDocument();
  });

  it('renders interactive controls for Administrator on active ticket', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/actions-taken')) {
        return jsonResponse({
          data: [mockActionInProgress],
          ticketVersion: 3,
          pagination: { totalItems: 1, page: 1, pageSize: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        });
      }
      if (url.includes('/staff/tickets/owners')) {
        return jsonResponse({ data: mockOwners });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });

    renderWithAuth(
      <ActionsTakenSection
        ticketId={8}
        ticketVersion={3}
        ticketStatus="IN_PROGRESS"
        isReadOnly={false}
      />,
      adminUser,
    );

    expect(await screen.findByRole('heading', { name: 'Actions Taken' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Action/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Complete/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Cancel/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Edit/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Reassign/i })[0]).toBeInTheDocument();
  });

  it('renders strictly read-only view for Requester with no mutation controls (AC-05)', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/actions-taken')) {
        return jsonResponse({
          data: [mockActionCompleted],
          ticketVersion: 4,
          pagination: { totalItems: 1, page: 1, pageSize: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });

    renderWithAuth(
      <ActionsTakenSection
        ticketId={8}
        ticketVersion={4}
        ticketStatus="OPEN"
        isReadOnly={true}
      />,
      requesterUser,
    );

    expect(await screen.findByRole('heading', { name: 'Actions Taken' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add Action/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reassign/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Start/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Complete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancel/i })).not.toBeInTheDocument();
    expect(screen.getAllByText('Renewed SSL certificate and flushed NAT routing table')[0]).toBeInTheDocument();
    expect(screen.getAllByText('VPN daemon stabilized; packets routing normally')[0]).toBeInTheDocument();
  });

  it('renders strictly read-only view when parent ticket is in a terminal status', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/actions-taken')) {
        return jsonResponse({
          data: [mockActionCompleted],
          ticketVersion: 5,
          pagination: { totalItems: 1, page: 1, pageSize: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        });
      }
      if (url.includes('/staff/tickets/owners')) {
        return jsonResponse({ data: mockOwners });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });

    renderWithAuth(
      <ActionsTakenSection
        ticketId={8}
        ticketVersion={5}
        ticketStatus="RESOLVED"
        isReadOnly={false}
      />,
      staffUser,
    );

    expect(await screen.findByRole('heading', { name: 'Actions Taken' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add Action/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Start/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Complete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancel/i })).not.toBeInTheDocument();
  });

  it('validates required fields on create and displays errors', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/actions-taken')) {
        return jsonResponse({
          data: [],
          ticketVersion: 1,
          pagination: { totalItems: 0, page: 1, pageSize: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        });
      }
      if (url.includes('/staff/tickets/owners')) {
        return jsonResponse({ data: mockOwners });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });

    renderWithAuth(
      <ActionsTakenSection
        ticketId={8}
        ticketVersion={1}
        ticketStatus="OPEN"
        isReadOnly={false}
      />,
      staffUser,
    );

    const addBtn = await screen.findByRole('button', { name: /Add Action/i });
    fireEvent.click(addBtn);

    expect(screen.getByRole('heading', { name: /New Action Taken/i })).toBeInTheDocument();

    // Check follow-up requirement
    const followUpCheckbox = screen.getByLabelText(/Follow-Up Required/i);
    fireEvent.click(followUpCheckbox);

    // Try to submit empty
    const submitBtn = screen.getByRole('button', { name: 'Save Action' });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Action description is required (1–2,000 characters).')).toBeInTheDocument();
    expect(screen.getByText('Follow-up note is required when follow-up is requested.')).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByLabelText('Description *'));
    expect(screen.getByLabelText('Description *')).toHaveAttribute('aria-describedby', 'action-create-desc-error');
    expect(screen.getByLabelText('Description *')).toHaveAttribute('aria-invalid', 'true');
  });

  it('validates maximum length for result and attachmentNotes on create', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/actions-taken')) {
        return jsonResponse({
          data: [],
          ticketVersion: 1,
          pagination: { totalItems: 0, page: 1, pageSize: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        });
      }
      if (url.includes('/staff/tickets/owners')) {
        return jsonResponse({ data: mockOwners });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });

    renderWithAuth(
      <ActionsTakenSection
        ticketId={8}
        ticketVersion={1}
        ticketStatus="OPEN"
        isReadOnly={false}
      />,
      staffUser,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Add Action/i }));
    fireEvent.change(screen.getByLabelText('Description *'), { target: { value: 'Valid description' } });
    fireEvent.change(screen.getByLabelText(/Result \(Optional\)/i), { target: { value: 'a'.repeat(2001) } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Action' }));

    expect(await screen.findByText('Result must not exceed 2,000 characters.')).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByLabelText(/Result \(Optional\)/i));
    expect(screen.getByLabelText(/Result \(Optional\)/i)).toHaveAttribute('aria-describedby', 'action-create-result-error');

    fireEvent.change(screen.getByLabelText(/Result \(Optional\)/i), { target: { value: 'Valid result' } });
    fireEvent.change(screen.getByLabelText(/Attachment Notes \(Optional\)/i), { target: { value: 'b'.repeat(2001) } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Action' }));

    expect(await screen.findByText('Attachment notes must not exceed 2,000 characters.')).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByLabelText(/Attachment Notes \(Optional\)/i));
    expect(screen.getByLabelText(/Attachment Notes \(Optional\)/i)).toHaveAttribute('aria-describedby', 'action-create-attachments-error');
  });

  it('creates an action submitting Idempotency-Key and expectedTicketVersion', async () => {
    let capturedHeaders: HeadersInit | undefined;
    let capturedBody: Record<string, unknown> | undefined;

    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/actions-taken') && init?.method === 'POST') {
        capturedHeaders = init.headers;
        capturedBody = JSON.parse(String(init.body));
        return jsonResponse({
          data: {
            action: {
              ...mockActionPending,
              id: 105,
              description: 'Checked DNS configuration',
            },
            ticketVersion: 2,
          },
        }, 201);
      }
      if (url.includes('/actions-taken')) {
        return jsonResponse({
          data: [],
          ticketVersion: 1,
          pagination: { totalItems: 0, page: 1, pageSize: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        });
      }
      if (url.includes('/staff/tickets/owners')) {
        return jsonResponse({ data: mockOwners });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });

    const onVersionChange = vi.fn();

    renderWithAuth(
      <ActionsTakenSection
        ticketId={8}
        ticketVersion={1}
        ticketStatus="OPEN"
        isReadOnly={false}
        onTicketVersionChange={onVersionChange}
      />,
      staffUser,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Add Action/i }));
    fireEvent.change(screen.getByLabelText('Description *'), {
      target: { value: 'Checked DNS configuration' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Action' }));

    await waitFor(() => {
      expect(screen.getByText('Action created successfully.')).toBeInTheDocument();
    });

    expect(capturedBody).toEqual(expect.objectContaining({
      description: 'Checked DNS configuration',
      expectedTicketVersion: 1,
      assigneeId: 20,
    }));
    expect(capturedHeaders).toHaveProperty('Idempotency-Key');
    expect(onVersionChange).toHaveBeenCalledWith(2);
    expect(screen.getAllByText('Checked DNS configuration')[0]).toBeInTheDocument();
  });

  it('displays validation error below assignee control when server returns ASSIGNEE_INELIGIBLE', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/actions-taken') && init?.method === 'POST') {
        return jsonResponse({
          error: {
            code: 'ASSIGNEE_INELIGIBLE',
            message: 'Assignee is not eligible to work on actions',
            fields: { assigneeId: 'Selected user is ineligible' },
          },
        }, 400);
      }
      if (url.includes('/actions-taken')) {
        return jsonResponse({
          data: [],
          ticketVersion: 1,
          pagination: { totalItems: 0, page: 1, pageSize: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        });
      }
      if (url.includes('/staff/tickets/owners')) {
        return jsonResponse({ data: mockOwners });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });

    renderWithAuth(
      <ActionsTakenSection
        ticketId={8}
        ticketVersion={1}
        ticketStatus="OPEN"
        isReadOnly={false}
      />,
      staffUser,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Add Action/i }));
    fireEvent.change(screen.getByLabelText('Description *'), {
      target: { value: 'Triage ticket without direct owner' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Action' }));

    await waitFor(() => {
      expect(screen.getByText('Selected user is ineligible')).toBeInTheDocument();
    });

    const assigneeSelect = screen.getByLabelText('Assignee');
    expect(assigneeSelect).toHaveClass('is-invalid');
    expect(assigneeSelect).toHaveAttribute('aria-invalid', 'true');
    expect(assigneeSelect).toHaveAttribute('aria-describedby', 'action-create-assignee-error');
  });

  it('preserves draft and displays conflict banner on 409 conflict', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/actions-taken') && init?.method === 'POST') {
        return jsonResponse({
          error: {
            code: 'CONFLICT',
            message: 'Conflict: The ticket was updated by another request. Please reload to reconcile before resubmitting.',
          },
        }, 409);
      }
      if (url.includes('/actions-taken')) {
        return jsonResponse({
          data: [],
          ticketVersion: 1,
          pagination: { totalItems: 0, page: 1, pageSize: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        });
      }
      if (url.includes('/staff/tickets/owners')) {
        return jsonResponse({ data: mockOwners });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });

    renderWithAuth(
      <ActionsTakenSection
        ticketId={8}
        ticketVersion={1}
        ticketStatus="OPEN"
        isReadOnly={false}
      />,
      staffUser,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Add Action/i }));
    const descTextarea = screen.getByLabelText('Description *');
    fireEvent.change(descTextarea, {
      target: { value: 'Attempted gateway reset with unsaved work' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Action' }));

    expect(await screen.findByText(/Conflict: The ticket was updated by another request/)).toBeInTheDocument();
    // Draft remains preserved in the textarea
    expect(descTextarea).toHaveValue('Attempted gateway reset with unsaved work');
  });

  it('reconciles action version on 409 conflict reload allowing subsequent successful resubmission', async () => {
    let callCount = 0;
    const editBodies: Record<string, unknown>[] = [];

    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/101') && init?.method === 'PATCH') {
        callCount++;
        const parsedBody = JSON.parse(String(init.body));
        editBodies.push(parsedBody);
        if (callCount === 1) {
          // Stale version conflict
          return jsonResponse({
            error: {
              code: 'CONFLICT',
              message: 'Conflict: The action was updated by another request. Please reload to see latest state.',
            },
          }, 409);
        }
        // Second call after reload succeeds
        return jsonResponse({
          data: {
            action: {
              ...mockActionPending,
              description: 'Draft preserved across reload and saved',
              version: 3,
            },
            ticketVersion: 3,
          },
        }, 200);
      }
      if (url.includes('/actions-taken')) {
        const currentVer = callCount === 0 ? 1 : 2;
        return jsonResponse({
          data: [{ ...mockActionPending, version: currentVer }],
          ticketVersion: currentVer,
          pagination: { totalItems: 1, page: 1, pageSize: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        });
      }
      if (url.includes('/staff/tickets/owners')) {
        return jsonResponse({ data: mockOwners });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });

    renderWithAuth(
      <ActionsTakenSection
        ticketId={8}
        ticketVersion={2}
        ticketStatus="OPEN"
        isReadOnly={false}
      />,
      staffUser,
    );

    fireEvent.click(await screen.findAllByRole('button', { name: /Edit/i }).then(btns => btns[0]));

    const desc = screen.getByLabelText('Description *');
    fireEvent.change(desc, { target: { value: 'Draft preserved across reload and saved' } });

    // First submit fails with 409
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText(/Conflict: The action was updated by another request/)).toBeInTheDocument();
    expect(desc).toHaveValue('Draft preserved across reload and saved');

    // Click Reload Actions & Reconcile
    fireEvent.click(screen.getByRole('button', { name: /Reload Actions & Reconcile/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Conflict: The action was updated by another request/)).not.toBeInTheDocument();
    });

    // Verify draft is still preserved in textarea
    expect(desc).toHaveValue('Draft preserved across reload and saved');

    // Resubmit succeeds with reconciled version 2
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(screen.getByText('Action updated successfully.')).toBeInTheDocument();
    });

    expect(editBodies[0].expectedActionVersion).toBe(1);
    expect(editBodies[1].expectedActionVersion).toBe(2);
  });

  it('performs action status transition to COMPLETED requiring a result', async () => {
    let statusPatchBody: Record<string, unknown> | undefined;

    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/status') && init?.method === 'PATCH') {
        statusPatchBody = JSON.parse(String(init.body));
        return jsonResponse({
          data: {
            action: {
              ...mockActionInProgress,
              status: 'COMPLETED',
              result: 'All checks passed and daemon is running normally',
            },
            ticketVersion: 3,
          },
        }, 200);
      }
      if (url.includes('/actions-taken')) {
        return jsonResponse({
          data: [mockActionInProgress],
          ticketVersion: 2,
          pagination: { totalItems: 1, page: 1, pageSize: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        });
      }
      if (url.includes('/staff/tickets/owners')) {
        return jsonResponse({ data: mockOwners });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });

    renderWithAuth(
      <ActionsTakenSection
        ticketId={8}
        ticketVersion={2}
        ticketStatus="IN_PROGRESS"
        isReadOnly={false}
      />,
      staffUser,
    );

    fireEvent.click(await screen.findAllByRole('button', { name: /Complete/i }).then(btns => btns[0]));

    expect(screen.getByRole('heading', { name: /Change Status/i })).toBeInTheDocument();

    // Submit empty result
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText(/Result is required to complete an action/i)).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByLabelText(/Completion Result/i));
    expect(screen.getByLabelText(/Completion Result/i)).toHaveAttribute('aria-describedby', 'action-status-error');
    expect(screen.getByLabelText(/Completion Result/i)).toHaveAttribute('aria-invalid', 'true');

    // Fill valid result
    fireEvent.change(screen.getByLabelText(/Completion Result/i), {
      target: { value: 'All checks passed and daemon is running normally' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(screen.getByText('Action status changed to COMPLETED.')).toBeInTheDocument();
    });

    expect(statusPatchBody).toEqual(expect.objectContaining({
      status: 'COMPLETED',
      result: 'All checks passed and daemon is running normally',
      expectedTicketVersion: 2,
      expectedActionVersion: 2,
    }));
  });

  it('performs action status transition to CANCELLED requiring a cancel reason', async () => {
    let statusPatchBody: Record<string, unknown> | undefined;

    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/status') && init?.method === 'PATCH') {
        statusPatchBody = JSON.parse(String(init.body));
        return jsonResponse({
          data: {
            action: {
              ...mockActionPending,
              status: 'CANCELLED',
              cancelReason: 'Superseded by alternate network configuration',
            },
            ticketVersion: 3,
          },
        }, 200);
      }
      if (url.includes('/actions-taken')) {
        return jsonResponse({
          data: [mockActionPending],
          ticketVersion: 2,
          pagination: { totalItems: 1, page: 1, pageSize: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        });
      }
      if (url.includes('/staff/tickets/owners')) {
        return jsonResponse({ data: mockOwners });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });

    renderWithAuth(
      <ActionsTakenSection
        ticketId={8}
        ticketVersion={2}
        ticketStatus="OPEN"
        isReadOnly={false}
      />,
      staffUser,
    );

    fireEvent.click(await screen.findAllByRole('button', { name: /Cancel/i }).then(btns => btns[0]));

    expect(screen.getByRole('heading', { name: /Change Status/i })).toBeInTheDocument();

    // Submit empty cancel reason
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText(/Cancel reason is required to cancel an action/i)).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByLabelText(/Cancellation Reason/i));
    expect(screen.getByLabelText(/Cancellation Reason/i)).toHaveAttribute('aria-describedby', 'action-status-error');
    expect(screen.getByLabelText(/Cancellation Reason/i)).toHaveAttribute('aria-invalid', 'true');

    // Fill valid reason
    fireEvent.change(screen.getByLabelText(/Cancellation Reason/i), {
      target: { value: 'Superseded by alternate network configuration' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(screen.getByText('Action status changed to CANCELLED.')).toBeInTheDocument();
    });

    expect(statusPatchBody).toEqual(expect.objectContaining({
      status: 'CANCELLED',
      cancelReason: 'Superseded by alternate network configuration',
      expectedTicketVersion: 2,
      expectedActionVersion: 1,
    }));
  });

  it('reassigns an action to another eligible Staff member', async () => {
    let reassignPatchBody: Record<string, unknown> | undefined;

    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/assignee') && init?.method === 'PATCH') {
        reassignPatchBody = JSON.parse(String(init.body));
        return jsonResponse({
          data: {
            action: {
              ...mockActionPending,
              assignee: { id: 21, name: 'Staff Two', email: 'staff2@example.com', role: 'IT_STAFF' },
              version: 2,
            },
            ticketVersion: 3,
          },
        }, 200);
      }
      if (url.includes('/actions-taken')) {
        return jsonResponse({
          data: [mockActionPending],
          ticketVersion: 2,
          pagination: { totalItems: 1, page: 1, pageSize: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        });
      }
      if (url.includes('/staff/tickets/owners')) {
        return jsonResponse({ data: mockOwners });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });

    renderWithAuth(
      <ActionsTakenSection
        ticketId={8}
        ticketVersion={2}
        ticketStatus="OPEN"
        isReadOnly={false}
      />,
      staffUser,
    );

    fireEvent.click(await screen.findAllByRole('button', { name: /Reassign/i }).then(btns => btns[0]));

    expect(screen.getByRole('heading', { name: /Reassign Action/i })).toBeInTheDocument();

    // Submit invalid/empty assignee
    fireEvent.change(screen.getByLabelText(/New Assignee/i), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Assignment' }));
    expect(await screen.findByText('Please select a valid active staff or administrator.')).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByLabelText(/New Assignee/i));
    expect(screen.getByLabelText(/New Assignee/i)).toHaveAttribute('aria-describedby', 'action-reassign-error');
    expect(screen.getByLabelText(/New Assignee/i)).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(screen.getByLabelText(/New Assignee/i), {
      target: { value: '21' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Assignment' }));

    await waitFor(() => {
      expect(screen.getByText('Action reassigned successfully.')).toBeInTheDocument();
    });

    expect(reassignPatchBody).toEqual(expect.objectContaining({
      assigneeId: 21,
      expectedTicketVersion: 2,
      expectedActionVersion: 1,
    }));
  });

  it('edits an action with field validation and preserves performedBy/creation date', async () => {
    let editPatchBody: Record<string, unknown> | undefined;

    global.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/101') && init?.method === 'PATCH') {
        editPatchBody = JSON.parse(String(init.body));
        return jsonResponse({
          data: {
            action: {
              ...mockActionPending,
              description: 'Updated diagnosis details with traceroute',
              followUpRequired: true,
              followUpNote: 'Check again at 18:00',
              version: 2,
            },
            ticketVersion: 3,
          },
        }, 200);
      }
      if (url.includes('/actions-taken')) {
        return jsonResponse({
          data: [mockActionPending],
          ticketVersion: 2,
          pagination: { totalItems: 1, page: 1, pageSize: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        });
      }
      if (url.includes('/staff/tickets/owners')) {
        return jsonResponse({ data: mockOwners });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });

    renderWithAuth(
      <ActionsTakenSection
        ticketId={8}
        ticketVersion={2}
        ticketStatus="OPEN"
        isReadOnly={false}
      />,
      staffUser,
    );

    fireEvent.click(await screen.findAllByRole('button', { name: /Edit/i }).then(btns => btns[0]));

    expect(screen.getByRole('heading', { name: /Edit Action/i })).toBeInTheDocument();

    const desc = screen.getByLabelText('Description *');
    fireEvent.change(desc, { target: { value: 'Updated diagnosis details with traceroute' } });

    const followUpCheck = screen.getByLabelText(/Follow-Up Required/i);
    fireEvent.click(followUpCheck);

    const followUpNote = screen.getByLabelText(/Follow-up Note/i);
    fireEvent.change(followUpNote, { target: { value: 'Check again at 18:00' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(screen.getByText('Action updated successfully.')).toBeInTheDocument();
    });

    expect(editPatchBody).toEqual(expect.objectContaining({
      description: 'Updated diagnosis details with traceroute',
      followUpRequired: true,
      followUpNote: 'Check again at 18:00',
      expectedTicketVersion: 2,
      expectedActionVersion: 1,
    }));
  });

  it('renders timestamps in Asia/Bangkok time format and formats pre-wrap plain text correctly', async () => {
    const textWithNewlines = 'Line 1: Diagnosed\nLine 2: Fixed\n  Indented note';
    const actionWithText: ActionProjection = {
      ...mockActionPending,
      description: textWithNewlines,
      createdAt: '2026-10-14T03:30:00.000Z', // In Bangkok (+7) this is 10:30
    };

    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/actions-taken')) {
        return jsonResponse({
          data: [actionWithText],
          ticketVersion: 2,
          pagination: { totalItems: 1, page: 1, pageSize: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });

    renderWithAuth(
      <ActionsTakenSection
        ticketId={8}
        ticketVersion={2}
        ticketStatus="OPEN"
        isReadOnly={true}
      />,
      requesterUser,
    );

    await waitFor(() => {
      expect(screen.getAllByText('2026-10-14 10:30')[0]).toBeInTheDocument();
    });

    const preWrapElem = document.querySelector('.action-pre-wrap');
    expect(preWrapElem).toBeInTheDocument();
    expect(preWrapElem?.textContent).toBe(textWithNewlines);
  });

  it('renders pagination controls when totalPages > 1 and requests page 2 on Next click', async () => {
    let requestedPage = 1;
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/actions-taken')) {
        const urlObj = new URL(url, 'http://localhost');
        requestedPage = Number(urlObj.searchParams.get('page') || '1');
        return jsonResponse({
          data: [{ ...mockActionPending, id: requestedPage === 1 ? 101 : 102 }],
          ticketVersion: 2,
          pagination: {
            totalItems: 25,
            page: requestedPage,
            pageSize: 20,
            totalPages: 2,
            hasNextPage: requestedPage === 1,
            hasPreviousPage: requestedPage === 2,
          },
        });
      }
      if (url.includes('/staff/tickets/owners')) {
        return jsonResponse({ data: mockOwners });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });

    renderWithAuth(
      <ActionsTakenSection
        ticketId={8}
        ticketVersion={2}
        ticketStatus="OPEN"
        isReadOnly={false}
      />,
      staffUser,
    );

    expect(await screen.findByTestId('actions-pagination')).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of 2 \(25 actions\)/)).toBeInTheDocument();

    const nextBtn = screen.getByRole('button', { name: 'Next' });
    expect(nextBtn).toBeEnabled();
    const prevBtn = screen.getByRole('button', { name: 'Previous' });
    expect(prevBtn).toBeDisabled();

    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 2 \(25 actions\)/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    });
  });

  it('initializes Reassign modal with empty selection for inactive assignee and blocks submission until active user chosen', async () => {
    const actionWithInactiveAssignee: ActionProjection = {
      ...mockActionPending,
      assignee: {
        id: 99,
        name: 'Deactivated Staff',
        email: 'deactivated@example.com',
        role: 'IT_STAFF',
      },
    };

    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/actions-taken')) {
        return jsonResponse({
          data: [actionWithInactiveAssignee],
          ticketVersion: 2,
          pagination: { totalItems: 1, page: 1, pageSize: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        });
      }
      if (url.includes('/staff/tickets/owners')) {
        return jsonResponse({ data: mockOwners });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    });

    renderWithAuth(
      <ActionsTakenSection
        ticketId={8}
        ticketVersion={2}
        ticketStatus="OPEN"
        isReadOnly={false}
      />,
      staffUser,
    );

    const reassignBtn = (await screen.findAllByRole('button', { name: /Reassign/i }))[0];
    fireEvent.click(reassignBtn);

    const select = screen.getByLabelText(/New Assignee/);
    expect(select).toHaveValue('');
    expect(select).not.toHaveAttribute('aria-invalid');

    // Click confirm without selecting
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Assignment' }));

    expect(await screen.findByText('Please select a valid active staff or administrator.')).toBeInTheDocument();
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(document.activeElement).toBe(select);
  });
});

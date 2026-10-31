import { expect, test, type Page, type Route } from '@playwright/test';
import { expectReadableTextIndicators } from '../lab-03/visual-assertions';

type Role = 'IT_STAFF' | 'ADMINISTRATOR' | 'REQUESTER';

interface UserMock {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
}

const staff: UserMock = {
  id: 20,
  name: 'Staff One',
  email: 'staff@example.com',
  role: 'IT_STAFF',
  isActive: true,
  mustChangePassword: false,
};

const requester: UserMock = {
  id: 7,
  name: 'Somchai Prasert',
  email: 'somchai@example.com',
  role: 'REQUESTER',
  isActive: true,
  mustChangePassword: false,
};

const category = { id: 1, name: 'Network' };

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

interface ActionState {
  id: number;
  ticketId: number;
  description: string;
  result: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  cancelReason: string | null;
  version: number;
  performedBy: UserMock;
  assignee: UserMock | null;
  createdAt: string;
  updatedAt: string;
}

function installResolutionMockApi(page: Page, currentUser: UserMock = staff) {
  let ticket = {
    id: 8,
    ticketNumber: 'TK-0008',
    ticketDate: '2026-10-14T03:00:00.000Z',
    summary: 'Core switch port flapping in server room',
    category,
    requestedPriority: 'HIGH' as const,
    itPriority: 'HIGH' as const,
    currentStatus: 'OPEN' as const,
    version: 1,
    owner: staff,
    requester,
    description: 'Switch port 12 drops connection periodically.',
    createdAt: '2026-10-14T03:00:00.000Z',
    updatedAt: '2026-10-14T04:00:00.000Z',
    relatedSystem: { id: 2, name: 'Switch' },
    attachments: [],
    comments: [],
    internalNotes: [],
    problemAppearsResolvedAt: null as string | null,
    resolvedAt: null as string | null,
  };

  const actions: ActionState[] = [];
  let nextActionId = 100;

  return page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (method === 'GET' && url.pathname === '/api/auth/me') {
      return json(route, { data: currentUser });
    }

    if (method === 'GET' && url.pathname === '/api/categories') {
      return json(route, { data: [category] });
    }

    if (method === 'GET' && url.pathname === '/api/staff/tickets/owners') {
      return json(route, { data: [staff] });
    }

    if (method === 'GET' && url.pathname === '/api/tickets/8') {
      return json(route, { data: ticket });
    }

    if (method === 'POST' && url.pathname === '/api/tickets/8/problem-appears-resolved') {
      const now = new Date().toISOString();
      ticket.problemAppearsResolvedAt = now;
      return json(route, { data: { problemAppearsResolvedAt: now } });
    }

    if (method === 'GET' && url.pathname === '/api/tickets/8/actions-taken') {
      return json(route, {
        data: actions,
        ticketVersion: ticket.version,
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: actions.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    }

    if (method === 'POST' && url.pathname === '/api/tickets/8/actions-taken') {
      const body = request.postDataJSON() as {
        description: string;
        result?: string | null;
        followUpRequired?: boolean;
        followUpNote?: string | null;
        expectedTicketVersion: number;
      };

      if (body.expectedTicketVersion !== ticket.version) {
        return json(route, { error: { code: 'CONFLICT', message: 'Stale version' } }, 409);
      }

      nextActionId += 1;
      const now = new Date().toISOString();
      const newAction: ActionState = {
        id: nextActionId,
        ticketId: 8,
        description: body.description,
        result: body.result ?? null,
        status: 'PENDING',
        followUpRequired: Boolean(body.followUpRequired),
        followUpNote: body.followUpNote ?? null,
        attachmentNotes: null,
        cancelReason: null,
        version: 1,
        performedBy: currentUser,
        assignee: staff,
        createdAt: now,
        updatedAt: now,
      };
      actions.push(newAction);
      ticket.version += 1;
      ticket.updatedAt = now;

      return json(route, { data: { action: newAction, ticketVersion: ticket.version } }, 201);
    }

    if (method === 'PATCH' && url.pathname.startsWith('/api/tickets/8/actions-taken/') && url.pathname.endsWith('/status')) {
      const body = request.postDataJSON() as {
        status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
        result?: string | null;
        cancelReason?: string | null;
        expectedActionVersion: number;
        expectedTicketVersion: number;
      };

      const parts = url.pathname.split('/');
      const actionId = Number(parts[parts.length - 2]);
      const action = actions.find((a) => a.id === actionId);

      if (!action) {
        return json(route, { error: { code: 'NOT_FOUND', message: 'Action not found' } }, 404);
      }

      const now = new Date().toISOString();
      action.status = body.status;
      if (body.result !== undefined) action.result = body.result;
      if (body.cancelReason !== undefined) action.cancelReason = body.cancelReason;
      action.version += 1;
      action.updatedAt = now;
      ticket.version += 1;
      ticket.updatedAt = now;

      return json(route, { data: { action, ticketVersion: ticket.version } }, 200);
    }

    if (method === 'PATCH' && url.pathname === '/api/tickets/8/status') {
      const body = request.postDataJSON() as {
        status: string;
        confirmed: boolean;
        expectedTicketVersion: number;
      };

      if (body.expectedTicketVersion !== ticket.version) {
        return json(route, { error: { code: 'CONFLICT', message: 'Stale version' } }, 409);
      }

      if (body.status === 'RESOLVED') {
        const hasCompletedWithResult = actions.some(
          (act) => act.status === 'COMPLETED' && typeof act.result === 'string' && act.result.trim().length > 0,
        );
        const hasActiveActions = actions.some(
          (act) => act.status === 'PENDING' || act.status === 'IN_PROGRESS',
        );
        const hasUnresolvedFollowUp = actions.some(
          (act) => act.status !== 'CANCELLED' && act.followUpRequired === true,
        );

        if (!hasCompletedWithResult || hasActiveActions || hasUnresolvedFollowUp) {
          let reason = 'Ticket resolution is blocked by action requirements';
          if (hasActiveActions) {
            reason = 'All actions must be completed or cancelled before resolution';
          } else if (!hasCompletedWithResult) {
            reason = 'At least one completed action with a recorded result is required before resolution';
          } else if (hasUnresolvedFollowUp) {
            reason = 'All follow-up requirements must be resolved before resolution';
          }
          return json(
            route,
            {
              error: {
                code: 'TICKET_RESOLUTION_BLOCKED',
                message: reason,
                fields: { resolutionGate: reason },
              },
              details: [{ field: 'resolutionGate', message: reason }],
            },
            400,
          );
        }
      }

      const now = new Date().toISOString();
      if (body.status === 'CANCELLED') {
        // Child cancellation BR-16
        for (const act of actions) {
          if (act.status === 'PENDING' || act.status === 'IN_PROGRESS') {
            act.status = 'CANCELLED';
            act.cancelReason = 'Ticket cancelled by IT Staff';
            act.version += 1;
            act.updatedAt = now;
          }
        }
      }

      ticket.currentStatus = body.status as any;
      ticket.version += 1;
      ticket.updatedAt = now;

      if (body.status === 'RESOLVED') {
        ticket.resolvedAt = now;
      } else if (body.status === 'REOPENED') {
        ticket.resolvedAt = null;
        ticket.problemAppearsResolvedAt = null;
      }

      return json(route, { data: ticket });
    }

    return route.continue();
  });
}

test.describe('E2E-02: Ticket Resolution Lifecycle, Resolution Gate & Reopen (AC-06)', () => {
  test('full lifecycle: advisory indication -> blocked resolution -> completed action -> resolve -> close -> reopen -> child cancel', async ({
    page,
  }) => {
    // 1. Requester indicates advisory resolution
    await installResolutionMockApi(page, requester);
    await page.goto('/tickets/8');
    await expect(page.getByRole('heading', { name: 'TK-0008' })).toBeVisible();

    const adviseBtn = page.getByRole('button', { name: /Problem Appears Resolved/i });
    await expect(adviseBtn).toBeVisible();
    await adviseBtn.click();
    await expect(page.getByText(/The support team has been notified/i)).toBeVisible();

    // 2. Staff views ticket and attempts to resolve without actions -> BLOCKED
    await installResolutionMockApi(page, staff);
    await page.goto('/staff/tickets/8');
    await expect(page.getByRole('heading', { name: 'TK-0008' })).toBeVisible();

    // Status is OPEN, change to IN_PROGRESS
    const statusSelect = page.getByLabel('Status');
    await statusSelect.selectOption('IN_PROGRESS');
    await expect(statusSelect).toHaveValue('IN_PROGRESS');

    // Attempt to resolve ticket with 0 actions
    await statusSelect.selectOption('RESOLVED');
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();

    // Error banner displayed
    await expect(page.locator('#ticket-status-error')).toBeVisible();
    await expect(page.locator('#ticket-status-error')).toContainText(
      'At least one completed action with a recorded result is required before resolution',
    );
    await expect(statusSelect).toHaveValue('IN_PROGRESS');

    // 3. Create an action and start it
    await page.getByRole('button', { name: /Record First Action/i }).click();
    await page.getByLabel(/Description/i).fill('Inspected network switch and fiber cabling');
    await page.getByRole('button', { name: /Save Action/i }).click();

    const tableRow = page.locator('.actions-taken-table tbody tr').first();
    await expect(tableRow.getByText('Inspected network switch and fiber cabling')).toBeVisible();

    // Start action -> IN_PROGRESS
    await tableRow.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('heading', { name: /Change Status of Action #/ })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(tableRow.getByText('IN_PROGRESS')).toBeVisible();

    // Attempt to resolve while action is IN_PROGRESS -> BLOCKED because active actions are in flight
    await statusSelect.selectOption('RESOLVED');
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
    await expect(page.locator('#ticket-status-error')).toBeVisible();
    await expect(page.locator('#ticket-status-error')).toContainText(
      'All actions must be completed or cancelled before resolution',
    );

    // 4. Complete the action with a valid result
    await tableRow.getByRole('button', { name: 'Complete' }).click();
    await expect(page.getByRole('heading', { name: /Change Status of Action #/ })).toBeVisible();
    await page.getByLabel('Completion Result').fill('Replaced faulty SFP module; link stable.');
    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(tableRow.getByText('COMPLETED')).toBeVisible();
    await expect(tableRow.getByText('Replaced faulty SFP module; link stable.')).toBeVisible();

    // 5. Add a second action that remains active (PENDING) -> BLOCKED by active action check
    await page.getByRole('button', { name: 'Add Action', exact: true }).click();
    await page.getByLabel(/Description/i).fill('Second action still pending inspection');
    await page.getByRole('button', { name: /Save Action/i }).click();

    const secondRow = page.locator('.actions-taken-table tbody tr').nth(1);
    await expect(secondRow.getByText('Second action still pending inspection')).toBeVisible();

    await statusSelect.selectOption('RESOLVED');
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
    await expect(page.locator('#ticket-status-error')).toBeVisible();
    await expect(page.locator('#ticket-status-error')).toContainText(
      'All actions must be completed or cancelled before resolution',
    );

    // Cancel the second action so all actions are completed or cancelled
    await secondRow.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: /Change Status of Action #/ })).toBeVisible();
    await page.getByLabel('Cancellation Reason').fill('No longer needed');
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(secondRow.getByText('CANCELLED')).toBeVisible();

    // 6. Resolve the ticket -> SUCCEEDS
    await statusSelect.selectOption('RESOLVED');
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();

    await expect(page.getByText('Ticket status updated.')).toBeVisible();
    await expect(page.locator('.ticket-detail-badge', { hasText: 'Status' })).toContainText('RESOLVED');
    await expect(page.getByText('Resolved At')).toBeVisible();

    // 7. Close the ticket -> SUCCEEDS and preserves Resolved At
    await statusSelect.selectOption('CLOSED');
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();

    await expect(page.locator('.ticket-detail-badge', { hasText: 'Status' })).toContainText('CLOSED');
    await expect(page.getByText('Resolved At')).toBeVisible();

    // 8. Reopen the ticket -> clears Resolved At and Problem Appears Resolved
    await statusSelect.selectOption('REOPENED');
    const reopenModal = page.getByRole('dialog');
    await expect(reopenModal).toContainText('preserve all past action and event history');
    await reopenModal.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.locator('.ticket-detail-badge', { hasText: 'Status' })).toContainText('REOPENED');
    await expect(page.getByText('Not resolved')).toBeVisible();
    await expect(page.getByText('Not indicated')).toBeVisible();

    // 9. Move to IN_PROGRESS, create another pending action, then CANCEL ticket
    await statusSelect.selectOption('IN_PROGRESS');

    await page.getByRole('button', { name: 'Add Action', exact: true }).click();
    await page.getByLabel(/Description/i).fill('Pending follow-up check on switch temperature');
    await page.getByRole('button', { name: /Save Action/i }).click();

    const thirdRow = page.locator('.actions-taken-table tbody tr').nth(2);
    await expect(thirdRow.getByText('Pending follow-up check on switch temperature')).toBeVisible();

    // Cancel ticket -> atomically cancels the active action
    await statusSelect.selectOption('CANCELLED');
    const cancelModal = page.getByRole('dialog');
    await expect(cancelModal).toContainText('cancel any active child actions');
    await cancelModal.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.locator('.ticket-detail-badge', { hasText: 'Status' })).toContainText('CANCELLED');
    await expect(thirdRow.getByText('Ticket cancelled by IT Staff')).toBeVisible();

    // Verify visual contrast
    await expectReadableTextIndicators(page);
  });
});

import path from 'node:path';
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

const staffOne: UserMock = {
  id: 20,
  name: 'Staff One',
  email: 'staff@example.com',
  role: 'IT_STAFF',
  isActive: true,
  mustChangePassword: false,
};

const staffTwo: UserMock = {
  id: 21,
  name: 'Staff Two',
  email: 'staff2@example.com',
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

const categories = [{ id: 1, name: 'Network' }];

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

function initialTicket() {
  return {
    id: 8,
    ticketNumber: 'TK-0008',
    ticketDate: '2026-09-12T03:00:00.000Z',
    summary: 'VPN access unavailable from corporate network',
    category: categories[0],
    requestedPriority: 'HIGH',
    itPriority: 'MEDIUM',
    currentStatus: 'OPEN',
    version: 1,
    owner: staffOne,
    requester: { id: 7, name: 'Somchai Prasert', email: 'somchai@example.com', role: 'REQUESTER' },
    description: 'VPN disconnects every 5 minutes during remote session.',
    createdAt: '2026-09-12T03:00:00.000Z',
    updatedAt: '2026-09-12T04:00:00.000Z',
    relatedSystem: { id: 2, name: 'VPN' },
    attachments: [],
    comments: [],
    internalNotes: [],
    problemAppearsResolvedAt: null,
    resolvedAt: null,
  };
}

interface ActionMock {
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

async function installActionsMockApi(
  page: Page,
  currentUser: UserMock = staffOne,
  initialActions: ActionMock[] = [],
) {
  let ticketVersion = 1;
  const actions: ActionMock[] = [...initialActions];
  let nextActionId = 101 + initialActions.length;

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (method === 'GET' && url.pathname === '/api/auth/me') {
      return json(route, { data: currentUser });
    }

    if (method === 'GET' && url.pathname === '/api/categories') {
      return json(route, { data: categories });
    }

    if (method === 'GET' && url.pathname === '/api/staff/tickets/owners') {
      return json(route, { data: [staffOne, staffTwo] });
    }

    if (method === 'GET' && url.pathname === '/api/tickets/8') {
      return json(route, { data: { ...initialTicket(), version: ticketVersion } });
    }

    if (method === 'GET' && url.pathname === '/api/tickets/8/actions-taken') {
      return json(route, {
        data: [...actions].sort((a, b) => a.id - b.id),
        ticketVersion,
        pagination: {
          page: 1,
          pageSize: 20,
          total: actions.length,
          totalItems: actions.length,
          totalPages: 1,
        },
      });
    }

    // POST create action
    if (method === 'POST' && url.pathname === '/api/tickets/8/actions-taken') {
      const body = JSON.parse(request.postData() || '{}');
      ticketVersion += 1;
      const newAction: ActionMock = {
        id: nextActionId++,
        ticketId: 8,
        description: body.description,
        result: body.result || null,
        status: 'PENDING',
        followUpRequired: Boolean(body.followUpRequired),
        followUpNote: body.followUpNote || null,
        attachmentNotes: body.attachmentNotes || null,
        cancelReason: null,
        version: 1,
        performedBy: currentUser,
        assignee: body.assigneeId === staffTwo.id ? staffTwo : staffOne,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      actions.push(newAction);
      return json(route, { data: { action: newAction, ticketVersion } }, 201);
    }

    // PATCH edit action
    const editMatch = url.pathname.match(/^\/api\/tickets\/8\/actions-taken\/(\d+)$/);
    if (method === 'PATCH' && editMatch) {
      const actionId = Number(editMatch[1]);
      const body = JSON.parse(request.postData() || '{}');
      const actionIndex = actions.findIndex((a) => a.id === actionId);
      if (actionIndex >= 0) {
        ticketVersion += 1;
        const current = actions[actionIndex];
        const updated: ActionMock = {
          ...current,
          description: body.description ?? current.description,
          result: body.result ?? current.result,
          followUpRequired: body.followUpRequired ?? current.followUpRequired,
          followUpNote: body.followUpNote ?? current.followUpNote,
          attachmentNotes: body.attachmentNotes ?? current.attachmentNotes,
          version: current.version + 1,
          updatedAt: new Date().toISOString(),
        };
        actions[actionIndex] = updated;
        return json(route, { data: { action: updated, ticketVersion } });
      }
    }

    // PATCH reassign action
    const assigneeMatch = url.pathname.match(/^\/api\/tickets\/8\/actions-taken\/(\d+)\/assignee$/);
    if (method === 'PATCH' && assigneeMatch) {
      const actionId = Number(assigneeMatch[1]);
      const body = JSON.parse(request.postData() || '{}');
      const actionIndex = actions.findIndex((a) => a.id === actionId);
      if (actionIndex >= 0) {
        ticketVersion += 1;
        const current = actions[actionIndex];
        const newAssignee = body.assigneeId === staffTwo.id ? staffTwo : staffOne;
        const updated: ActionMock = {
          ...current,
          assignee: newAssignee,
          version: current.version + 1,
          updatedAt: new Date().toISOString(),
        };
        actions[actionIndex] = updated;
        return json(route, { data: { action: updated, ticketVersion } });
      }
    }

    // PATCH status transition
    const statusMatch = url.pathname.match(/^\/api\/tickets\/8\/actions-taken\/(\d+)\/status$/);
    if (method === 'PATCH' && statusMatch) {
      const actionId = Number(statusMatch[1]);
      const body = JSON.parse(request.postData() || '{}');
      const actionIndex = actions.findIndex((a) => a.id === actionId);
      if (actionIndex >= 0) {
        ticketVersion += 1;
        const current = actions[actionIndex];
        const updated: ActionMock = {
          ...current,
          status: body.status,
          result: body.result ?? current.result,
          cancelReason: body.cancelReason ?? current.cancelReason,
          version: current.version + 1,
          updatedAt: new Date().toISOString(),
        };
        actions[actionIndex] = updated;
        return json(route, { data: { action: updated, ticketVersion } });
      }
    }

    return json(route, { error: { code: 'UNHANDLED', message: `${method} ${url.pathname}` } }, 404);
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport);
}

test.describe('Lab 4 Actions Taken Lifecycle E2E Flow (E2E-01)', () => {
  test('Staff can create, start, reassign, edit, and complete actions on active ticket', async ({ page }) => {
    await installActionsMockApi(page, staffOne);

    await page.goto('/staff/tickets/8');
    await expect(page.getByRole('heading', { name: 'TK-0008' })).toBeVisible();

    // Verify Actions Taken section
    const actionsSection = page.getByTestId('actions-taken-section');
    await expect(actionsSection).toBeVisible();
    await expect(actionsSection.getByRole('heading', { name: 'Actions Taken' })).toBeVisible();

    // 1. Create a new Action Taken
    await actionsSection.getByRole('button', { name: 'Add Action', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'New Action Taken' })).toBeVisible();

    await page.getByLabel('Description').fill('Inspect SSL certificates on edge gateway');
    await page.getByLabel('Follow-Up Required').check();
    await page.getByLabel('Follow-up Note').fill('Check CRL revocation list expiry next week');
    await page.getByLabel('Attachment Notes').fill('Refers to network diagnostic dump');
    await page.getByRole('button', { name: 'Save Action' }).click();

    await expect(page.getByText('Action created successfully.')).toBeVisible();
    const tableRow = page.locator('.actions-taken-table tbody tr').first();
    await expect(tableRow.getByText('Inspect SSL certificates on edge gateway')).toBeVisible();
    await expect(tableRow.getByText('PENDING')).toBeVisible();

    // 2. Start the action (transition to IN_PROGRESS)
    await tableRow.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('heading', { name: /Change Status of Action #101/ })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.getByText('Action status changed to IN_PROGRESS.')).toBeVisible();
    await expect(tableRow.getByText('IN_PROGRESS')).toBeVisible();

    // 3. Reassign the action to Staff Two
    await tableRow.getByRole('button', { name: 'Reassign' }).click();
    await expect(page.getByRole('heading', { name: 'Reassign Action #101' })).toBeVisible();
    await page.getByLabel('New Assignee').selectOption('21');
    await page.getByRole('button', { name: 'Confirm Assignment' }).click();

    await expect(page.getByText('Action reassigned successfully.')).toBeVisible();
    await expect(tableRow.getByText('Staff Two')).toBeVisible();

    // 4. Edit the action
    await tableRow.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Action #101' })).toBeVisible();
    await page.getByLabel('Description').fill('Inspect and renew SSL certificates on edge gateway');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByText('Action updated successfully.')).toBeVisible();
    await expect(tableRow.getByText('Inspect and renew SSL certificates on edge gateway')).toBeVisible();

    // 5. Complete the action
    await tableRow.getByRole('button', { name: 'Complete' }).click();
    await expect(page.getByRole('heading', { name: /Change Status of Action #101/ })).toBeVisible();
    await page.getByLabel('Completion Result').fill('Certs renewed and services restarted without drop');
    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.getByText('Action status changed to COMPLETED.')).toBeVisible();
    await expect(tableRow.getByText('COMPLETED')).toBeVisible();
    await expect(tableRow.getByText('Certs renewed and services restarted without drop')).toBeVisible();

    // 6. Create a second action and cancel it
    await actionsSection.getByRole('button', { name: 'Add Action', exact: true }).click();
    await page.getByLabel('Description').fill('Physical inspection of rack switches');
    await page.getByRole('button', { name: 'Save Action' }).click();

    await expect(page.getByText('Action created successfully.')).toBeVisible();
    const secondRow = page.locator('.actions-taken-table tbody tr').nth(1);
    await expect(secondRow.getByText('Physical inspection of rack switches')).toBeVisible();

    await secondRow.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: /Change Status of Action #102/ })).toBeVisible();
    await page.getByLabel('Cancellation Reason').fill('Remote diagnostics confirmed physical hardware is healthy');
    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.getByText('Action status changed to CANCELLED.')).toBeVisible();
    await expect(secondRow.getByText('CANCELLED')).toBeVisible();
    await expect(secondRow.getByText('Remote diagnostics confirmed physical hardware is healthy')).toBeVisible();

    await expectNoHorizontalOverflow(page);
    await expectReadableTextIndicators(page);
  });

  test('Requester has strictly read-only view with no mutation controls (AC-05)', async ({ page }) => {
    await installActionsMockApi(page, requester);

    await page.goto('/tickets/8');
    await expect(page.getByRole('heading', { name: 'TK-0008' })).toBeVisible();

    const actionsSection = page.getByTestId('actions-taken-section');
    await expect(actionsSection).toBeVisible();
    await expect(actionsSection.getByRole('heading', { name: 'Actions Taken' })).toBeVisible();

    // Verify zero mutation affordances
    await expect(actionsSection.getByRole('button', { name: 'Add Action', exact: true })).toHaveCount(0);
    await expect(actionsSection.getByRole('button', { name: /Edit/i })).toHaveCount(0);
    await expect(actionsSection.getByRole('button', { name: /Reassign/i })).toHaveCount(0);
    await expect(actionsSection.getByRole('button', { name: /Start/i })).toHaveCount(0);
    await expect(actionsSection.getByRole('button', { name: /Complete/i })).toHaveCount(0);
    await expect(actionsSection.getByRole('button', { name: /Cancel/i })).toHaveCount(0);
  });

  test('Actions Taken section meets responsive layout and 44px mobile touch target requirements', async ({ page }) => {
    const sampleAction: ActionMock = {
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
      performedBy: staffOne,
      assignee: staffOne,
      createdAt: '2026-10-14T03:00:00.000Z',
      updatedAt: '2026-10-14T03:00:00.000Z',
    };

    await installActionsMockApi(page, staffOne, [sampleAction]);

    for (const width of [1280, 768, 375]) {
      await page.setViewportSize({ width, height: 812 });
      await page.goto('/staff/tickets/8');

      const actionsSection = page.getByTestId('actions-taken-section');
      await expect(actionsSection).toBeVisible();
      await expectNoHorizontalOverflow(page);

      if (width < 768) {
        // Mobile cards should be visible, desktop table wrapper hidden
        await expect(page.locator('.actions-taken-cards')).toBeVisible();
        await expect(page.locator('.actions-taken-table-wrap')).toBeHidden();

        // Check 44px minimum touch targets on mobile interactive controls
        const shortTouchTargets = await page
          .locator('.actions-taken-section button, .actions-taken-section a.btn')
          .evaluateAll((elements) =>
            elements
              .filter((element) => {
                const style = window.getComputedStyle(element);
                const bounds = element.getBoundingClientRect();
                return (
                  style.display !== 'none' &&
                  style.visibility !== 'hidden' &&
                  bounds.width > 0 &&
                  bounds.height > 0
                );
              })
              .map((element) => Math.round(element.getBoundingClientRect().height))
              .filter((height) => height < 44),
          );
        expect(shortTouchTargets).toEqual([]);
      } else {
        // Desktop/Tablet table visible, cards hidden
        await expect(page.locator('.actions-taken-table-wrap')).toBeVisible();
        await expect(page.locator('.actions-taken-cards')).toBeHidden();
      }
    }
  });

  test('Multiple actions created by different staff members on the same ticket are visible to Requester with distinct authors (E2E-01)', async ({ page }) => {
    const actionByStaffOne: ActionMock = {
      id: 101,
      ticketId: 8,
      description: 'Initial network diagnostic run by Staff One',
      result: 'Diagnostic logs captured',
      status: 'COMPLETED',
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: null,
      cancelReason: null,
      version: 1,
      performedBy: staffOne,
      assignee: staffOne,
      createdAt: '2026-10-14T03:00:00.000Z',
      updatedAt: '2026-10-14T03:30:00.000Z',
    };
    const actionByStaffTwo: ActionMock = {
      id: 102,
      ticketId: 8,
      description: 'Firewall rules reconfigured by Staff Two',
      result: null,
      status: 'IN_PROGRESS',
      followUpRequired: true,
      followUpNote: 'Verify tunnel stability tomorrow',
      attachmentNotes: 'Rules config attached',
      cancelReason: null,
      version: 1,
      performedBy: staffTwo,
      assignee: staffTwo,
      createdAt: '2026-10-14T04:00:00.000Z',
      updatedAt: '2026-10-14T04:15:00.000Z',
    };

    await installActionsMockApi(page, requester, [actionByStaffOne, actionByStaffTwo]);

    await page.goto('/tickets/8');
    await expect(page.getByRole('heading', { name: 'TK-0008' })).toBeVisible();

    const actionsSection = page.getByTestId('actions-taken-section');
    await expect(actionsSection).toBeVisible();
    const actionsTable = actionsSection.locator('.actions-taken-table');
    const firstRow = actionsTable.locator('tbody tr').nth(0);
    const secondRow = actionsTable.locator('tbody tr').nth(1);

    await expect(firstRow.getByText('Initial network diagnostic run by Staff One')).toBeVisible();
    await expect(firstRow.getByText(/By: Staff One/)).toBeVisible();

    await expect(secondRow.getByText('Firewall rules reconfigured by Staff Two')).toBeVisible();
    await expect(secondRow.getByText(/By: Staff Two/)).toBeVisible();
  });
});

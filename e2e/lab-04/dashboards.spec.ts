import { expect, test, type Page, type Route } from '@playwright/test';

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

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

function installDashboardMockApi(page: Page, currentUser: UserMock) {
  return page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (path === '/api/auth/me') {
      return json(route, { data: currentUser });
    }

    if (path === '/api/categories') {
      return json(route, { data: [{ id: 1, name: 'Network' }, { id: 2, name: 'Hardware' }] });
    }

    if (path === '/api/dashboards/requester') {
      if (currentUser.role !== 'REQUESTER') {
        return json(route, { error: { message: 'Forbidden' } }, 403);
      }
      return json(route, {
        metrics: {
          openTickets: 3,
          waitingForYou: 1,
          recentlyUpdated: 2,
          recentlyResolved: 1,
        },
        recentTickets: [
          {
            id: 101,
            ticketNumber: 'TK-0101',
            summary: 'VPN disconnects frequently',
            currentStatus: 'IN_PROGRESS',
            itPriority: 'HIGH',
            updatedAt: '2026-10-18T05:30:00.000Z',
            resolvedAt: null,
          },
        ],
        attentionTickets: [
          {
            id: 102,
            ticketNumber: 'TK-0102',
            summary: 'Need clarification on printer model',
            currentStatus: 'WAITING_FOR_REQUESTER',
            itPriority: 'MEDIUM',
            updatedAt: '2026-10-18T04:15:00.000Z',
            resolvedAt: null,
          },
        ],
        resolvedTickets: [
          {
            id: 103,
            ticketNumber: 'TK-0103',
            summary: 'Password reset completed',
            currentStatus: 'RESOLVED',
            itPriority: 'LOW',
            updatedAt: '2026-10-17T08:00:00.000Z',
            resolvedAt: '2026-10-17T08:00:00.000Z',
          },
        ],
        generatedAt: '2026-10-18T06:00:00.000Z',
        timezone: 'Asia/Bangkok',
        window: {
          from: '2026-10-12T00:00:00.000+07:00',
          to: '2026-10-18T06:00:00.000+07:00',
        },
        listLimit: 5,
      });
    }

    if (path === '/api/dashboards/staff') {
      if (currentUser.role === 'REQUESTER') {
        return json(route, { error: { message: 'Forbidden' } }, 403);
      }
      return json(route, {
        metrics: {
          unassignedTickets: 4,
          myTickets: 2,
          myActionsTaken: 3,
          ticketsByStatus: {
            NEW: 4,
            OPEN: 2,
            IN_PROGRESS: 3,
            WAITING_FOR_REQUESTER: 1,
            RESOLVED: 2,
            CLOSED: 5,
            REOPENED: 0,
            CANCELLED: 1,
          },
          activeTicketsByItPriority: {
            LOW: 1,
            MEDIUM: 3,
            HIGH: 4,
            CRITICAL: 2,
          },
        },
        urgentTickets: [
          {
            id: 201,
            ticketNumber: 'TK-0201',
            summary: 'Data center core switch loop',
            currentStatus: 'IN_PROGRESS',
            itPriority: 'CRITICAL',
            updatedAt: '2026-10-18T05:00:00.000Z',
            resolvedAt: null,
          },
        ],
        recentTickets: [
          {
            id: 202,
            ticketNumber: 'TK-0202',
            summary: 'Mail routing delayed',
            currentStatus: 'OPEN',
            itPriority: 'HIGH',
            updatedAt: '2026-10-18T04:00:00.000Z',
            resolvedAt: null,
          },
        ],
        myActions: [
          {
            id: 301,
            ticketId: 201,
            description: 'Check spanning tree protocol configuration',
            status: 'IN_PROGRESS',
            createdAt: '2026-10-18T05:15:00.000Z',
            ticket: {
              id: 201,
              ticketNumber: 'TK-0201',
              summary: 'Data center core switch loop',
              currentStatus: 'IN_PROGRESS',
            },
          },
        ],
        generatedAt: '2026-10-18T06:00:00.000Z',
        timezone: 'Asia/Bangkok',
        window: {
          from: '2026-10-12T00:00:00.000+07:00',
          to: '2026-10-18T06:00:00.000+07:00',
        },
        listLimit: 5,
      });
    }

    if (path === '/api/staff/actions-taken') {
      if (currentUser.role === 'REQUESTER') {
        return json(route, { error: { message: 'Forbidden' } }, 403);
      }
      return json(route, {
        data: [
          {
            id: 301,
            ticketId: 201,
            description: 'Check spanning tree protocol configuration',
            status: 'IN_PROGRESS',
            createdAt: '2026-10-18T05:15:00.000Z',
            ticket: {
              id: 201,
              ticketNumber: 'TK-0201',
              summary: 'Data center core switch loop',
              currentStatus: 'IN_PROGRESS',
            },
          },
          {
            id: 302,
            ticketId: 202,
            description: 'Review MX backup relay queues',
            status: 'PENDING',
            createdAt: '2026-10-18T05:25:00.000Z',
            ticket: {
              id: 202,
              ticketNumber: 'TK-0202',
              summary: 'Mail routing delayed',
              currentStatus: 'OPEN',
            },
          },
        ],
        pagination: {
          page: 1,
          pageSize: 10,
          totalItems: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    }

    if (path === '/api/tickets' || path.startsWith('/api/tickets/')) {
      if (path === '/api/tickets/101') {
        return json(route, {
          data: {
            id: 101,
            ticketNumber: 'TK-0101',
            summary: 'VPN disconnects frequently',
            description: 'Happens every 10 minutes',
            requestedPriority: 'HIGH',
            itPriority: 'HIGH',
            currentStatus: 'IN_PROGRESS',
            ticketDate: '2026-10-18T05:00:00.000Z',
            updatedAt: '2026-10-18T05:30:00.000Z',
            category: { id: 1, name: 'Network' },
            actionsTaken: [],
            attachments: [],
            publicComments: [],
          },
        });
      }
      return json(route, {
        data: [
          {
            id: 101,
            ticketNumber: 'TK-0101',
            summary: 'VPN disconnects frequently',
            requestedPriority: 'HIGH',
            currentStatus: 'IN_PROGRESS',
            ticketDate: '2026-10-18T05:00:00.000Z',
            category: { id: 1, name: 'Network' },
            updatedAt: '2026-10-18T05:30:00.000Z',
          },
        ],
        pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
      });
    }

    if (path === '/api/staff/tickets' || path.startsWith('/api/staff/tickets/')) {
      if (path === '/api/staff/tickets/201') {
        return json(route, {
          data: {
            id: 201,
            ticketNumber: 'TK-0201',
            summary: 'Data center core switch loop',
            description: 'Broadcast storm detected',
            requestedPriority: 'CRITICAL',
            itPriority: 'CRITICAL',
            currentStatus: 'IN_PROGRESS',
            owner: staff,
            requester,
            ticketDate: '2026-10-18T04:30:00.000Z',
            updatedAt: '2026-10-18T05:00:00.000Z',
            category: { id: 1, name: 'Network' },
            actionsTaken: [],
            attachments: [],
            publicComments: [],
            internalNotes: [],
            version: 2,
          },
        });
      }
      return json(route, {
        data: [
          {
            id: 201,
            ticketNumber: 'TK-0201',
            summary: 'Data center core switch loop',
            requestedPriority: 'CRITICAL',
            itPriority: 'CRITICAL',
            currentStatus: 'IN_PROGRESS',
            owner: staff,
            requester,
            ticketDate: '2026-10-18T04:30:00.000Z',
            updatedAt: '2026-10-18T05:00:00.000Z',
            category: { id: 1, name: 'Network' },
          },
        ],
        pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
      });
    }

    return route.continue();
  });
}

test.describe('E2E-03: Role Dashboards and Drill-down Navigation (AC-07, AC-08, AC-10)', () => {
  test('Requester dashboard: home redirection, metric cards, preview lists, and drilldown', async ({ page }) => {
    await installDashboardMockApi(page, requester);

    // 1. Home redirection
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard\/?$/);
    await expect(page.getByRole('heading', { name: 'Requester Dashboard' })).toBeVisible();

    // 2. Metrics displayed
    await expect(page.getByText('3', { exact: true }).first()).toBeVisible(); // Open tickets count
    await expect(page.getByText('1', { exact: true }).first()).toBeVisible(); // Waiting for you count

    // 3. Drilldown to Open Tickets
    await page.getByRole('link', { name: 'View Open Tickets' }).click();
    await expect(page).toHaveURL(/\/tickets\?statuses=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED/);
    await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible();

    // 4. Return to dashboard and click preview row
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Requester Dashboard' })).toBeVisible();
    await page.getByRole('link', { name: 'TK-0101' }).click();
    await expect(page).toHaveURL(/\/tickets\/101/);
  });

  test('Staff dashboard: home redirection, operational cards, breakdown grids, and queue drilldown', async ({ page }) => {
    await installDashboardMockApi(page, staff);

    // 1. Home redirection
    await page.goto('/');
    await expect(page).toHaveURL(/\/staff\/dashboard\/?$/);
    await expect(page.getByRole('heading', { name: 'Staff Dashboard' })).toBeVisible();

    // 2. Core cards
    await expect(page.getByText('Unassigned Tickets', { exact: true })).toBeVisible();
    await expect(page.getByText('My Tickets', { exact: true })).toBeVisible();
    await expect(page.getByText('My Actions Taken', { exact: true })).toBeVisible();

    // 3. Drilldown to Unassigned queue
    await page.getByRole('link', { name: 'View Unassigned' }).click();
    await expect(page).toHaveURL(/ownerId=unassigned/);
    await expect(page.getByRole('heading', { name: 'Staff Ticket Queue' })).toBeVisible();

    // 4. Return to dashboard and drilldown to Assigned Actions
    await page.goto('/staff/dashboard');
    await page.getByRole('link', { name: 'View Assigned Actions' }).click();
    await expect(page).toHaveURL(/\/staff\/actions-taken\?assignee=me/);
    await expect(page.getByRole('heading', { name: 'My Actions Taken' })).toBeVisible();

    // 5. Actions taken list shows items and links to ticket
    await expect(page.getByText('Check spanning tree protocol configuration').first()).toBeVisible();
    await page.getByRole('link', { name: 'TK-0201' }).first().click();
    await expect(page).toHaveURL(/\/staff\/tickets\/201/);
  });

  test('Role guards prevent unauthorized cross-role dashboard access', async ({ page }) => {
    // Requester cannot access staff dashboard
    await installDashboardMockApi(page, requester);
    await page.goto('/staff/dashboard');
    await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible();

    // Staff cannot access requester dashboard
    await installDashboardMockApi(page, staff);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible();
  });
});

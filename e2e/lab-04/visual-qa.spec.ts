import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page, type Route } from '@playwright/test';
import { expectReadableTextIndicators } from '../lab-03/visual-assertions';

const ARTIFACTS_DIR = path.resolve(__dirname, '../../artifacts/lab-04/screenshots');

const viewports = [
  { width: 1280, height: 812, label: '1280' },
  { width: 768, height: 812, label: '768' },
  { width: 375, height: 812, label: '375' },
];

function ensureDir(subDir: string): string {
  const dir = path.join(ARTIFACTS_DIR, subDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

interface UserMock {
  id: number;
  name: string;
  email: string;
  role: 'IT_STAFF' | 'ADMINISTRATOR' | 'REQUESTER';
  isActive: boolean;
  mustChangePassword: boolean;
}

const staffUser: UserMock = {
  id: 20,
  name: 'Pimchanok IT Staff',
  email: 'pimchanok.staff@toktickit.local',
  role: 'IT_STAFF',
  isActive: true,
  mustChangePassword: false,
};

const requesterUser: UserMock = {
  id: 7,
  name: 'Somchai Requester',
  email: 'somchai.requester@toktickit.local',
  role: 'REQUESTER',
  isActive: true,
  mustChangePassword: false,
};

const adminUser: UserMock = {
  id: 1,
  name: 'Araya Admin',
  email: 'araya.admin@toktickit.local',
  role: 'ADMINISTRATOR',
  isActive: true,
  mustChangePassword: false,
};

test.describe('Lab 4 Visual QA, Screenshots & Responsive Assertions (AC-12, UI-05)', () => {
  test.beforeAll(() => {
    ensureDir('requester-dashboard');
    ensureDir('staff-dashboard');
    ensureDir('actions-taken');
    ensureDir('ticket-workflow');
    ensureDir('regression');
  });

  test('1. Requester Dashboard: Viewports (1280, 768, 375), Loading, Empty, and Error states', async ({ page }) => {
    let mode: 'normal' | 'loading' | 'empty' | 'error' = 'normal';

    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;

      if (path === '/api/auth/me') {
        return json(route, { data: requesterUser });
      }

      if (path === '/api/dashboards/requester') {
        if (mode === 'loading') {
          // Delay response
          await new Promise((r) => setTimeout(r, 2000));
        }
        if (mode === 'error') {
          return json(route, { error: { message: 'Failed to load requester dashboard metrics' } }, 500);
        }
        if (mode === 'empty') {
          return json(route, {
            metrics: { openTickets: 0, waitingForYou: 0, recentlyUpdated: 0, recentlyResolved: 0 },
            recentTickets: [],
            attentionTickets: [],
            resolvedTickets: [],
            generatedAt: '2026-10-18T06:00:00.000Z',
            timezone: 'Asia/Bangkok',
            window: { from: '2026-10-12T00:00:00.000+07:00', to: '2026-10-18T06:00:00.000+07:00' },
            listLimit: 5,
          });
        }
        return json(route, {
          metrics: { openTickets: 4, waitingForYou: 2, recentlyUpdated: 3, recentlyResolved: 2 },
          recentTickets: [
            {
              id: 101,
              ticketNumber: 'TK-0101',
              summary: 'VPN disconnects frequently during remote sessions',
              currentStatus: 'IN_PROGRESS',
              itPriority: 'HIGH',
              updatedAt: '2026-10-18T05:30:00.000Z',
              resolvedAt: null,
            },
            {
              id: 104,
              ticketNumber: 'TK-0104',
              summary: 'Request access to Tokyo office shared folder',
              currentStatus: 'OPEN',
              itPriority: 'MEDIUM',
              updatedAt: '2026-10-17T11:20:00.000Z',
              resolvedAt: null,
            },
          ],
          attentionTickets: [
            {
              id: 102,
              ticketNumber: 'TK-0102',
              summary: 'Need clarification on printer model serial number',
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
              summary: 'Self-service password reset completed',
              currentStatus: 'RESOLVED',
              itPriority: 'LOW',
              updatedAt: '2026-10-17T08:00:00.000Z',
              resolvedAt: '2026-10-17T08:00:00.000Z',
            },
          ],
          generatedAt: '2026-10-18T06:00:00.000Z',
          timezone: 'Asia/Bangkok',
          window: { from: '2026-10-12T00:00:00.000+07:00', to: '2026-10-18T06:00:00.000+07:00' },
          listLimit: 5,
        });
      }

      return route.continue();
    });

    // 1. Viewport captures (1280, 768, 375)
    mode = 'normal';
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { name: 'Requester Dashboard' })).toBeVisible();

      // Check no horizontal scroll
      const isScrollable = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(isScrollable).toBe(false);

      await expectReadableTextIndicators(page);

      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, `requester-dashboard/${vp.label}.png`),
        fullPage: true,
      });
    }

    // 2. Empty State
    mode = 'empty';
    await page.setViewportSize({ width: 1280, height: 812 });
    await page.goto('/dashboard');
    await expect(page.getByText('No recent tickets found.')).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'requester-dashboard/empty.png'),
      fullPage: true,
    });

    // 3. Error State
    mode = 'error';
    await page.goto('/dashboard');
    await expect(page.locator('.alert.alert-danger')).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'requester-dashboard/error.png'),
      fullPage: true,
    });

    // 4. Loading State
    mode = 'loading';
    const navigatePromise = page.goto('/dashboard');
    await expect(page.getByText('Loading dashboard metrics...')).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'requester-dashboard/loading.png'),
      fullPage: true,
    });
    await navigatePromise;
  });

  test('2. Staff Dashboard: Viewports (1280, 768, 375), Loading, Zero-Groups, and Error states', async ({ page }) => {
    let mode: 'normal' | 'loading' | 'zero-groups' | 'error' = 'normal';

    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;

      if (path === '/api/auth/me') {
        return json(route, { data: staffUser });
      }

      if (path === '/api/dashboards/staff') {
        if (mode === 'loading') {
          await new Promise((r) => setTimeout(r, 2000));
        }
        if (mode === 'error') {
          return json(route, { error: { message: 'Failed to calculate staff operational dashboard' } }, 500);
        }
        if (mode === 'zero-groups') {
          return json(route, {
            metrics: {
              unassignedTickets: 0,
              myTickets: 0,
              myActionsTaken: 0,
              ticketsByStatus: {
                NEW: 0, OPEN: 0, IN_PROGRESS: 0, WAITING_FOR_REQUESTER: 0,
                RESOLVED: 0, CLOSED: 0, REOPENED: 0, CANCELLED: 0,
              },
              activeTicketsByItPriority: {
                LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0,
              },
            },
            urgentTickets: [],
            recentTickets: [],
            myActions: [],
            generatedAt: '2026-10-18T06:00:00.000Z',
            timezone: 'Asia/Bangkok',
            window: { from: '2026-10-12T00:00:00.000+07:00', to: '2026-10-18T06:00:00.000+07:00' },
            listLimit: 5,
          });
        }
        return json(route, {
          metrics: {
            unassignedTickets: 5,
            myTickets: 3,
            myActionsTaken: 4,
            ticketsByStatus: {
              NEW: 5, OPEN: 4, IN_PROGRESS: 3, WAITING_FOR_REQUESTER: 2,
              RESOLVED: 8, CLOSED: 14, REOPENED: 1, CANCELLED: 2,
            },
            activeTicketsByItPriority: {
              LOW: 2, MEDIUM: 5, HIGH: 4, CRITICAL: 3,
            },
          },
          urgentTickets: [
            {
              id: 201,
              ticketNumber: 'TK-0201',
              summary: 'Core distribution switch loop in Data Center B',
              currentStatus: 'IN_PROGRESS',
              itPriority: 'CRITICAL',
              updatedAt: '2026-10-18T05:00:00.000Z',
              resolvedAt: null,
            },
            {
              id: 204,
              ticketNumber: 'TK-0204',
              summary: 'Exchange relay mail queue backlogged',
              currentStatus: 'OPEN',
              itPriority: 'HIGH',
              updatedAt: '2026-10-18T04:40:00.000Z',
              resolvedAt: null,
            },
          ],
          recentTickets: [
            {
              id: 202,
              ticketNumber: 'TK-0202',
              summary: 'VPN gateway latency spike on tunnel 02',
              currentStatus: 'IN_PROGRESS',
              itPriority: 'HIGH',
              updatedAt: '2026-10-18T04:30:00.000Z',
              resolvedAt: null,
            },
          ],
          myActions: [
            {
              id: 301,
              ticketId: 201,
              description: 'Inspect spanning-tree BPDU guard logs on switch ports',
              status: 'IN_PROGRESS',
              createdAt: '2026-10-18T05:15:00.000Z',
              ticket: {
                id: 201,
                ticketNumber: 'TK-0201',
                summary: 'Core distribution switch loop in Data Center B',
                currentStatus: 'IN_PROGRESS',
              },
            },
          ],
          generatedAt: '2026-10-18T06:00:00.000Z',
          timezone: 'Asia/Bangkok',
          window: { from: '2026-10-12T00:00:00.000+07:00', to: '2026-10-18T06:00:00.000+07:00' },
          listLimit: 5,
        });
      }

      return route.continue();
    });

    // 1. Viewports (1280, 768, 375)
    mode = 'normal';
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/staff/dashboard');
      await expect(page.getByRole('heading', { name: 'Staff Dashboard' })).toBeVisible();

      const dimensions = await page.evaluate(() => {
        const docW = document.documentElement.scrollWidth;
        const winW = window.innerWidth;
        const overflowing = Array.from(document.querySelectorAll('*'))
          .filter((el) => el.getBoundingClientRect().right > winW + 1)
          .map((el) => ({ tag: el.tagName, className: el.className, right: el.getBoundingClientRect().right }));
        return { docW, winW, overflowing };
      });
      expect(dimensions.docW).toBeLessThanOrEqual(dimensions.winW);

      await expectReadableTextIndicators(page);

      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, `staff-dashboard/${vp.label}.png`),
        fullPage: true,
      });
    }

    // 2. Zero-Groups state
    mode = 'zero-groups';
    await page.setViewportSize({ width: 1280, height: 812 });
    await page.goto('/staff/dashboard');
    await expect(page.getByText('Tickets by Status')).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'staff-dashboard/zero-groups.png'),
      fullPage: true,
    });

    // 3. Error state
    mode = 'error';
    await page.goto('/staff/dashboard');
    await expect(page.locator('.alert.alert-danger')).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'staff-dashboard/error.png'),
      fullPage: true,
    });

    // 4. Loading state
    mode = 'loading';
    const navPromise = page.goto('/staff/dashboard');
    await expect(page.getByText('Loading operational metrics...')).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'staff-dashboard/loading.png'),
      fullPage: true,
    });
    await navPromise;
  });

  test('3. Actions Taken Section: Viewports (1280, 768, 375), Create Validation, Conflict, and Drill-down', async ({ page }) => {
    let returnConflict = false;

    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      const method = route.request().method();

      if (path === '/api/auth/me') {
        return json(route, { data: staffUser });
      }

      if (path === '/api/categories') {
        return json(route, { data: [{ id: 1, name: 'Network' }] });
      }

      if (path === '/api/staff/tickets/owners') {
        return json(route, { data: [staffUser] });
      }

      if (path === '/api/tickets/8') {
        return json(route, {
          data: {
            id: 8,
            ticketNumber: 'TK-0008',
            ticketDate: '2026-09-12T03:00:00.000Z',
            summary: 'VPN access unavailable from corporate network',
            category: { id: 1, name: 'Network' },
            requestedPriority: 'HIGH',
            itPriority: 'HIGH',
            currentStatus: 'IN_PROGRESS',
            version: 3,
            owner: staffUser,
            requester: requesterUser,
            description: 'VPN disconnects frequently during remote sessions.',
            createdAt: '2026-09-12T03:00:00.000Z',
            updatedAt: '2026-09-12T04:00:00.000Z',
            relatedSystem: { id: 2, name: 'VPN' },
            attachments: [],
            comments: [],
            internalNotes: [],
            problemAppearsResolvedAt: null,
            resolvedAt: null,
          },
        });
      }

      if (path === '/api/tickets/8/actions-taken') {
        if (method === 'POST') {
          if (returnConflict) {
            return json(route, { error: { code: 'CONFLICT', message: 'Ticket has been updated by another user. Reload to view latest state.' } }, 409);
          }
          return json(route, {
            data: {
              id: 99,
              ticketId: 8,
              description: 'Created new action',
              result: null,
              status: 'PENDING',
              followUpRequired: false,
              followUpNote: null,
              attachmentNotes: null,
              cancelReason: null,
              version: 1,
              performedBy: staffUser,
              assignee: staffUser,
              createdAt: '2026-10-18T05:00:00.000Z',
              updatedAt: '2026-10-18T05:00:00.000Z',
            },
          }, 201);
        }

        return json(route, {
          data: [
            {
              id: 51,
              ticketId: 8,
              description: 'Inspected VPN gateway firewall rules and verified tunnel encryption phase 2 proposal.',
              result: 'Tunnel negotiation verified clean; no drop counters observed.',
              status: 'COMPLETED',
              followUpRequired: false,
              followUpNote: null,
              attachmentNotes: 'Firewall log export attached in notes.',
              cancelReason: null,
              version: 2,
              performedBy: staffUser,
              assignee: staffUser,
              createdAt: '2026-10-17T03:00:00.000Z',
              updatedAt: '2026-10-17T03:30:00.000Z',
            },
            {
              id: 52,
              ticketId: 8,
              description: 'Coordinate with ISP NOC regarding latency on upstream link peering.',
              result: null,
              status: 'IN_PROGRESS',
              followUpRequired: true,
              followUpNote: 'Check ISP ticket status every 4 hours.',
              attachmentNotes: null,
              cancelReason: null,
              version: 1,
              performedBy: staffUser,
              assignee: staffUser,
              createdAt: '2026-10-18T04:00:00.000Z',
              updatedAt: '2026-10-18T04:10:00.000Z',
            },
          ],
          ticketVersion: 3,
          pagination: { page: 1, pageSize: 20, total: 2, totalItems: 2, totalPages: 1 },
        });
      }

      if (path === '/api/staff/actions-taken') {
        return json(route, {
          data: [
            {
              id: 51,
              ticketId: 8,
              description: 'Inspected VPN gateway firewall rules and verified tunnel encryption phase 2 proposal.',
              result: 'Tunnel negotiation verified clean.',
              status: 'COMPLETED',
              followUpRequired: false,
              performedBy: staffUser,
              assignee: staffUser,
              createdAt: '2026-10-17T03:00:00.000Z',
              ticket: {
                id: 8,
                ticketNumber: 'TK-0008',
                summary: 'VPN access unavailable from corporate network',
                currentStatus: 'IN_PROGRESS',
              },
            },
            {
              id: 52,
              ticketId: 8,
              description: 'Coordinate with ISP NOC regarding latency on upstream link peering.',
              result: null,
              status: 'IN_PROGRESS',
              followUpRequired: true,
              performedBy: staffUser,
              assignee: staffUser,
              createdAt: '2026-10-18T04:00:00.000Z',
              ticket: {
                id: 8,
                ticketNumber: 'TK-0008',
                summary: 'VPN access unavailable from corporate network',
                currentStatus: 'IN_PROGRESS',
              },
            },
          ],
          pagination: { page: 1, pageSize: 10, totalItems: 2, totalPages: 1 },
        });
      }

      return route.continue();
    });

    // 1. Viewports on Ticket Detail Actions Taken (1280, 768, 375)
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/staff/tickets/8');
      await expect(page.locator('[data-testid="actions-taken-section"]')).toBeVisible();

      const isScrollable = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(isScrollable).toBe(false);

      await expectReadableTextIndicators(page);

      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, `actions-taken/${vp.label}.png`),
        fullPage: true,
      });
    }

    // 2. Actions Taken Drill-down viewports (1280, 768, 375)
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/staff/actions-taken?assignee=me&statuses=PENDING,IN_PROGRESS');
      await expect(page.getByRole('heading', { name: 'My Actions Taken' })).toBeVisible();

      const isScrollable = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(isScrollable).toBe(false);

      await expectReadableTextIndicators(page);

      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, `actions-taken/drilldown-${vp.label}.png`),
        fullPage: true,
      });
    }

    // 3. Create Action Validation Errors
    await page.setViewportSize({ width: 1280, height: 812 });
    await page.goto('/staff/tickets/8');
    await page.getByRole('button', { name: /Add Action/i }).click();

    // Check requires follow-up without note
    await page.locator('#action-create-followup').check();
    await page.getByRole('button', { name: /Save Action/i }).click();

    await expect(page.locator('#action-create-desc-error')).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'actions-taken/create-validation.png'),
      fullPage: true,
    });

    // 4. Concurrency Conflict / Reconcile Banner
    returnConflict = true;
    await page.locator('#action-create-desc').fill('Action causing optimistic concurrency conflict');
    await page.locator('#action-create-followup-note').fill('Follow up note present');
    await page.getByRole('button', { name: /Save Action/i }).click();

    await expect(page.locator('.alert.alert-warning')).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'actions-taken/conflict-reconcile.png'),
      fullPage: true,
    });
  });

  test('4. Ticket Workflow: Viewports (1280, 768, 375), Resolution Blocked, and Cancel Modal', async ({ page }) => {
    let returnResolutionBlocked = false;

    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      const method = route.request().method();

      if (path === '/api/auth/me') {
        return json(route, { data: staffUser });
      }

      if (path === '/api/categories') {
        return json(route, { data: [{ id: 1, name: 'Network' }] });
      }

      if (path === '/api/staff/tickets/owners') {
        return json(route, { data: [staffUser] });
      }

      if (path === '/api/tickets/8') {
        return json(route, {
          data: {
            id: 8,
            ticketNumber: 'TK-0008',
            ticketDate: '2026-09-12T03:00:00.000Z',
            summary: 'VPN access unavailable from corporate network',
            category: { id: 1, name: 'Network' },
            requestedPriority: 'HIGH',
            itPriority: 'HIGH',
            currentStatus: 'IN_PROGRESS',
            version: 2,
            owner: staffUser,
            requester: requesterUser,
            description: 'VPN disconnects frequently during remote sessions.',
            createdAt: '2026-09-12T03:00:00.000Z',
            updatedAt: '2026-09-12T04:00:00.000Z',
            relatedSystem: { id: 2, name: 'VPN' },
            attachments: [],
            comments: [],
            internalNotes: [],
            problemAppearsResolvedAt: null,
            resolvedAt: null,
          },
        });
      }

      if (path === '/api/tickets/8/actions-taken') {
        return json(route, {
          data: [
            {
              id: 61,
              ticketId: 8,
              description: 'Active diagnostic check in progress',
              result: null,
              status: 'IN_PROGRESS',
              followUpRequired: false,
              followUpNote: null,
              attachmentNotes: null,
              cancelReason: null,
              version: 1,
              performedBy: staffUser,
              assignee: staffUser,
              createdAt: '2026-10-18T05:00:00.000Z',
              updatedAt: '2026-10-18T05:00:00.000Z',
            },
          ],
          ticketVersion: 2,
          pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
        });
      }

      if (path === '/api/tickets/8/status' && method === 'PATCH') {
        if (returnResolutionBlocked) {
          const reason = 'All actions must be completed or cancelled before resolution';
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
        return json(route, { data: { currentStatus: 'RESOLVED', version: 3 } });
      }

      return route.continue();
    });

    // 1. Workflow viewports (1280, 768, 375)
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/staff/tickets/8');
      await expect(page.locator('#ticket-status')).toBeVisible();

      const isScrollable = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(isScrollable).toBe(false);

      await expectReadableTextIndicators(page);

      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, `ticket-workflow/${vp.label}.png`),
        fullPage: true,
      });
    }

    // 2. In-DOM Cancel Confirmation Modal
    await page.setViewportSize({ width: 1280, height: 812 });
    await page.goto('/staff/tickets/8');
    await page.locator('#ticket-status').selectOption('CANCELLED');
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('cancel any active child actions');

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'ticket-workflow/cancel-modal.png'),
      fullPage: true,
    });
    // Dismiss modal
    await modal.getByRole('button', { name: 'Cancel' }).click();

    // 3. Resolution Gate Blocked Banner
    returnResolutionBlocked = true;
    await page.locator('#ticket-status').selectOption('RESOLVED');
    const resolveModal = page.getByRole('dialog');
    await resolveModal.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.locator('.alert.alert-danger')).toBeVisible();
    await expect(page.locator('#ticket-status-error')).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'ticket-workflow/resolution-blocked.png'),
      fullPage: true,
    });
  });

  test('5. Regression Screens: Viewports (1280, 768, 375) across Queue, Detail, User Management, Login, Change Password, and My Tickets', async ({ page }) => {
    let currentAuthUser: UserMock | null = adminUser;

    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      const method = route.request().method();

      if (path === '/api/auth/me') {
        if (!currentAuthUser) {
          return json(route, { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
        }
        return json(route, { data: currentAuthUser });
      }

      if (path === '/api/categories') {
        return json(route, { data: [{ id: 1, name: 'Network' }, { id: 2, name: 'Hardware' }] });
      }

      if (path === '/api/staff/tickets/owners') {
        return json(route, { data: [staffUser, adminUser] });
      }

      if (path === '/api/tickets' && method === 'GET') {
        return json(route, {
          data: [
            {
              id: 1,
              ticketNumber: 'TK-0001',
              ticketDate: '2026-10-18T05:00:00.000Z',
              summary: 'Campus Wi-Fi drops intermittently in Building 3',
              category: { id: 1, name: 'Network' },
              requestedPriority: 'HIGH',
              itPriority: 'HIGH',
              currentStatus: 'OPEN',
              updatedAt: '2026-10-18T05:10:00.000Z',
              version: 1,
            },
          ],
          pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
        });
      }

      if (path === '/api/staff/tickets') {
        return json(route, {
          data: [
            {
              id: 11,
              ticketNumber: 'TK-0011',
              ticketDate: '2026-10-18T05:00:00.000Z',
              summary: 'Wireless access point in Conference Room 4 down',
              category: { id: 1, name: 'Network' },
              requestedPriority: 'MEDIUM',
              itPriority: 'HIGH',
              currentStatus: 'IN_PROGRESS',
              owner: staffUser,
              requester: requesterUser,
              updatedAt: '2026-10-18T05:20:00.000Z',
              version: 2,
            },
          ],
          pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
        });
      }

      if (path === '/api/tickets/11') {
        return json(route, {
          data: {
            id: 11,
            ticketNumber: 'TK-0011',
            ticketDate: '2026-10-18T05:00:00.000Z',
            summary: 'Wireless access point in Conference Room 4 down',
            category: { id: 1, name: 'Network' },
            requestedPriority: 'MEDIUM',
            itPriority: 'HIGH',
            currentStatus: 'IN_PROGRESS',
            owner: staffUser,
            requester: requesterUser,
            description: 'AP4 on floor 3 stopped broadcasting SSID.',
            createdAt: '2026-10-18T05:00:00.000Z',
            updatedAt: '2026-10-18T05:20:00.000Z',
            relatedSystem: null,
            attachments: [],
            comments: [],
            internalNotes: [],
            problemAppearsResolvedAt: null,
            resolvedAt: null,
            version: 2,
          },
        });
      }

      if (path === '/api/tickets/11/actions-taken') {
        return json(route, {
          data: [],
          ticketVersion: 2,
          pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 },
        });
      }

      if (path === '/api/admin/users') {
        return json(route, {
          data: [
            adminUser,
            staffUser,
            requesterUser,
          ],
          pagination: { page: 1, pageSize: 10, totalItems: 3, totalPages: 1 },
        });
      }

      return route.continue();
    });

    // Parameterized regression screen verification across all required viewports (1280, 768, 375)
    const regressionScreens = [
      {
        name: 'Staff Ticket Queue',
        path: '/staff/tickets',
        user: adminUser,
        expectedLocator: () => page.getByRole('heading', { name: 'Staff Ticket Queue' }),
        screenshotVp: 1280,
        screenshotFile: 'regression/1280.png',
        checkTextIndicators: true,
      },
      {
        name: 'Staff Ticket Detail',
        path: '/staff/tickets/11',
        user: adminUser,
        expectedLocator: () => page.locator('#staff-ticket-detail-title'),
        screenshotVp: 768,
        screenshotFile: 'regression/768.png',
        checkTextIndicators: true,
      },
      {
        name: 'User Management',
        path: '/admin/users',
        user: adminUser,
        expectedLocator: () => page.getByRole('heading', { name: 'User Management' }),
        screenshotVp: 375,
        screenshotFile: 'regression/375.png',
        checkTextIndicators: true,
      },
      {
        name: 'Requester My Tickets',
        path: '/tickets',
        user: requesterUser,
        expectedLocator: () => page.locator('#my-tickets-title'),
        screenshotVp: 1280,
        screenshotFile: 'regression/my-tickets.png',
        checkTextIndicators: true,
      },
      {
        name: 'Change Password',
        path: '/change-password',
        user: { ...adminUser, mustChangePassword: true },
        expectedLocator: () => page.getByRole('heading', { name: /Change your password/i }),
        screenshotVp: 1280,
        screenshotFile: 'regression/change-password.png',
        checkTextIndicators: false,
      },
      {
        name: 'Login',
        path: '/login',
        user: null,
        expectedLocator: () => page.locator('#login-email'),
        screenshotVp: 1280,
        screenshotFile: 'regression/login.png',
        checkTextIndicators: false,
      },
    ];

    for (const screen of regressionScreens) {
      currentAuthUser = screen.user;
      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(screen.path);
        await expect(screen.expectedLocator()).toBeVisible();
        const isScrollable = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        expect(isScrollable, `Expected no horizontal scrollbar on ${screen.name} at ${vp.width}px`).toBeFalsy();
        if (vp.width === screen.screenshotVp) {
          if (screen.checkTextIndicators) {
            await expectReadableTextIndicators(page);
          }
          await page.screenshot({ path: path.join(ARTIFACTS_DIR, screen.screenshotFile), fullPage: true });
        }
      }
    }
  });
});

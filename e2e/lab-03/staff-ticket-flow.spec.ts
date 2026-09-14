import { expect, test, type Page, type Route } from '@playwright/test';

type Role = 'IT_STAFF' | 'ADMINISTRATOR';
const staff = { id: 20, name: 'Staff One', email: 'staff@example.com', role: 'IT_STAFF' as const, isActive: true, mustChangePassword: false };
const admin = { id: 30, name: 'Admin One', email: 'admin@example.com', role: 'ADMINISTRATOR' as const, isActive: true, mustChangePassword: false };
const categories = [{ id: 1, name: 'Network' }];

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

function queueTicket() {
  return {
    id: 8, ticketNumber: 'TK-0008', ticketDate: '2026-09-12T03:00:00.000Z', summary: 'VPN access unavailable', category: categories[0],
    requestedPriority: 'HIGH', itPriority: 'MEDIUM', currentStatus: 'OPEN', owner: null,
    requester: { id: 7, name: 'Somchai Prasert', email: 'somchai@example.com', role: 'REQUESTER' }, updatedAt: '2026-09-12T04:00:00.000Z', problemAppearsResolvedAt: null,
  };
}

function detailTicket() {
  return {
    ...queueTicket(), description: 'VPN disconnects after login.', createdAt: '2026-09-12T03:00:00.000Z', relatedSystem: { id: 2, name: 'VPN' },
    attachments: [{ id: 11, originalName: 'evidence.pdf', storedName: 'stored.pdf', mimeType: 'application/pdf', sizeBytes: 10, isRemoved: false, removalReason: null, removedAt: null, createdAt: '2026-09-12T03:05:00.000Z', ticketId: 8 }],
    comments: [{ id: 1, ticketId: 8, content: 'Please investigate', createdAt: '2026-09-12T03:10:00.000Z', author: { id: 7, name: 'Somchai Prasert', role: 'REQUESTER' } }],
    internalNotes: [{ id: 2, ticketId: 8, content: 'Check gateway logs', createdAt: '2026-09-12T03:15:00.000Z', author: { id: 20, name: 'Staff One', role: 'IT_STAFF' } }],
  };
}

async function installMockApi(page: Page, role: Role = 'IT_STAFF') {
  const user = role === 'IT_STAFF' ? staff : admin;
  const requests: Array<{ method: string; url: string; body: string | null }> = [];
  const ticket = detailTicket();
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    requests.push({ method: request.method(), url: `${url.pathname}${url.search}`, body: request.postData() });
    if (request.method() === 'GET' && url.pathname === '/api/auth/me') return json(route, { data: user });
    if (request.method() === 'GET' && url.pathname === '/api/categories') return json(route, { data: categories });
    if (request.method() === 'GET' && url.pathname === '/api/staff/tickets/owners') return json(route, { data: [staff, admin] });
    if (request.method() === 'GET' && url.pathname === '/api/staff/tickets') return json(route, { data: [queueTicket()], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false } });
    if (request.method() === 'GET' && url.pathname === '/api/tickets/8') return json(route, { data: ticket });
    if (request.method() === 'PATCH' && url.pathname === '/api/tickets/8/owner') return json(route, { data: { ...ticket, owner: { id: 20, name: 'Staff One', email: 'staff@example.com', role: 'IT_STAFF' } } });
    if (request.method() === 'PATCH' && url.pathname === '/api/tickets/8/it-priority') return json(route, { data: { ...ticket, itPriority: 'CRITICAL' } });
    if (request.method() === 'PATCH' && url.pathname === '/api/tickets/8/status') return json(route, { data: { ...ticket, currentStatus: 'CANCELLED' } });
    if (request.method() === 'POST' && url.pathname === '/api/tickets/8/comments') return json(route, { data: { id: 3, ticketId: 8, content: 'Staff reply', createdAt: '2026-09-12T04:00:00.000Z', author: user } }, 201);
    if (request.method() === 'POST' && url.pathname === '/api/tickets/8/internal-notes') return json(route, { data: { id: 4, ticketId: 8, content: 'Staff note', createdAt: '2026-09-12T04:00:00.000Z', author: user } }, 201);
    return json(route, { error: { code: 'UNHANDLED', message: `${request.method()} ${url.pathname}` } }, 500);
  });
  return requests;
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport);
}

test('Staff can search the queue, open detail, and complete the Issue #41 workflow', async ({ page }) => {
  const requests = await installMockApi(page);
  await page.goto('/staff/tickets');
  await expect(page.getByRole('heading', { name: 'Staff Ticket Queue' })).toBeVisible();
  await expect(page.getByText('TK-0008').first()).toBeVisible();
  await page.getByLabel('Search tickets').fill('Somchai');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect.poll(() => requests.some(request => request.url.includes('search=Somchai'))).toBe(true);
  await page.getByRole('link', { name: 'Open ticket detail' }).click();
  await expect(page).toHaveURL(/\/staff\/tickets\/8$/);
  await expect(page.getByRole('heading', { name: 'TK-0008' })).toBeVisible();
  await expect(page.getByText('Check gateway logs')).toBeVisible();

  await page.getByLabel('Owner').selectOption('20');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Owner updated.')).toBeVisible();
  await page.getByLabel('IT Priority').selectOption('CRITICAL');
  await expect(page.getByText('IT Priority updated.')).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByLabel('Status').selectOption('CANCELLED');
  await expect(page.getByText('Ticket status updated.')).toBeVisible();
  await page.getByLabel('Add a public comment').fill('Staff reply');
  await page.getByRole('button', { name: 'Add public comment' }).click();
  await expect(page.getByText('Public comment added.')).toBeVisible();
  await page.getByLabel('Add an internal note').fill('Staff note');
  await page.getByRole('button', { name: 'Add internal note' }).click();
  await expect(page.getByText('Internal note added.')).toBeVisible();
  await expect.poll(() => requests.filter(request => request.method === 'PATCH' || request.method === 'POST').length).toBeGreaterThan(3);
  await expectNoHorizontalOverflow(page);
});

test('Administrator can read the queue/detail but has no Staff mutation affordances', async ({ page }) => {
  await installMockApi(page, 'ADMINISTRATOR');
  await page.goto('/staff/tickets');
  await expect(page.getByText('Read-only view')).toBeVisible();
  await page.getByRole('link', { name: 'Open ticket detail' }).click();
  await expect(page.getByRole('heading', { name: 'TK-0008' })).toBeVisible();
  await expect(page.getByText('Check gateway logs')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Workflow controls' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add public comment' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add internal note' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Download' })).toHaveCount(0);
});

test('Staff queue switches to cards on mobile without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await installMockApi(page);
  await page.goto('/staff/tickets');
  await expect(page.locator('.staff-queue-cards')).toBeVisible();
  await expect(page.locator('.staff-queue-table-wrap')).toBeHidden();
  await expectNoHorizontalOverflow(page);
});

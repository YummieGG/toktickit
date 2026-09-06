import { expect, test, type Page, type Route } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const repositoryRoot = path.resolve(__dirname, '..', '..');
const screenshotRoot = path.join(repositoryRoot, 'artifacts', 'lab-02', 'screenshots');

type Requester = { id: number; name: string; email: string };
type Attachment = {
  id: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  isRemoved: boolean;
  removalReason: string | null;
  removedAt: string | null;
  createdAt: string;
  ticketId: number;
};
type Ticket = {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  currentStatus: 'NEW';
  ticketDate: string;
  createdAt: string;
  updatedAt: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string } | null;
  requester: Requester;
  attachments: Attachment[];
};

type MockOptions = { failCreate?: boolean; delayCreate?: Promise<void> };

const requesters: Requester[] = [
  { id: 1, name: 'Somchai Prasert', email: 'somchai.p@toktickit.local' },
  { id: 2, name: 'Suda Srisawat', email: 'suda.s@toktickit.local' },
];

const categories = [
  { id: 1, name: 'Hardware' },
  { id: 2, name: 'Software' },
];

const systems = [{ id: 1, name: 'Email' }, { id: 2, name: 'Campus Wi-Fi' }];

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

function createMockTicket(id: number, requester: Requester, summary = 'VPN access unavailable'): Ticket {
  const timestamp = '2026-09-06T08:30:00.000Z';
  return {
    id,
    ticketNumber: `TK-${String(id).padStart(4, '0')}`,
    summary,
    description: 'The requester cannot connect to the campus VPN from a managed laptop.',
    requestedPriority: 'HIGH',
    currentStatus: 'NEW',
    ticketDate: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    category: categories[0],
    relatedSystem: systems[0],
    requester,
    attachments: [],
  };
}

async function installMockApi(page: Page, options: MockOptions = {}) {
  const tickets = new Map<number, Ticket>();
  let nextTicketId = 1;
  let nextAttachmentId = 1;

  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (method === 'GET' && url.pathname === '/api/requesters') return json(route, { data: requesters });
    if (method === 'GET' && url.pathname === '/api/categories') return json(route, { data: categories });
    if (method === 'GET' && url.pathname === '/api/related-systems') return json(route, { data: systems });

    if (url.pathname === '/api/tickets' && method === 'GET') {
      const requesterId = Number(url.searchParams.get('requesterId'));
      const search = url.searchParams.get('search')?.toLowerCase() ?? '';
      const data = [...tickets.values()].filter(ticket =>
        ticket.requester.id === requesterId &&
        (!search || `${ticket.ticketNumber} ${ticket.summary} ${ticket.description}`.toLowerCase().includes(search))
      );
      return json(route, {
        data,
        pagination: { page: 1, pageSize: Number(url.searchParams.get('pageSize') ?? 10), totalItems: data.length, totalPages: data.length ? 1 : 0 },
      });
    }

    if (url.pathname === '/api/tickets' && method === 'POST') {
      if (options.delayCreate) await options.delayCreate;
      if (options.failCreate) return json(route, { error: 'Unable to create ticket' }, 500);
      const ticket = createMockTicket(nextTicketId++, requesters[0]);
      tickets.set(ticket.id, ticket);
      return json(route, { data: ticket }, 201);
    }

    const ticketMatch = url.pathname.match(/^\/api\/tickets\/(\d+)$/);
    if (ticketMatch && method === 'GET') {
      const ticket = tickets.get(Number(ticketMatch[1]));
      return ticket ? json(route, { data: ticket }) : json(route, { error: 'Ticket not found' }, 404);
    }

    const uploadMatch = url.pathname.match(/^\/api\/tickets\/(\d+)\/attachments$/);
    if (uploadMatch && method === 'POST') {
      const ticket = tickets.get(Number(uploadMatch[1]));
      if (!ticket) return json(route, { error: 'Ticket not found' }, 404);
      const attachment: Attachment = {
        id: nextAttachmentId++,
        originalName: 'evidence.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 128,
        isRemoved: false,
        removalReason: null,
        removedAt: null,
        createdAt: '2026-09-06T08:35:00.000Z',
        ticketId: ticket.id,
      };
      ticket.attachments.push(attachment);
      return json(route, { data: attachment }, 201);
    }

    const downloadMatch = url.pathname.match(/^\/api\/attachments\/(\d+)\/download$/);
    if (downloadMatch && method === 'GET') {
      const attachment = [...tickets.values()].flatMap(ticket => ticket.attachments)
        .find(item => item.id === Number(downloadMatch[1]));
      if (!attachment || attachment.isRemoved) return json(route, { error: 'Removed attachments cannot be downloaded' }, 400);
      return route.fulfill({ status: 200, contentType: attachment.mimeType, headers: { 'Content-Disposition': 'attachment; filename="evidence.pdf"' }, body: 'test attachment bytes' });
    }

    const removeMatch = url.pathname.match(/^\/api\/attachments\/(\d+)\/remove$/);
    if (removeMatch && method === 'PATCH') {
      const attachment = [...tickets.values()].flatMap(ticket => ticket.attachments)
        .find(item => item.id === Number(removeMatch[1]));
      if (!attachment) return json(route, { error: 'Attachment not found' }, 404);
      const body = JSON.parse(request.postData() ?? '{}') as { removalReason?: string };
      attachment.isRemoved = true;
      attachment.removalReason = body.removalReason ?? null;
      attachment.removedAt = '2026-09-06T08:40:00.000Z';
      return json(route, { data: attachment });
    }

    return json(route, { error: `Unhandled mocked API request: ${method} ${url.pathname}` }, 500);
  });

  return tickets;
}

async function selectRequester(page: Page, requesterId: string) {
  await page.goto('/');
  await page.evaluate(() => sessionStorage.clear());
  await page.goto('/');
  await expect(page.getByLabel(/Select Test Requester/)).toBeVisible();
  await page.getByLabel(/Select Test Requester/).selectOption(requesterId);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible();
}

function screenshotPath(relativePath: string) {
  const fullPath = path.join(screenshotRoot, relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  return fullPath;
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);
}

test('requester-ticket-flow covers selection, creation, detail, attachment lifecycle, isolation, and safe failure', async ({ page }) => {
  let releaseCreate!: () => void;
  const createPending = new Promise<void>(resolve => { releaseCreate = resolve; });
  const tickets = await installMockApi(page, { delayCreate: createPending });

  await selectRequester(page, '1');
  await expect(page.getByRole('heading', { name: 'No Tickets Submitted Yet' })).toBeVisible();
  await page.screenshot({ path: screenshotPath('my-tickets/desktop-empty.png'), fullPage: true });

  await page.getByRole('link', { name: 'Create Ticket', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Create New Ticket' })).toBeVisible();
  await page.screenshot({ path: screenshotPath('create-ticket/desktop-initial.png'), fullPage: true });

  await page.getByRole('button', { name: 'Submit Ticket' }).click();
  await expect(page.getByText('Summary must be between 5 and 200 characters')).toBeVisible();
  await page.screenshot({ path: screenshotPath('create-ticket/desktop-validation-error.png'), fullPage: true });

  await page.getByLabel('Category').selectOption('1');
  await page.getByLabel('Requested Priority').selectOption('HIGH');
  await page.getByLabel('Summary').fill('VPN access unavailable');
  await page.getByLabel('Description').fill('The requester cannot connect to the campus VPN from a managed laptop.');
  const submitRequest = page.getByRole('button', { name: 'Submit Ticket' }).click();
  await expect(page.getByRole('button', { name: 'Submitting...' })).toBeVisible();
  await page.screenshot({ path: screenshotPath('create-ticket/desktop-submitting.png'), fullPage: true });
  releaseCreate();
  await submitRequest;
  await expect(page.getByRole('alert')).toContainText('TK-0001');
  await page.screenshot({ path: screenshotPath('create-ticket/desktop-success.png'), fullPage: true });

  await page.getByRole('link', { name: 'View My Tickets' }).click();
  await expect(page.getByRole('link', { name: 'TK-0001' }).first()).toBeVisible();
  await page.screenshot({ path: screenshotPath('my-tickets/desktop-list.png'), fullPage: true });

  await page.getByLabel('Search').fill('VPN');
  await page.getByRole('search').press('Enter');
  await expect(page.getByText('VPN access unavailable').first()).toBeVisible();
  await page.screenshot({ path: screenshotPath('my-tickets/desktop-search-results.png'), fullPage: true });

  await page.getByLabel('Search').fill('does-not-exist');
  await page.getByRole('search').press('Enter');
  await expect(page.getByRole('heading', { name: 'No Matching Tickets Found' })).toBeVisible();
  await page.screenshot({ path: screenshotPath('my-tickets/desktop-no-results.png'), fullPage: true });
  await page.getByRole('button', { name: 'Clear All Filters' }).click();

  await page.getByRole('link', { name: 'TK-0001' }).first().click();
  await expect(page.getByRole('heading', { name: 'TK-0001' })).toBeVisible();
  await page.screenshot({ path: screenshotPath('ticket-detail/desktop-detail.png'), fullPage: true });

  await page.getByLabel('Add attachment').setInputFiles({ name: 'evidence.pdf', mimeType: 'application/pdf', buffer: Buffer.from('evidence') });
  await expect(page.getByText('evidence.pdf')).toBeVisible();
  await page.screenshot({ path: screenshotPath('ticket-detail/desktop-attachments.png'), fullPage: true });

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('evidence.pdf');

  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Removal reason').fill('Uploaded wrong file');
  await page.getByRole('button', { name: 'Remove Attachment' }).click();
  await expect(page.getByText('Removed', { exact: true })).toBeVisible();
  await expect(page.getByText('Uploaded wrong file')).toBeVisible();
  await page.screenshot({ path: screenshotPath('ticket-detail/desktop-removed-attachment.png'), fullPage: true });

  await page.getByRole('button', { name: 'Change Requester' }).click();
  await page.getByLabel(/Select Test Requester/).selectOption('2');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'No Tickets Submitted Yet' })).toBeVisible();
  await expect(page.getByText('VPN access unavailable')).not.toBeVisible();
  expect(tickets.get(1)?.requester.id).toBe(1);
});

test('requester-ticket-flow preserves data and displays safe failure state', async ({ page }) => {
  await installMockApi(page, { failCreate: true });
  await selectRequester(page, '1');
  await page.getByRole('link', { name: 'Create Ticket', exact: true }).first().click();
  await page.getByLabel('Category').selectOption('1');
  await page.getByLabel('Requested Priority').selectOption('HIGH');
  await page.getByLabel('Summary').fill('Keep this summary');
  await page.getByLabel('Description').fill('Keep this description when the API fails.');
  await page.getByRole('button', { name: 'Submit Ticket' }).click();
  await expect(page.getByRole('alert')).toContainText('Unable to create ticket');
  await expect(page.getByLabel('Summary')).toHaveValue('Keep this summary');
  await expect(page.getByLabel('Description')).toHaveValue('Keep this description when the API fails.');
  await page.screenshot({ path: screenshotPath('create-ticket/desktop-api-error.png'), fullPage: true });
});

test('requester-ticket-flow verifies responsive layout, touch targets, labels, and focusability', async ({ page }) => {
  await installMockApi(page);
  const viewports = [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'tablet', width: 768, height: 900 },
    { name: 'mobile', width: 375, height: 812 },
  ] as const;

  for (const viewport of viewports) {
    await test.step(`${viewport.name} viewport`, async () => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await selectRequester(page, '1');
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ path: screenshotPath(`my-tickets/${viewport.name === 'mobile' ? 'mobile-cards' : viewport.name === 'tablet' ? 'tablet-layout' : 'desktop-list'}.png`), fullPage: true });

      await page.getByRole('link', { name: 'Create Ticket', exact: true }).first().click();
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ path: screenshotPath(`create-ticket/${viewport.name === 'mobile' ? 'mobile-layout' : viewport.name === 'tablet' ? 'tablet-layout' : 'desktop-initial'}.png`), fullPage: true });

      const controlsHaveLabels = await page.locator('input, select, textarea').evaluateAll(elements =>
        elements.every(element => Boolean((element as HTMLInputElement).labels?.length))
      );
      expect(controlsHaveLabels).toBe(true);

      if (viewport.name === 'mobile') {
        const touchTargets = await page.locator('button, a.btn, input, select, textarea').evaluateAll(elements =>
          elements.filter(element => {
            const style = window.getComputedStyle(element);
            const bounds = element.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && bounds.width > 0 && bounds.height > 0;
          }).map(element => Math.round(element.getBoundingClientRect().height))
        );
        expect(touchTargets.filter(height => height < 44)).toEqual([]);
      }

      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      await page.getByRole('link', { name: 'Cancel' }).click();
      await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }

  await page.setViewportSize({ width: 768, height: 900 });
  await selectRequester(page, '1');
  await page.getByRole('link', { name: 'Create Ticket', exact: true }).first().click();
  await page.getByLabel('Category').selectOption('1');
  await page.getByLabel('Requested Priority').selectOption('HIGH');
  await page.getByLabel('Summary').fill('Responsive ticket');
  await page.getByLabel('Description').fill('This ticket is used to capture responsive detail evidence.');
  await page.getByRole('button', { name: 'Submit Ticket' }).click();
  await page.getByRole('link', { name: 'View My Tickets' }).click();
  await page.getByRole('link', { name: 'TK-0001' }).first().click();
  await expect(page.getByRole('heading', { name: 'TK-0001' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: screenshotPath('ticket-detail/tablet-layout.png'), fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: screenshotPath('ticket-detail/mobile-layout.png'), fullPage: true });
});

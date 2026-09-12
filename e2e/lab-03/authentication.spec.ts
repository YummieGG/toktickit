import { expect, test, type Page, type Route } from '@playwright/test';

type Role = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';
type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
};

type Attachment = {
  id: number;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  isRemoved: boolean;
  removalReason: string | null;
  removedAt: string | null;
  createdAt: string;
  ticketId: number;
};

type Comment = {
  id: number;
  ticketId: number;
  content: string;
  createdAt: string;
  author: Pick<User, 'id' | 'name' | 'role'>;
};

type Ticket = {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  itPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  currentStatus: 'NEW';
  ticketDate: string;
  createdAt: string;
  updatedAt: string;
  problemAppearsResolvedAt: string | null;
  owner: null;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string } | null;
  requester: User;
  attachments: Attachment[];
  comments: Comment[];
};

const requester: User = {
  id: 7,
  name: 'Somchai Prasert',
  email: 'somchai.p@toktickit.local',
  role: 'REQUESTER',
  isActive: true,
  mustChangePassword: false,
};

const categories = [{ id: 1, name: 'Network' }, { id: 2, name: 'Software' }];
const systems = [{ id: 1, name: 'VPN' }];

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

function createTicket(): Ticket {
  const timestamp = '2026-09-12T03:00:00.000Z';
  return {
    id: 1,
    ticketNumber: 'TK-0001',
    summary: 'VPN access unavailable',
    description: 'The requester cannot connect to the campus VPN.',
    requestedPriority: 'HIGH',
    itPriority: 'HIGH',
    currentStatus: 'NEW',
    ticketDate: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    problemAppearsResolvedAt: null,
    owner: null,
    category: categories[0],
    relatedSystem: systems[0],
    requester,
    attachments: [],
    comments: [],
  };
}

async function installMockApi(page: Page, initialUser: User | null = null) {
  let currentUser = initialUser;
  let ticket: Ticket | null = null;
  let nextAttachmentId = 1;
  let nextCommentId = 1;
  const requestLog: Array<{ method: string; path: string; query: string; body: string | null }> = [];

  await page.route('**/api/**', async route => {
    const apiRequest = route.request();
    const url = new URL(apiRequest.url());
    const method = apiRequest.method();
    requestLog.push({ method, path: url.pathname, query: url.search, body: apiRequest.postData() });

    if (method === 'GET' && url.pathname === '/api/auth/me') {
      return currentUser
        ? json(route, { data: currentUser })
        : json(route, { error: { code: 'UNAUTHENTICATED', message: 'Authentication is required' } }, 401);
    }
    if (method === 'POST' && url.pathname === '/api/auth/login') {
      const payload = JSON.parse(apiRequest.postData() ?? '{}') as { email?: string };
      if (payload.email === 'initial.user@toktickit.local') {
        currentUser = {
          id: 8,
          name: 'Initial User',
          email: 'initial.user@toktickit.local',
          role: 'REQUESTER',
          isActive: true,
          mustChangePassword: true,
        };
        return json(route, { data: currentUser });
      }
      currentUser = requester;
      return json(route, { data: requester });
    }
    if (method === 'POST' && url.pathname === '/api/auth/change-password') {
      if (currentUser) {
        currentUser = { ...currentUser, mustChangePassword: false };
      }
      return json(route, { data: currentUser });
    }
    if (method === 'POST' && url.pathname === '/api/auth/logout') {
      currentUser = null;
      return route.fulfill({ status: 204 });
    }
    if (!currentUser) {
      return json(route, { error: { code: 'UNAUTHENTICATED', message: 'Authentication is required' } }, 401);
    }
    if (method === 'GET' && url.pathname === '/api/categories') return json(route, { data: categories });
    if (method === 'GET' && url.pathname === '/api/related-systems') return json(route, { data: systems });

    if (method === 'GET' && url.pathname === '/api/tickets') {
      const search = url.searchParams.get('search')?.toLowerCase() ?? '';
      const data = ticket && (!search || `${ticket.ticketNumber} ${ticket.summary} ${ticket.description}`.toLowerCase().includes(search))
        ? [ticket]
        : [];
      return json(route, {
        data,
        pagination: {
          page: 1,
          pageSize: Number(url.searchParams.get('pageSize') ?? 10),
          totalItems: data.length,
          totalPages: data.length ? 1 : 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    }

    if (method === 'POST' && url.pathname === '/api/tickets') {
      ticket = createTicket();
      return json(route, { data: ticket }, 201);
    }

    if (method === 'GET' && url.pathname === '/api/tickets/1') {
      return ticket
        ? json(route, { data: ticket })
        : json(route, { error: { code: 'NOT_FOUND', message: 'Resource not found' } }, 404);
    }

    if (method === 'GET' && url.pathname.match(/^\/api\/tickets\/\d+$/)) {
      return json(route, { error: { code: 'NOT_FOUND', message: 'Resource not found' } }, 404);
    }

    if (method === 'POST' && url.pathname === '/api/tickets/1/attachments' && ticket) {
      const attachment: Attachment = {
        id: nextAttachmentId++,
        originalName: 'evidence.pdf',
        storedName: 'server-generated.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 8,
        isRemoved: false,
        removalReason: null,
        removedAt: null,
        createdAt: '2026-09-12T03:05:00.000Z',
        ticketId: 1,
      };
      ticket.attachments.push(attachment);
      return json(route, { data: attachment }, 201);
    }

    if (method === 'GET' && url.pathname.match(/^\/api\/attachments\/\d+\/download$/)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        headers: { 'Content-Disposition': 'attachment; filename="evidence.pdf"' },
        body: 'evidence',
      });
    }

    if (method === 'PATCH' && url.pathname.match(/^\/api\/attachments\/\d+\/remove$/) && ticket) {
      const attachment = ticket.attachments[0];
      const payload = JSON.parse(apiRequest.postData() ?? '{}') as { removalReason?: string };
      attachment.isRemoved = true;
      attachment.removalReason = payload.removalReason ?? null;
      attachment.removedAt = '2026-09-12T03:10:00.000Z';
      return route.fulfill({ status: 204 });
    }

    if (method === 'POST' && url.pathname === '/api/tickets/1/comments' && ticket) {
      const payload = JSON.parse(apiRequest.postData() ?? '{}') as { content: string };
      const comment: Comment = {
        id: nextCommentId++,
        ticketId: 1,
        content: payload.content,
        createdAt: '2026-09-12T03:15:00.000Z',
        author: { id: requester.id, name: requester.name, role: requester.role },
      };
      ticket.comments.push(comment);
      return json(route, { data: comment }, 201);
    }

    if (method === 'POST' && url.pathname === '/api/tickets/1/problem-appears-resolved' && ticket) {
      ticket.problemAppearsResolvedAt ??= '2026-09-12T03:20:00.000Z';
      return json(route, { data: { ticketId: 1, problemAppearsResolvedAt: ticket.problemAppearsResolvedAt } });
    }

    return json(route, { error: { code: 'UNHANDLED', message: `${method} ${url.pathname}` } }, 500);
  });

  return { requestLog, getTicket: () => ticket };
}

async function signIn(page: Page) {
  await page.goto('/tickets');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email').fill('somchai.p@toktickit.local');
  await page.getByLabel('Password').fill('ValidPass#12');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);
}

test('initial password login requires password change and unblocks normal screens after change (E2E-01)', async ({ page }) => {
  await installMockApi(page);

  await page.goto('/login');
  await page.getByLabel('Email').fill('initial.user@toktickit.local');
  await page.getByLabel('Password').fill('InitialPass#12');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Redirected to /change-password immediately
  await expect(page).toHaveURL(/\/change-password$/);
  await expect(page.getByRole('heading', { name: 'Change your password' })).toBeVisible();

  // Attempting to navigate to normal screens is blocked and returns to /change-password
  await page.goto('/tickets');
  await expect(page).toHaveURL(/\/change-password$/);

  // Submit valid new password
  await page.getByLabel(/Current password/).fill('InitialPass#12');
  await page.getByLabel(/^New password/).fill('NewSecurePass#99');
  await page.getByLabel(/Confirm new password/).fill('NewSecurePass#99');
  await page.getByRole('button', { name: 'Change password' }).click();

  await expect(page.getByText(/Password changed. Please sign in again./)).toBeVisible();

  // Once changed and logged out, signing in with normal account grants access to /tickets
  await expect(page).toHaveURL(/\/login$/, { timeout: 5000 });
  await page.getByLabel('Email').fill('somchai.p@toktickit.local');
  await page.getByLabel('Password').fill('NewSecurePass#99');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible();
});

test('authenticated requester retains create, list, detail, attachment, comment, and resolution flow (E2E-02)', async ({ page }) => {
  const api = await installMockApi(page);
  await signIn(page);

  await expect(page.getByLabel('Current user')).toContainText('Somchai Prasert');
  await expect(page.getByRole('link', { name: 'Staff Queue' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'User Management' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Create Ticket', exact: true }).first().click();
  const category = page.locator('#categoryId');
  await expect(category).toBeEnabled();
  await expect(category.locator('option')).toHaveCount(3);
  await category.selectOption({ label: 'Network' });
  await expect(category).toHaveValue('1');
  await page.locator('#relatedSystemId').selectOption({ label: 'VPN' });
  await page.locator('#requestedPriority').selectOption('HIGH');
  await page.locator('#summary').fill('VPN access unavailable');
  await page.locator('#description').fill('The requester cannot connect to the campus VPN.');
  await page.getByRole('button', { name: 'Submit Ticket' }).click();
  await expect(page.getByText('Ticket Created Successfully')).toBeVisible();
  await expect(page.getByText('TK-0001')).toBeVisible();

  await page.getByRole('link', { name: 'View My Tickets' }).click();
  await page.getByRole('link', { name: 'TK-0001' }).first().click();
  await expect(page.getByRole('heading', { name: 'TK-0001' })).toBeVisible();

  await page.getByLabel('Add attachment').setInputFiles({
    name: 'evidence.pdf', mimeType: 'application/pdf', buffer: Buffer.from('evidence'),
  });
  await expect(page.getByText('evidence.pdf')).toBeVisible();

  await page.getByLabel('Add a public comment').fill('  It works after reconnecting.  ');
  await page.getByRole('button', { name: 'Add Comment' }).click();
  await expect(page.getByText('It works after reconnecting.')).toBeVisible();

  await page.getByRole('button', { name: 'Problem Appears Resolved', exact: true }).click();
  await expect(page.getByText(/Reported on/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Problem Appears Resolved \(reported\)/ })).toBeDisabled();
  expect(api.getTicket()?.currentStatus).toBe('NEW');

  const identityLeaks = api.requestLog.filter(entry =>
    entry.query.includes('requesterId') ||
    (entry.body?.includes('requesterId') ?? false),
  );
  expect(identityLeaks).toEqual([]);
});

test('logout clears the authenticated shell and redirects to sign in', async ({ page }) => {
  await installMockApi(page, requester);
  await page.goto('/tickets');
  await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible();

  await page.getByRole('button', { name: 'Logout' }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByLabel('Current user')).toHaveCount(0);
});

test('cross-owner requester detail is represented only as a safe not-found state', async ({ page }) => {
  await installMockApi(page, requester);

  await page.goto('/tickets/999');

  await expect(page.getByRole('heading', { name: 'Ticket Not Found' })).toBeVisible();
  await expect(page.getByText('Resource not found')).toHaveCount(0);
  await expect(page.getByText('Requester Email')).toHaveCount(0);
  await expect(page.getByText('Internal Notes')).toHaveCount(0);
});

test('route guard blocks a wrong-role direct requester URL and hides requester controls', async ({ page }) => {
  const staff: User = { ...requester, id: 20, name: 'Narin Support', role: 'IT_STAFF' };
  await installMockApi(page, staff);

  await page.goto('/tickets/new');

  await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Staff Queue' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create Ticket' })).toHaveCount(0);
  await expect(page.getByText('Problem Appears Resolved')).toHaveCount(0);
});

test('authenticated requester pages remain responsive at desktop, tablet, and mobile widths (E2E-05)', async ({ page }) => {
  await installMockApi(page, requester);
  const viewports = [
    { width: 1280, height: 900 },
    { width: 768, height: 900 },
    { width: 375, height: 812 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/tickets');
    await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto('/tickets/new');
    await expect(page.getByText('Create New Ticket')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const controlsHaveLabels = await page.locator('input, select, textarea').evaluateAll(elements =>
      elements.every(element => Boolean((element as HTMLInputElement).labels?.length)),
    );
    expect(controlsHaveLabels).toBe(true);

    if (viewport.width === 375) {
      const shortTouchTargets = await page.locator('button, a.btn, input, select, textarea').evaluateAll(elements =>
        elements.filter(element => {
          const style = window.getComputedStyle(element);
          const bounds = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && bounds.width > 0 && bounds.height > 0;
        }).map(element => Math.round(element.getBoundingClientRect().height)).filter(height => height < 44),
      );
      expect(shortTouchTargets).toEqual([]);
    }
  }
});

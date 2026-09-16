import path from 'node:path';
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

const admin: User = { id: 1, name: 'Admin One', email: 'admin@example.com', role: 'ADMINISTRATOR', isActive: true, mustChangePassword: false };
const staff: User = { id: 20, name: 'Staff One', email: 'staff@example.com', role: 'IT_STAFF', isActive: true, mustChangePassword: false };
const requester: User = { id: 30, name: 'Requester One', email: 'requester@example.com', role: 'REQUESTER', isActive: false, mustChangePassword: false };

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installMockApi(page: Page, initialUser: User | null = admin, initialUsers: User[] = [admin, staff, requester]) {
  let currentUser: User | null = initialUser;
  let users = [...initialUsers];
  const requests: Array<{ method: string; url: string; body: string | null }> = [];

  await page.route('**/api/**', async route => {
    const apiRequest = route.request();
    const url = new URL(apiRequest.url());
    const method = apiRequest.method();
    requests.push({ method, url: `${url.pathname}${url.search}`, body: apiRequest.postData() });

    if (method === 'GET' && url.pathname === '/api/auth/me') {
      return currentUser
        ? json(route, { data: currentUser })
        : json(route, { error: { code: 'UNAUTHENTICATED', message: 'Authentication is required' } }, 401);
    }
    if (!currentUser) return json(route, { error: { code: 'UNAUTHENTICATED', message: 'Authentication is required' } }, 401);
    if (!url.pathname.startsWith('/api/admin/users')) return json(route, { error: { code: 'UNHANDLED', message: `${method} ${url.pathname}` } }, 500);
    if (currentUser.role !== 'ADMINISTRATOR') return json(route, { error: { code: 'FORBIDDEN', message: 'You do not have permission to perform this action' } }, 403);

    if (method === 'GET' && url.pathname === '/api/admin/users') {
      const search = url.searchParams.get('search')?.toLowerCase() ?? '';
      const role = url.searchParams.get('role');
      const filtered = users.filter(user =>
        (!search || `${user.name} ${user.email}`.toLowerCase().includes(search))
        && (!role || user.role === role),
      );
      return json(route, { data: filtered });
    }

    if (method === 'POST' && url.pathname === '/api/admin/users') {
      const payload = JSON.parse(apiRequest.postData() ?? '{}') as { name: string; email: string; role: Role; isActive: boolean };
      if (payload.email === 'duplicate@example.com') return json(route, { error: { code: 'DUPLICATE_EMAIL', message: 'A user with this email already exists' } }, 409);
      const created: User = { id: 40, ...payload, mustChangePassword: true };
      users = [...users, created];
      return json(route, { data: created }, 201);
    }

    const editMatch = url.pathname.match(/^\/api\/admin\/users\/(\d+)$/);
    if (method === 'PATCH' && editMatch) {
      const id = Number(editMatch[1]);
      const payload = JSON.parse(apiRequest.postData() ?? '{}') as Partial<User>;
      if (id === admin.id && payload.isActive === false) return json(route, { error: { code: 'SELF_DEACTIVATION', message: 'You cannot deactivate your own account' } }, 409);
      if (id === admin.id && payload.role === 'REQUESTER') return json(route, { error: { code: 'LAST_ADMIN_PROTECTION', message: 'At least one active Administrator must remain' } }, 409);
      const previous = users.find(user => user.id === id);
      if (!previous) return json(route, { error: { code: 'NOT_FOUND', message: 'Resource not found' } }, 404);
      const updated = { ...previous, ...payload };
      users = users.map(user => user.id === id ? updated : user);
      return json(route, { data: updated });
    }

    const resetMatch = url.pathname.match(/^\/api\/admin\/users\/(\d+)\/initial-password$/);
    if (method === 'POST' && resetMatch) return route.fulfill({ status: 204 });
    return json(route, { error: { code: 'UNHANDLED', message: `${method} ${url.pathname}` } }, 500);
  });

  return requests;
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);
}

test('Administrator can list, search, filter, create, edit, and reset a user', async ({ page }) => {
  const requests = await installMockApi(page);
  await page.goto('/admin/users');
  await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
  await expect(page.getByText('Staff One').first()).toBeVisible();
  await expect(page.getByText('Inactive').first()).toBeVisible();
  await page.screenshot({ path: path.resolve(__dirname, '../../artifacts/lab-03/screenshots/user-management/desktop-initial.png'), fullPage: true });

  await page.getByLabel('Search users').fill('staff@example.com');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect.poll(() => requests.some(request => request.url === '/api/admin/users?search=staff%40example.com')).toBe(true);

  await page.getByLabel('Role filter').selectOption('IT_STAFF');
  await expect.poll(() => requests.some(request => request.url === '/api/admin/users?search=staff%40example.com&role=IT_STAFF')).toBe(true);

  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByText('Requester One').first()).toBeVisible();
  await page.getByLabel('Name').fill('New User');
  await page.getByLabel('Email').fill('new@example.com');
  await page.getByLabel('Initial password').fill('ValidPass#12');
  await page.getByRole('button', { name: 'Create user', exact: true }).last().click();
  await expect(page.getByText('User created successfully.')).toBeVisible();
  await page.screenshot({ path: path.resolve(__dirname, '../../artifacts/lab-03/screenshots/user-management/desktop-success.png'), fullPage: true });

  const createRequest = requests.find(request => request.method === 'POST' && request.url === '/api/admin/users');
  expect(JSON.parse(createRequest?.body ?? '{}')).toEqual({ name: 'New User', email: 'new@example.com', role: 'REQUESTER', isActive: true, initialPassword: 'ValidPass#12' });

  const staffRow = page.locator('.user-management-table tbody tr').filter({ hasText: 'Staff One' });
  await staffRow.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Name').fill('Updated Staff');
  await page.getByLabel('Account active').uncheck();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('User updated successfully.')).toBeVisible();

  const updatedStaffRow = page.locator('.user-management-table tbody tr').filter({ hasText: 'Updated Staff' });
  await updatedStaffRow.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Account active').check();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('User updated successfully.')).toBeVisible();

  await page.getByLabel('New initial password').fill('ResetPass#34');
  await page.getByRole('button', { name: 'Set Initial Password', exact: true }).click();
  await expect(page.getByText(/Initial password set/)).toBeVisible();
  expect(requests.some(request => request.method === 'POST' && request.url === '/api/admin/users/20/initial-password')).toBe(true);
  await expectNoHorizontalOverflow(page);
});

test('Administrator receives safe duplicate and last-admin feedback and cannot deactivate self', async ({ page }) => {
  await installMockApi(page);
  await page.goto('/admin/users');
  await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();

  await page.getByLabel('Name').fill('Duplicate');
  await page.getByLabel('Email').fill('duplicate@example.com');
  await page.getByLabel('Initial password').fill('ValidPass#12');
  await page.getByRole('button', { name: 'Create user', exact: true }).last().click();
  await expect(page.getByText('A user with this email already exists.')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('ValidPass#12');
  await page.screenshot({ path: path.resolve(__dirname, '../../artifacts/lab-03/screenshots/user-management/validation-error.png'), fullPage: true });

  const adminRow = page.locator('.user-management-table tbody tr').filter({ hasText: 'Admin One' });
  await adminRow.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByText('You cannot deactivate your own account.')).toBeVisible();
  await expect(page.getByLabel('Account active')).toBeDisabled();

  await page.locator('#managed-user-role').selectOption('REQUESTER');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('At least one active Administrator must remain.')).toBeVisible();
});

test('Requester receives the safe forbidden route state and no admin API is called', async ({ page }) => {
  const requests = await installMockApi(page, requester);
  await page.goto('/admin/users');
  await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible();
  expect(requests.some(request => request.url.startsWith('/api/admin/users'))).toBe(false);
});

test('IT Staff receives the safe forbidden route state and no admin API is called', async ({ page }) => {
  const requests = await installMockApi(page, staff);
  await page.goto('/admin/users');
  await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible();
  expect(requests.some(request => request.url.startsWith('/api/admin/users'))).toBe(false);
});

test('Unauthenticated users are redirected to Login without an admin API call', async ({ page }) => {
  const requests = await installMockApi(page, null);
  await page.goto('/admin/users');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/login');
  expect(requests.some(request => request.url.startsWith('/api/admin/users'))).toBe(false);
});

test('User Management switches to mobile cards without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await installMockApi(page);
  await page.goto('/admin/users');
  await expect(page.locator('.user-management-cards')).toBeVisible();
  await expect(page.locator('.user-management-table-wrap')).toBeHidden();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: path.resolve(__dirname, '../../artifacts/lab-03/screenshots/user-management/mobile-cards.png'), fullPage: true });
});

test('User Management meets required viewport, keyboard focus, and mobile target checks', async ({ page }) => {
  await installMockApi(page);
  for (const width of [1280, 768, 375]) {
    await page.setViewportSize({ width, height: 812 });
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.resolve(__dirname, `../../artifacts/lab-03/screenshots/user-management/${width}.png`), fullPage: true });

    if (width < 768) {
      await expect(page.locator('.user-management-cards')).toBeVisible();
      await expect(page.locator('.user-management-table-wrap')).toBeHidden();
      await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
      const checkbox = await page.getByLabel('Account active').boundingBox();
      expect(checkbox?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(checkbox?.height ?? 0).toBeGreaterThanOrEqual(44);
    } else {
      await expect(page.locator('.user-management-table-wrap')).toBeVisible();
      await expect(page.locator('.user-management-cards')).toBeHidden();
    }

    const search = page.getByLabel('Search users');
    await search.focus();
    expect(await search.evaluate(element => document.activeElement === element)).toBe(true);
    if (width < 768) {
      const searchBox = await search.boundingBox();
      expect(searchBox?.height ?? 0).toBeGreaterThanOrEqual(44);
      const createBox = await page.getByRole('button', { name: 'Create user', exact: true }).first().boundingBox();
      expect(createBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  }
});

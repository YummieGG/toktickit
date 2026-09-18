import { expect, request, test } from '@playwright/test';

const APP_ORIGIN = 'http://127.0.0.1:5173';
const ADMIN_EMAIL = 'araya.admin@toktickit.local';

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for the live E2E suite`);
  return value;
}

test('uses the live server for password change, session, role, and CSRF guards', async ({ page, context }) => {
  const initialPassword = requiredEnvironment('SEED_INITIAL_PASSWORD');
  const changedPassword = requiredEnvironment('E2E_TEST_PASSWORD');
  expect(changedPassword).not.toBe(initialPassword);

  await page.goto('/login');
  await page.locator('#login-email').fill(ADMIN_EMAIL);
  await page.locator('#login-password').fill(initialPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/change-password\/?$/);

  await page.locator('#current-password').fill(initialPassword);
  await page.locator('#new-password').fill(changedPassword);
  await page.locator('#confirm-password').fill(changedPassword);
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByRole('alert')).toContainText('Password changed. Please sign in again.');
  await expect(page).toHaveURL(/\/login\/?$/, { timeout: 10_000 });

  await page.locator('#login-email').fill(ADMIN_EMAIL);
  await page.locator('#login-password').fill(changedPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/users\/?$/);
  await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();

  const api = await request.newContext({
    baseURL: APP_ORIGIN,
    storageState: await context.storageState(),
  });

  try {
    const queueResponse = await api.get('/api/staff/tickets');
    expect(queueResponse.status()).toBe(200);
    const queueBody = await queueResponse.json() as { data?: Array<{ id: number }> };
    expect(queueBody.data?.length ?? 0).toBeGreaterThan(0);
    expect(JSON.stringify(queueBody)).not.toContain('passwordHash');
    expect(JSON.stringify(queueBody)).not.toContain('sessionToken');

    const ticketId = queueBody.data![0].id;
    const forbiddenMutation = await api.patch(`/api/tickets/${ticketId}/status`, {
      headers: { Origin: APP_ORIGIN },
      data: { status: 'OPEN', confirmed: true },
    });
    expect(forbiddenMutation.status()).toBe(403);
    const forbiddenBody = await forbiddenMutation.json() as { error?: { code?: string } };
    expect(forbiddenBody.error?.code).toBe('FORBIDDEN');

    const invalidOriginMutation = await api.post('/api/admin/users', {
      headers: { Origin: 'http://evil.test' },
      data: {},
    });
    expect(invalidOriginMutation.status()).toBe(403);
    const invalidOriginBody = await invalidOriginMutation.json() as { error?: { code?: string } };
    expect(invalidOriginBody.error?.code).toBe('CSRF_ORIGIN_INVALID');

    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login\/?$/);
    const revokedSession = await api.get('/api/auth/me');
    expect(revokedSession.status()).toBe(401);
  } finally {
    await api.dispose();
  }
});

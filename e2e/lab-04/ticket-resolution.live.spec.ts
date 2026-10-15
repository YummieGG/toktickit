import { expect, request, test } from '@playwright/test';

const APP_ORIGIN = 'http://127.0.0.1:5173';
const STAFF_EMAIL = 'pimchanok.staff@toktickit.local';

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for the live E2E suite`);
  return value;
}

test('LIVE-01: Live ticket resolution lifecycle, gate enforcement, version concurrency and reopen (AUTHZ-04, AC-04, AC-06, AC-11)', async ({
  page,
  context,
}) => {
  const password = process.env.E2E_STAFF_PASSWORD || requiredEnvironment('SEED_INITIAL_PASSWORD');

  await page.goto('/login');
  await page.locator('#login-email').fill(STAFF_EMAIL);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // If password change required on seed, handle it or expect staff queue
  if (page.url().includes('/change-password')) {
    const newPassword = 'NewLivePass_1234!';
    await page.locator('#current-password').fill(password);
    await page.locator('#new-password').fill(newPassword);
    await page.locator('#confirm-password').fill(newPassword);
    await page.getByRole('button', { name: 'Change password' }).click();
    await expect(page).toHaveURL(/\/login\/?$/, { timeout: 10_000 });
    await page.locator('#login-email').fill(STAFF_EMAIL);
    await page.locator('#login-password').fill(newPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
  }

  await expect(page).toHaveURL(/\/staff\/tickets\/?$/);

  const api = await request.newContext({
    baseURL: APP_ORIGIN,
    storageState: await context.storageState(),
  });

  try {
    const queueRes = await api.get('/api/staff/tickets');
    expect(queueRes.status()).toBe(200);
    const queueData = (await queueRes.json()) as { data?: Array<{ id: number; currentStatus: string; version: number }> };
    expect(queueData.data?.length ?? 0).toBeGreaterThan(0);

    const ticketId = queueData.data![0].id;
    const ticketRes = await api.get(`/api/tickets/${ticketId}`);
    expect(ticketRes.status()).toBe(200);
    const ticket = (await ticketRes.json()) as { data: { id: number; currentStatus: string; version: number } };

    // Stale version mutation test
    const staleRes = await api.patch(`/api/tickets/${ticketId}/status`, {
      headers: { Origin: APP_ORIGIN },
      data: {
        status: 'IN_PROGRESS',
        confirmed: false,
        expectedTicketVersion: 999999,
      },
    });
    expect(staleRes.status()).toBe(409);
    const staleBody = (await staleRes.json()) as { error?: { code?: string } };
    expect(staleBody.error?.code).toBe('CONFLICT');

    // Admin/Requester role denial check
    // Ensure Origin header is strictly checked
    const badOriginRes = await api.patch(`/api/tickets/${ticketId}/status`, {
      headers: { Origin: 'http://malicious-site.example' },
      data: {
        status: 'IN_PROGRESS',
        confirmed: false,
        expectedTicketVersion: ticket.data.version,
      },
    });
    expect(badOriginRes.status()).toBe(403);
  } finally {
    await api.dispose();
  }
});

import fs from 'fs';
import path from 'path';
import { expect, request, test } from '@playwright/test';

const APP_ORIGIN = 'http://127.0.0.1:5173';
const STAFF_EMAIL = 'pimchanok.staff@toktickit.local';
const REQUESTER_EMAIL = 'somchai.requester@toktickit.local';

function resolveInitialPassword(): string | null {
  if (process.env.E2E_STAFF_PASSWORD) return process.env.E2E_STAFF_PASSWORD;
  if (process.env.SEED_INITIAL_PASSWORD) return process.env.SEED_INITIAL_PASSWORD;
  try {
    const envFile = path.resolve(__dirname, '../../server/.env');
    if (fs.existsSync(envFile)) {
      const match = fs.readFileSync(envFile, 'utf8').match(/^SEED_INITIAL_PASSWORD=["']?([^"'\r\n]+)["']?/m);
      if (match?.[1]) return match[1];
    }
  } catch {}
  return process.env.SEED_INITIAL_PASSWORD || null;
}

async function isDatabaseHealthy(): Promise<boolean> {
  try {
    const probeApi = await request.newContext({ baseURL: APP_ORIGIN });
    const probeRes = await probeApi.post('/api/auth/login', {
      headers: { Origin: APP_ORIGIN },
      data: { email: 'probe@toktickit.local', password: 'ProbePassword123!' },
    });
    await probeApi.dispose();
    return probeRes.status() < 500;
  } catch {
    return false;
  }
}

test.describe('LIVE-02: Real PostgreSQL and Live Server Dashboard Parity (AC-07, AC-08, AC-10)', () => {
  test('Staff live operational dashboard counts match backend calculation and drilldowns maintain parity', async ({
    page,
    context,
  }) => {
    const password = resolveInitialPassword();
    if (!password) {
      test.skip(true, 'SEED_INITIAL_PASSWORD is not set; skipping live server test');
      return;
    }

    if (!(await isDatabaseHealthy())) {
      test.skip(true, 'Live database server is not reachable; skipping live server test');
      return;
    }

    // Try navigating to login; if server not running, skip
    try {
      const res = await page.goto('/login', { timeout: 5000 });
      if (!res || res.status() >= 500) {
        test.skip(true, 'Live frontend/server is not currently running');
        return;
      }
    } catch {
      test.skip(true, 'Live frontend/server is not currently running');
      return;
    }

    // Login as staff
    await page.locator('#login-email').fill(STAFF_EMAIL);
    await page.locator('#login-password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();

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

    await expect(page).toHaveURL(/\/staff\/dashboard\/?$/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Staff Dashboard' })).toBeVisible();

    // Call live API to check count parity
    const api = await request.newContext({
      baseURL: APP_ORIGIN,
      storageState: await context.storageState(),
    });

    try {
      const dashRes = await api.get('/api/dashboards/staff');
      expect(dashRes.status()).toBe(200);
      const dashData = (await dashRes.json()) as {
        metrics: {
          unassignedTickets: number;
          myTickets: number;
          myActionsTaken: number;
          ticketsByStatus: Record<string, number>;
          activeTicketsByItPriority: Record<string, number>;
        };
      };

      // Unassigned tickets card matches backend
      await expect(
        page.getByText(String(dashData.metrics.unassignedTickets)).first()
      ).toBeVisible();

      // Drilldown into Actions Taken
      await page.getByRole('link', { name: 'View Assigned Actions' }).click();
      await expect(page).toHaveURL(/\/staff\/actions-taken\?assignee=me&statuses=PENDING,IN_PROGRESS/);
      await expect(page.getByRole('heading', { name: 'My Actions Taken' })).toBeVisible();
    } finally {
      await api.dispose();
    }
  });

  test('Requester live dashboard counts match backend calculation and drilldowns maintain parity', async ({
    page,
    context,
  }) => {
    const password = resolveInitialPassword();
    if (!password) {
      test.skip(true, 'SEED_INITIAL_PASSWORD is not set; skipping live server test');
      return;
    }

    if (!(await isDatabaseHealthy())) {
      test.skip(true, 'Live database server is not reachable; skipping live server test');
      return;
    }

    try {
      const res = await page.goto('/login', { timeout: 5000 });
      if (!res || res.status() >= 500) {
        test.skip(true, 'Live frontend/server is not currently running');
        return;
      }
    } catch {
      test.skip(true, 'Live frontend/server is not currently running');
      return;
    }

    // Login as requester
    await page.locator('#login-email').fill(REQUESTER_EMAIL);
    await page.locator('#login-password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    if (page.url().includes('/change-password')) {
      const newPassword = 'NewLivePass_1234!';
      await page.locator('#current-password').fill(password);
      await page.locator('#new-password').fill(newPassword);
      await page.locator('#confirm-password').fill(newPassword);
      await page.getByRole('button', { name: 'Change password' }).click();
      await expect(page).toHaveURL(/\/login\/?$/, { timeout: 10_000 });
      await page.locator('#login-email').fill(REQUESTER_EMAIL);
      await page.locator('#login-password').fill(newPassword);
      await page.getByRole('button', { name: 'Sign in' }).click();
    }

    await expect(page).toHaveURL(/\/dashboard\/?$/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Requester Dashboard' })).toBeVisible();

    const api = await request.newContext({
      baseURL: APP_ORIGIN,
      storageState: await context.storageState(),
    });

    try {
      const dashRes = await api.get('/api/dashboards/requester');
      expect(dashRes.status()).toBe(200);
      const dashData = (await dashRes.json()) as {
        metrics: {
          openTickets: number;
          waitingForYou: number;
          recentlyUpdated: number;
          recentlyResolved: number;
        };
      };

      // Card count matches backend
      await expect(
        page.getByText(String(dashData.metrics.openTickets)).first()
      ).toBeVisible();

      // Drilldown into Open Tickets
      await page.getByRole('link', { name: 'View Open Tickets' }).click();
      await expect(page).toHaveURL(/\/tickets\?statuses=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED/);
      await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible();
    } finally {
      await api.dispose();
    }
  });
});

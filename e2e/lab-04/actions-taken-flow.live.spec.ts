import fs from 'fs';
import path from 'path';
import { expect, request, test } from '@playwright/test';

const APP_ORIGIN = 'http://127.0.0.1:5173';
const STAFF_EMAIL = 'pimchanok.staff@toktickit.local';
const REQUESTER_EMAIL = 'somchai.requester@toktickit.local';

function resolveInitialPassword(): string {
  if (process.env.E2E_STAFF_PASSWORD) return process.env.E2E_STAFF_PASSWORD;
  if (process.env.SEED_INITIAL_PASSWORD) return process.env.SEED_INITIAL_PASSWORD;
  try {
    const envFile = path.resolve(__dirname, '../../server/.env');
    if (fs.existsSync(envFile)) {
      const match = fs.readFileSync(envFile, 'utf8').match(/^SEED_INITIAL_PASSWORD=["']?([^"'\r\n]+)["']?/m);
      if (match?.[1]) return match[1];
    }
  } catch {}
  const value = process.env.SEED_INITIAL_PASSWORD;
  if (!value) throw new Error('SEED_INITIAL_PASSWORD is required for the live E2E suite');
  return value;
}

test('LIVE-01: Live Actions Taken lifecycle, assignment, edit, version check, idempotency, and Requester projection (AUTHZ-04, AC-04, AC-05, AC-11)', async ({
  page,
  context,
}) => {
  const password = resolveInitialPassword();

  // 1. Staff Authentication
  await page.goto('/login');
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

  await expect(page).toHaveURL(/\/staff\/(tickets|dashboard)\/?$/);
  if (page.url().includes('/staff/dashboard')) {
    await page.goto('/staff/tickets');
  }

  const staffApi = await request.newContext({
    baseURL: APP_ORIGIN,
    storageState: await context.storageState(),
  });

  try {
    // 2. Locate an active ticket from the queue
    const queueRes = await staffApi.get('/api/staff/tickets');
    expect(queueRes.status()).toBe(200);
    const queueData = (await queueRes.json()) as { data?: Array<{ id: number; currentStatus: string; version: number }> };
    expect(queueData.data?.length ?? 0).toBeGreaterThan(0);

    const ticketId = queueData.data![0].id;
    await page.goto(`/staff/tickets/${ticketId}`);
    await expect(page.locator('#staff-ticket-detail-title')).toBeVisible();

    // 3. Create Action via UI
    const addActionBtn = page.getByRole('button', { name: /Record First Action|Add Action/i });
    await addActionBtn.click();

    const descInput = page.locator('#action-create-desc');
    await expect(descInput).toBeVisible();
    await descInput.fill('Live verification diagnostics on gateway cluster');

    const followUpCheck = page.locator('#action-create-requires-follow-up');
    if (await followUpCheck.isVisible()) {
      await followUpCheck.check();
      await page.locator('#action-create-follow-up-note').fill('Follow-up verification check required post-deploy');
    }

    await page.getByRole('button', { name: /Save Action/i }).click();

    // Verify created action appears in UI
    const actionRow = page.locator('.actions-taken-table tbody tr', { hasText: 'Live verification diagnostics on gateway cluster' });
    await expect(actionRow).toBeVisible();
    await expect(actionRow.getByText('PENDING')).toBeVisible();

    // 4. Edit Action via UI
    const editBtn = actionRow.getByRole('button', { name: 'Edit' });
    if (await editBtn.isVisible()) {
      await editBtn.click();
      const editDesc = page.locator('#action-edit-desc');
      await expect(editDesc).toBeVisible();
      await editDesc.fill('Live verification diagnostics on gateway cluster - revised');
      await page.getByRole('button', { name: /Save Changes/i }).click();
      await expect(page.locator('.actions-taken-table')).toContainText('Live verification diagnostics on gateway cluster - revised');
    }

    // 5. Progress Action Status to IN_PROGRESS via UI
    const startBtn = actionRow.getByRole('button', { name: 'Start' });
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await expect(actionRow.getByText('IN_PROGRESS')).toBeVisible();
    }

    // 6. Complete Action with result via UI
    const completeBtn = actionRow.getByRole('button', { name: 'Complete' });
    await completeBtn.click();
    await expect(page.getByRole('heading', { name: /Change Status of Action #/ })).toBeVisible();
    await page.locator('#action-status-result').fill('Diagnostics finished with all telemetry healthy.');
    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(actionRow.getByText('COMPLETED')).toBeVisible();
    await expect(actionRow.getByText('Diagnostics finished with all telemetry healthy.')).toBeVisible();

    // 7. API-level Idempotency, Version Concurrency, and CSRF checks
    const ticketRes = await staffApi.get(`/api/tickets/${ticketId}`);
    expect(ticketRes.status()).toBe(200);
    const ticketBody = (await ticketRes.json()) as { data: { version: number } };
    const currentTicketVersion = ticketBody.data.version;

    // Test Idempotency-Key duplicate replay
    const idempotencyKey = `live-idem-${Date.now()}`;
    const createPayload = {
      description: 'Idempotent action creation test',
      expectedTicketVersion: currentTicketVersion,
    };

    const firstPost = await staffApi.post(`/api/tickets/${ticketId}/actions-taken`, {
      headers: {
        Origin: APP_ORIGIN,
        'Idempotency-Key': idempotencyKey,
      },
      data: createPayload,
    });
    expect([200, 201]).toContain(firstPost.status());
    const firstBody = (await firstPost.json()) as { data: { id: number } };

    // Replay with identical key
    const replayPost = await staffApi.post(`/api/tickets/${ticketId}/actions-taken`, {
      headers: {
        Origin: APP_ORIGIN,
        'Idempotency-Key': idempotencyKey,
      },
      data: createPayload,
    });
    expect([200, 201]).toContain(replayPost.status());
    const replayBody = (await replayPost.json()) as { data: { id: number } };
    expect(replayBody.data.id).toBe(firstBody.data.id);

    // Stale ticket version check -> 409 CONFLICT
    const stalePost = await staffApi.post(`/api/tickets/${ticketId}/actions-taken`, {
      headers: {
        Origin: APP_ORIGIN,
        'Idempotency-Key': `live-idem-${Date.now()}-stale`,
      },
      data: {
        description: 'Stale version action creation',
        expectedTicketVersion: 999999,
      },
    });
    expect(stalePost.status()).toBe(409);
    const staleData = (await stalePost.json()) as { error?: { code?: string } };
    expect(staleData.error?.code).toBe('CONFLICT');

    // Forbidden Origin CSRF check -> 403
    const badOriginPost = await staffApi.post(`/api/tickets/${ticketId}/actions-taken`, {
      headers: {
        Origin: 'http://malicious.example.com',
        'Idempotency-Key': `live-idem-${Date.now()}-csrf`,
      },
      data: {
        description: 'CSRF action creation',
        expectedTicketVersion: currentTicketVersion,
      },
    });
    expect(badOriginPost.status()).toBe(403);

    // 8. Requester Read-Only Verification
    await page.goto('/login');
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

    await page.goto(`/tickets/${ticketId}`);
    // If ticket is owned by Requester, Actions Taken section is rendered read-only
    const actionsSection = page.locator('#actions-taken-section');
    if (await actionsSection.isVisible()) {
      await expect(actionsSection).toBeVisible();
      // Confirm Requester has no creation, edit, or status controls
      await expect(actionsSection.getByRole('button', { name: /Add Action|Record First Action/i })).toHaveCount(0);
      await expect(actionsSection.getByRole('button', { name: 'Edit' })).toHaveCount(0);
      await expect(actionsSection.getByRole('button', { name: 'Complete' })).toHaveCount(0);
      await expect(actionsSection.getByRole('button', { name: 'Cancel' })).toHaveCount(0);
    }
  } finally {
    await staffApi.dispose();
  }
});

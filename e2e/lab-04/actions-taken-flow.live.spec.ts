import fs from 'fs';
import path from 'path';
import { expect, request, test, type Page } from '@playwright/test';

const APP_ORIGIN = 'http://127.0.0.1:5173';
const STAFF_EMAIL = 'pimchanok.staff@toktickit.local';
const REQUESTER_EMAIL = 'somchai.p@toktickit.local';

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

async function handlePasswordChangeIfRequired(
  page: Page,
  email: string,
  currentPass: string,
  newPass = 'NewLivePass_1234!',
): Promise<void> {
  if (page.url().includes('/change-password')) {
    await page.locator('#current-password').fill(currentPass);
    await page.locator('#new-password').fill(newPass);
    await page.locator('#confirm-password').fill(newPass);
    await page.getByRole('button', { name: 'Change password' }).click();
    await expect(page).toHaveURL(/\/login\/?$/, { timeout: 10_000 });
    await page.locator('#login-email').fill(email);
    await page.locator('#login-password').fill(newPass);
    await page.getByRole('button', { name: 'Sign in' }).click();
  }
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

  await handlePasswordChangeIfRequired(page, STAFF_EMAIL, password);

  await expect(page).toHaveURL(/\/staff\/(tickets|dashboard)\/?$/);
  if (page.url().includes('/staff/dashboard')) {
    await page.goto('/staff/tickets');
  }

  const staffApi = await request.newContext({
    baseURL: APP_ORIGIN,
    storageState: await context.storageState(),
  });

  try {
    // 2. Locate an active ticket from the queue owned by the seeded requester
    const queueRes = await staffApi.get('/api/staff/tickets');
    expect(queueRes.status()).toBe(200);
    const queueData = (await queueRes.json()) as {
      data?: Array<{ id: number; currentStatus: string; version: number; requester?: { email: string } }>;
    };
    expect(queueData.data?.length ?? 0).toBeGreaterThan(0);

    const targetTicket = queueData.data?.find(
      (t) =>
        t.requester?.email === REQUESTER_EMAIL &&
        t.currentStatus !== 'CLOSED' &&
        t.currentStatus !== 'CANCELLED',
    );
    expect(targetTicket, `Expected active ticket owned by ${REQUESTER_EMAIL} in staff queue`).toBeDefined();
    const ticketId = targetTicket!.id;

    await page.goto(`/staff/tickets/${ticketId}`);
    await expect(page.locator('#staff-ticket-detail-title')).toBeVisible();

    // 3. Create Action via UI with follow-up note
    const addActionBtn = page.getByRole('button', { name: /Record First Action|Add Action/i });
    await expect(addActionBtn).toBeVisible();
    await addActionBtn.click();

    const descInput = page.locator('#action-create-desc');
    await expect(descInput).toBeVisible();
    await descInput.fill('Live verification diagnostics on gateway cluster');

    const followUpCheck = page.locator('#action-create-followup');
    await expect(followUpCheck).toBeVisible();
    await followUpCheck.check();

    const followUpNote = page.locator('#action-create-followup-note');
    await expect(followUpNote).toBeVisible();
    await followUpNote.fill('Follow-up verification check required post-deploy');

    await page.getByRole('button', { name: /Save Action/i }).click();

    // Verify created action appears in UI with pending state and follow-up note
    const actionRow = page.locator('.actions-taken-table tbody tr', {
      hasText: 'Live verification diagnostics on gateway cluster',
    });
    await expect(actionRow).toBeVisible();
    await expect(actionRow.getByText('PENDING')).toBeVisible();
    await expect(actionRow).toContainText('Follow-up verification check required post-deploy');

    // 4. Action Assignment & Reassignment via UI (AC-04)
    const reassignBtn = actionRow.getByRole('button', { name: 'Reassign' });
    await expect(reassignBtn).toBeVisible();
    await reassignBtn.click();

    const reassignSelect = page.locator('#action-reassign-select');
    await expect(reassignSelect).toBeVisible();
    const availableOptions = await reassignSelect
      .locator('option')
      .evaluateAll((opts: HTMLOptionElement[]) =>
        opts.map((o) => ({ value: o.value, text: o.text })).filter((o) => Boolean(o.value)),
      );
    expect(availableOptions.length).toBeGreaterThan(0);
    const targetOption = availableOptions.find((o) => !o.text.includes('Pimchanok')) ?? availableOptions[0];
    await reassignSelect.selectOption(targetOption.value);
    await page.getByRole('button', { name: 'Confirm Assignment' }).click();
    await expect(page.locator('.alert.alert-success')).toBeVisible();

    // 5. Edit Action via UI
    const editBtn = actionRow.getByRole('button', { name: 'Edit' });
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    const editDesc = page.locator('#action-edit-desc');
    await expect(editDesc).toBeVisible();
    await editDesc.fill('Live verification diagnostics on gateway cluster - revised');
    await page.getByRole('button', { name: /Save Changes/i }).click();
    await expect(page.locator('.actions-taken-table')).toContainText(
      'Live verification diagnostics on gateway cluster - revised',
    );

    // 6. Progress Action Status to IN_PROGRESS via UI
    const startBtn = actionRow.getByRole('button', { name: 'Start' });
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    await expect(actionRow.getByText('IN_PROGRESS')).toBeVisible();

    // 7. Complete Action with result via UI
    const completeBtn = actionRow.getByRole('button', { name: 'Complete' });
    await expect(completeBtn).toBeVisible();
    await completeBtn.click();
    await expect(page.getByRole('heading', { name: /Change Status of Action #/ })).toBeVisible();
    await page.locator('#action-status-result').fill('Diagnostics finished with all telemetry healthy.');
    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(actionRow.getByText('COMPLETED')).toBeVisible();
    await expect(actionRow.getByText('Diagnostics finished with all telemetry healthy.')).toBeVisible();

    // 8. API-level Idempotency, Version Concurrency, and CSRF checks
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
    expect(firstPost.status()).toBe(201);
    const firstBody = (await firstPost.json()) as { data: { action?: { id: number }; id?: number } };
    const firstActionId = firstBody.data?.action?.id ?? (firstBody.data as any)?.id;
    expect(firstActionId).toBeDefined();

    // Replay with identical key
    const replayPost = await staffApi.post(`/api/tickets/${ticketId}/actions-taken`, {
      headers: {
        Origin: APP_ORIGIN,
        'Idempotency-Key': idempotencyKey,
      },
      data: createPayload,
    });
    expect(replayPost.status()).toBe(200);
    const replayBody = (await replayPost.json()) as { data: { action?: { id: number }; id?: number } };
    const replayActionId = replayBody.data?.action?.id ?? (replayBody.data as any)?.id;
    expect(replayActionId).toBe(firstActionId);

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

    // 9. Requester Read-Only Verification
    await page.goto('/login');
    await page.locator('#login-email').fill(REQUESTER_EMAIL);
    await page.locator('#login-password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await handlePasswordChangeIfRequired(page, REQUESTER_EMAIL, password);

    await page.goto(`/tickets/${ticketId}`);
    // Confirm Requester sees Actions Taken section in strictly read-only projection
    const actionsSection = page.locator('#actions-taken-section');
    await expect(actionsSection).toBeVisible();
    // Confirm Requester has zero mutation affordances
    await expect(actionsSection.getByRole('button', { name: /Add Action|Record First Action/i })).toHaveCount(0);
    await expect(actionsSection.getByRole('button', { name: 'Edit' })).toHaveCount(0);
    await expect(actionsSection.getByRole('button', { name: 'Complete' })).toHaveCount(0);
    await expect(actionsSection.getByRole('button', { name: 'Cancel' })).toHaveCount(0);
    await expect(actionsSection.getByRole('button', { name: 'Reassign' })).toHaveCount(0);
  } finally {
    await staffApi.dispose();
  }
});

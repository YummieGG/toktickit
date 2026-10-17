import fs from 'fs';
import path from 'path';
import { expect, request, test } from '@playwright/test';

const APP_ORIGIN = 'http://127.0.0.1:5173';
const STAFF_EMAIL = 'pimchanok.staff@toktickit.local';

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

test('LIVE-01: Live ticket resolution lifecycle, gate enforcement, version concurrency and reopen (AUTHZ-04, AC-04, AC-06, AC-11)', async ({
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

    // 2. Navigate to Ticket Detail in Browser UI
    await page.goto(`/staff/tickets/${ticketId}`);
    await expect(page.locator('#staff-ticket-detail-title')).toBeVisible();

    const statusSelect = page.locator('#ticket-status');
    await expect(statusSelect).toBeVisible();

    // Ensure ticket is in IN_PROGRESS state to test resolution gate
    if ((await statusSelect.inputValue()) === 'NEW') {
      await statusSelect.selectOption('OPEN');
      await expect(page.locator('.alert.alert-success')).toContainText('Ticket status updated.');
    }
    if ((await statusSelect.inputValue()) === 'OPEN' || (await statusSelect.inputValue()) === 'REOPENED') {
      await statusSelect.selectOption('IN_PROGRESS');
      await expect(page.locator('.alert.alert-success')).toContainText('Ticket status updated.');
    }

    // 3. Browser UI Resolution Gate Enforcement (Blocked resolve test)
    // Create an active (PENDING) action or verify resolution gate blocks resolve
    const addActionBtn = page.getByRole('button', { name: /Record First Action|Add Action/i });
    await addActionBtn.click();
    await page.locator('#action-create-desc').fill('Live test active diagnostic action');
    await page.getByRole('button', { name: /Save Action/i }).click();

    const liveActionRow = page.locator('.actions-taken-table tbody tr', { hasText: 'Live test active diagnostic action' });
    await expect(liveActionRow).toBeVisible();
    await expect(liveActionRow.getByText('PENDING')).toBeVisible();

    // Attempt to resolve ticket with active child action -> BLOCKED by resolution gate
    await statusSelect.selectOption('RESOLVED');
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();

    // Verify error banner is displayed in the browser
    await expect(page.locator('.alert.alert-danger')).toBeVisible();
    await expect(page.locator('.alert.alert-danger')).toContainText(
      /resolution is blocked|completed action|actions must be completed/i,
    );
    await expect(statusSelect).toHaveClass(/is-invalid/);
    await expect(statusSelect).toHaveAttribute('aria-invalid', 'true');
    await expect(statusSelect).toHaveAttribute('aria-describedby', 'ticket-status-error');

    // 4. Complete the action with recorded result
    await liveActionRow.getByRole('button', { name: 'Complete' }).click();
    await expect(page.getByRole('heading', { name: /Change Status of Action #/ })).toBeVisible();
    await page.locator('#action-status-result').fill('Live hardware and network inspection completed cleanly.');
    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(liveActionRow.getByText('COMPLETED')).toBeVisible();
    await expect(liveActionRow.getByText('Live hardware and network inspection completed cleanly.')).toBeVisible();

    // Cancel any other lingering active actions that would block resolution gate
    const otherActiveRows = page.locator('.actions-taken-table tbody tr:has-text("PENDING"), .actions-taken-table tbody tr:has-text("IN_PROGRESS")');
    const activeCount = await otherActiveRows.count();
    for (let i = 0; i < activeCount; i++) {
      const row = otherActiveRows.first();
      if (await row.isVisible()) {
        const cancelBtn = row.getByRole('button', { name: 'Cancel' });
        if (await cancelBtn.isVisible()) {
          await cancelBtn.click();
          await page.locator('#action-status-cancel-reason').fill('Live test cleanup');
          await page.getByRole('button', { name: 'Confirm' }).click();
        }
      }
    }

    // 5. Successful Resolution via Browser UI & Live DB Transaction
    await statusSelect.selectOption('RESOLVED');
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();

    await expect(page.locator('.alert.alert-success')).toContainText('Ticket status updated.');
    await expect(page.locator('.ticket-detail-badge', { hasText: 'Status' })).toContainText('RESOLVED');
    await expect(page.getByText('Resolved At')).toBeVisible();

    // 6. Close Ticket via Browser UI
    await statusSelect.selectOption('CLOSED');
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();

    await expect(page.locator('.alert.alert-success')).toContainText('Ticket status updated.');
    await expect(page.locator('.ticket-detail-badge', { hasText: 'Status' })).toContainText('CLOSED');
    await expect(page.getByText('Resolved At')).toBeVisible();

    // 7. Reopen Ticket via Browser UI (Resets resolvedAt & problemAppearsResolvedAt)
    await statusSelect.selectOption('REOPENED');
    const reopenModal = page.getByRole('dialog');
    await expect(reopenModal).toContainText('preserve all past action and event history');
    await reopenModal.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.locator('.alert.alert-success')).toContainText('Ticket status updated.');
    await expect(page.locator('.ticket-detail-badge', { hasText: 'Status' })).toContainText('REOPENED');
    await expect(page.getByText('Not resolved')).toBeVisible();

    // 8. Atomic Child Cancellation (BR-16) via Browser UI
    await statusSelect.selectOption('IN_PROGRESS');
    await expect(page.locator('.alert.alert-success')).toContainText('Ticket status updated.');

    await page.getByRole('button', { name: /Add Action/i }).click();
    await page.locator('#action-create-desc').fill('Action destined for atomic cancellation');
    await page.getByRole('button', { name: /Save Action/i }).click();

    const cancelCandidateRow = page.locator('.actions-taken-table tbody tr', { hasText: 'Action destined for atomic cancellation' });
    await expect(cancelCandidateRow).toBeVisible();
    await expect(cancelCandidateRow.getByText('PENDING')).toBeVisible();

    // Cancel ticket -> atomically cancels active child actions
    await statusSelect.selectOption('CANCELLED');
    const cancelModal = page.getByRole('dialog');
    await expect(cancelModal).toContainText('cancel any active child actions');
    await cancelModal.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.locator('.alert.alert-success')).toContainText('Ticket status updated.');
    await expect(page.locator('.ticket-detail-badge', { hasText: 'Status' })).toContainText('CANCELLED');
    await expect(cancelCandidateRow.getByText('CANCELLED')).toBeVisible();
    await expect(cancelCandidateRow.getByText('Ticket cancelled by IT Staff')).toBeVisible();

    // 9. API-level Concurrency and Security assertions
    const verifyTicketRes = await api.get(`/api/tickets/${ticketId}`);
    expect(verifyTicketRes.status()).toBe(200);
    const updatedTicket = (await verifyTicketRes.json()) as { data: { id: number; currentStatus: string; version: number } };
    expect(updatedTicket.data.currentStatus).toBe('CANCELLED');

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

    // Origin CSRF check
    const badOriginRes = await api.patch(`/api/tickets/${ticketId}/status`, {
      headers: { Origin: 'http://malicious-site.example' },
      data: {
        status: 'IN_PROGRESS',
        confirmed: false,
        expectedTicketVersion: updatedTicket.data.version,
      },
    });
    expect(badOriginRes.status()).toBe(403);
  } finally {
    await api.dispose();
  }
});

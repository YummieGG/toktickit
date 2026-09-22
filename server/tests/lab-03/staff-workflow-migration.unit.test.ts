import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(process.cwd(), 'prisma/migrations/20260913000000_lab3_staff_ticket_workflow/migration.sql');

describe('Issue #41 staff workflow migration contract', () => {
  it('is additive and repeatable for status values, notes, relationships, and queue indexes', () => {
    const migration = readFileSync(migrationPath, 'utf8');
    for (const status of ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED']) {
      expect(migration).toContain(`ADD VALUE IF NOT EXISTS '${status}'`);
    }
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "InternalNote"');
    expect(migration).toContain('InternalNote_ticketId_fkey');
    expect(migration).toContain('InternalNote_authorId_fkey');
    expect(migration).toContain('Ticket_requestedPriority_idx');
    expect(migration).toContain('Ticket_itPriority_idx');
    expect(migration).toContain('Ticket_updatedAt_idx');
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN|TYPE)\s+/i);
  });
});

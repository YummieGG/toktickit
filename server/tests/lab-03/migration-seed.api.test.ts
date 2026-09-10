import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'prisma/migrations/20260910000000_lab3_auth_foundation/migration.sql',
);
const seedPath = resolve(process.cwd(), 'prisma/seed.ts');

describe('Lab 3-2 migration and seed contract', () => {
  it('uses a non-destructive, repeatable migration shape', () => {
    const migration = readFileSync(migrationPath, 'utf8');

    expect(migration).toContain('ALTER TABLE "RequesterUser" RENAME TO "User"');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "UserSession"');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "LoginAttempt"');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "passwordHash"');
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key"');
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN|TYPE)\s+/i);
  });

  it('sources seed credentials from the environment and preserves existing hashes', () => {
    const seed = readFileSync(seedPath, 'utf8');

    expect(seed).toContain('SEED_INITIAL_PASSWORD');
    expect(seed).toContain('validatePassword(value)');
    expect(seed).toContain('transaction.user.upsert');
    expect(seed).toContain('where: { id, passwordHash: null }');
    expect(seed).toContain('await prisma.$transaction');
    expect(seed).not.toContain('ValidPass#12');
  });
});

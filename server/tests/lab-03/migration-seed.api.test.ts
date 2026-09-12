import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'prisma/migrations/20260910000000_lab3_auth_foundation/migration.sql',
);
const seedPath = resolve(process.cwd(), 'prisma/seed.ts');
const correctiveMigrationPath = resolve(
  process.cwd(),
  'prisma/migrations/20260910010000_canonical_user_email/migration.sql',
);
const authorizationMigrationPath = resolve(
  process.cwd(),
  'prisma/migrations/20260912000000_lab3_authorization_requester/migration.sql',
);

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

  it('rejects canonical email collisions before changing legacy rows', () => {
    const migration = readFileSync(migrationPath, 'utf8');
    const collisionGuard = migration.indexOf('legacy canonical collisions exist');
    const canonicalization = migration.indexOf('UPDATE "User"');

    expect(collisionGuard).toBeGreaterThanOrEqual(0);
    expect(canonicalization).toBeGreaterThan(collisionGuard);
    expect(migration).toContain('GROUP BY lower(btrim("email"))');
    expect(migration).toContain("ERRCODE = '23505'");
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

  it('keeps the historical migration intact and applies canonical email correction separately', () => {
    const correctiveMigration = readFileSync(correctiveMigrationPath, 'utf8');

    expect(correctiveMigration).toContain('UPDATE "User"');
    expect(correctiveMigration).toContain('legacy canonical collisions exist');
    expect(correctiveMigration).toContain('User_email_canonical_check');
  });

  it('adds requester authorization data without replacing Lab 2 records', () => {
    const migration = readFileSync(authorizationMigrationPath, 'utf8');

    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "ownerId"');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "itPriority"');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "problemAppearsResolvedAt"');
    expect(migration).toContain('SET "itPriority" = "requestedPriority"');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "PublicComment"');
    expect(migration).toContain('ON DELETE CASCADE ON UPDATE CASCADE');
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN|TYPE)\s+/i);
    expect(migration).not.toMatch(/DELETE\s+FROM\s+"(?:Ticket|Attachment|User)"/i);
  });
});

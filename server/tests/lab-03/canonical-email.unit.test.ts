import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { canonicalizeEmail } from '../../src/lib/auth';

const correctiveMigrationPath = resolve(
  process.cwd(),
  'prisma/migrations/20260910010000_canonical_user_email/migration.sql',
);

describe('Lab 3-2 canonical email contract', () => {
  it('canonicalizes leading/trailing whitespace and casing consistently', () => {
    expect(canonicalizeEmail('  User@Example.COM  ')).toBe('user@example.com');
    expect(canonicalizeEmail(null)).toBe('');
  });

  it('uses a corrective migration that fails on canonical collisions and preserves rows', () => {
    const migration = readFileSync(correctiveMigrationPath, 'utf8');

    expect(migration).toContain('GROUP BY lower(btrim("email"))');
    expect(migration).toContain('legacy canonical collisions exist');
    expect(migration).toContain('User_email_canonical_check');
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN|TYPE)\s+/i);
  });
});

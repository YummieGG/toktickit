import { execFile as execFileCallback } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const execFile = promisify(execFileCallback);
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const suffix = `${Date.now()}_${process.pid}`;
const temporaryDatabaseName = `toktickit_migration_${suffix}`;
const initialPassword = 'MigrationPass#12';
const legacyEmail = `legacy.requester.${suffix}@example.com`;
const preservedSeedEmail = 'araya.admin@toktickit.local';
const preservedPasswordHash = 'existing-hash-must-not-change';
const migrationFiles = [
  '20260812165245_init_category_model/migration.sql',
  '20260901033000_init_lab2_schema/migration.sql',
  '20260910000000_lab3_auth_foundation/migration.sql',
  '20260910010000_canonical_user_email/migration.sql',
  '20260912000000_lab3_authorization_requester/migration.sql',
  '20260913000000_lab3_staff_ticket_workflow/migration.sql',
];

let adminClient: Client | undefined;
let databaseClient: Client | undefined;
let temporaryDatabaseUrl: string;

function databaseUrlWithName(source: string, name: string): string {
  const url = new URL(source);
  url.pathname = `/${name}`;
  return url.toString();
}

async function runSeed(password: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await execFile(
      resolve(process.cwd(), 'node_modules/.bin/tsx'),
      ['prisma/seed.ts'],
      {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: temporaryDatabaseUrl, SEED_INITIAL_PASSWORD: password },
        maxBuffer: 2 * 1024 * 1024,
      },
    );
    return { ...result, exitCode: 0 };
  } catch (error) {
    const commandError = error as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: commandError.stdout ?? '',
      stderr: commandError.stderr ?? '',
      exitCode: typeof commandError.code === 'number' ? commandError.code : 1,
    };
  }
}

async function applyMigration(relativePath: string): Promise<void> {
  const sql = readFileSync(resolve(process.cwd(), 'prisma/migrations', relativePath), 'utf8');
  await databaseClient!.query(sql);
}

async function readCounts(): Promise<Record<string, number>> {
  const result = await databaseClient!.query<{ tableName: string; count: string }>(`
    SELECT 'users' AS "tableName", COUNT(*)::text AS count FROM "User"
    UNION ALL SELECT 'categories', COUNT(*)::text FROM "Category"
    UNION ALL SELECT 'relatedSystems', COUNT(*)::text FROM "RelatedSystem"
    UNION ALL SELECT 'tickets', COUNT(*)::text FROM "Ticket"
    UNION ALL SELECT 'attachments', COUNT(*)::text FROM "Attachment"
    UNION ALL SELECT 'comments', COUNT(*)::text FROM "PublicComment"
    UNION ALL SELECT 'notes', COUNT(*)::text FROM "InternalNote"
  `);
  return Object.fromEntries(result.rows.map(row => [row.tableName, Number(row.count)]));
}

describe('Lab 3 clean migration and seed PostgreSQL integration (API-12)', () => {
  beforeAll(async () => {
    if (!TEST_DATABASE_URL) {
      throw new Error('TEST_DATABASE_URL is required for the PostgreSQL integration suite');
    }

    temporaryDatabaseUrl = databaseUrlWithName(TEST_DATABASE_URL, temporaryDatabaseName);
    adminClient = new Client({ connectionString: databaseUrlWithName(TEST_DATABASE_URL, 'postgres') });
    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE "${temporaryDatabaseName}"`);
    await adminClient.end();
    adminClient = undefined;

    databaseClient = new Client({ connectionString: temporaryDatabaseUrl });
    await databaseClient.connect();
    await applyMigration(migrationFiles[0]);
    await applyMigration(migrationFiles[1]);

    const category = await databaseClient.query<{ id: number }>(
      'INSERT INTO "Category" ("name") VALUES ($1) RETURNING id',
      [`Legacy category ${suffix}`],
    );
    const relatedSystem = await databaseClient.query<{ id: number }>(
      'INSERT INTO "RelatedSystem" ("name") VALUES ($1) RETURNING id',
      [`Legacy system ${suffix}`],
    );
    const legacyUser = await databaseClient.query<{ id: number }>(
      'INSERT INTO "RequesterUser" ("name", "email", "isActive", "createdAt", "updatedAt") VALUES ($1, $2, true, $3, $3) RETURNING id',
      ['Legacy Requester', `  ${legacyEmail.toUpperCase()}  `, new Date('2026-09-01T08:00:00.000Z')],
    );
    const legacyTicket = await databaseClient.query<{ id: number }>(
      'INSERT INTO "Ticket" ("ticketNumber", "summary", "description", "requestedPriority", "currentStatus", "ticketDate", "createdAt", "updatedAt", "requesterId", "categoryId", "relatedSystemId") VALUES ($1, $2, $3, $4, $5, $6, $6, $6, $7, $8, $9) RETURNING id',
      [
        `TK-LEGACY-${suffix}`,
        'Legacy ticket survives migration',
        'The original Lab 2 ticket must remain available.',
        'HIGH',
        'NEW',
        new Date('2026-09-02T09:00:00.000Z'),
        legacyUser.rows[0].id,
        category.rows[0].id,
        relatedSystem.rows[0].id,
      ],
    );
    await databaseClient.query(
      'INSERT INTO "Attachment" ("originalName", "storedName", "mimeType", "sizeBytes", "ticketId", "createdAt") VALUES ($1, $2, $3, $4, $5, $6)',
      ['legacy.pdf', `legacy-${suffix}.pdf`, 'application/pdf', 12, legacyTicket.rows[0].id, new Date('2026-09-02T09:05:00.000Z')],
    );

    for (const migrationFile of migrationFiles.slice(2)) await applyMigration(migrationFile);

    await databaseClient.query(
      'INSERT INTO "User" ("name", "email", "role", "isActive", "passwordHash", "mustChangePassword", "createdAt", "updatedAt") VALUES ($1, $2, $3, true, $4, false, $5, $5)',
      ['Existing Seed Administrator', preservedSeedEmail, 'ADMINISTRATOR', preservedPasswordHash, new Date('2026-09-03T08:00:00.000Z')],
    );

    const seedResult = await runSeed(initialPassword);
    expect(seedResult.exitCode, `${seedResult.stdout}\n${seedResult.stderr}`).toBe(0);
  }, 120_000);

  afterAll(async () => {
    await databaseClient?.end();
    adminClient = new Client({ connectionString: databaseUrlWithName(TEST_DATABASE_URL ?? '', 'postgres') });
    try {
      await adminClient.connect();
      await adminClient.query(`DROP DATABASE IF EXISTS "${temporaryDatabaseName}" WITH (FORCE)`);
    } finally {
      await adminClient.end();
    }
  });

  it('preserves Lab 2 IDs, ownership, attachments, and backfills legacy requester credentials', async () => {
    const legacyUser = await databaseClient!.query<{
      id: number;
      email: string;
      role: string;
      passwordHash: string | null;
      mustChangePassword: boolean;
    }>('SELECT id, email, role, "passwordHash", "mustChangePassword" FROM "User" WHERE email = $1', [legacyEmail]);
    const legacyTicket = await databaseClient!.query<{ id: number; requesterId: number }>(
      'SELECT id, "requesterId" AS "requesterId" FROM "Ticket" WHERE "ticketNumber" = $1',
      [`TK-LEGACY-${suffix}`],
    );
    const attachment = await databaseClient!.query<{ ticketId: number }>(
      'SELECT "ticketId" AS "ticketId" FROM "Attachment" WHERE "storedName" = $1',
      [`legacy-${suffix}.pdf`],
    );

    expect(legacyUser.rows).toHaveLength(1);
    expect(legacyUser.rows[0]).toMatchObject({ email: legacyEmail, role: 'REQUESTER', mustChangePassword: true });
    const [algorithm, n, r, p, salt, key] = legacyUser.rows[0].passwordHash!.split('$');
    expect(algorithm).toBe('scrypt');
    expect(Number(n)).toBe(32_768);
    expect(Number(r)).toBe(8);
    expect(Number(p)).toBe(1);
    expect(Buffer.from(salt!, 'base64url')).toHaveLength(16);
    expect(Buffer.from(key!, 'base64url')).toHaveLength(32);
    expect(legacyTicket.rows).toHaveLength(1);
    expect(attachment.rows).toEqual([{ ticketId: legacyTicket.rows[0].id }]);
    expect(legacyTicket.rows[0].requesterId).toBe(legacyUser.rows[0].id);
  });

  it('keeps seed data idempotent and does not overwrite an existing password hash', async () => {
    const countsBefore = await readCounts();
    const firstHash = await databaseClient!.query<{ passwordHash: string }>(
      'SELECT "passwordHash" AS "passwordHash" FROM "User" WHERE email = $1',
      [preservedSeedEmail],
    );

    const seedResult = await runSeed(initialPassword);
    const countsAfter = await readCounts();
    const secondHash = await databaseClient!.query<{ passwordHash: string }>(
      'SELECT "passwordHash" AS "passwordHash" FROM "User" WHERE email = $1',
      [preservedSeedEmail],
    );

    expect(seedResult.exitCode, `${seedResult.stdout}\n${seedResult.stderr}`).toBe(0);
    expect(countsAfter).toEqual(countsBefore);
    expect(secondHash.rows[0].passwordHash).toBe(firstHash.rows[0].passwordHash);
  });

  it('rejects an invalid seed password before writing and never echoes the secret', async () => {
    const countsBefore = await readCounts();
    const invalidPassword = 'weak';
    const seedResult = await runSeed(invalidPassword);
    const countsAfter = await readCounts();

    expect(seedResult.exitCode).not.toBe(0);
    expect(`${seedResult.stdout}\n${seedResult.stderr}`).not.toContain(invalidPassword);
    expect(countsAfter).toEqual(countsBefore);
  });
});

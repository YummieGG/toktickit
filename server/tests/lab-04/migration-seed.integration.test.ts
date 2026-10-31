import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/toktickit_db?schema=public';
const suffix = `${Date.now()}-${process.pid}`;
const temporaryDatabaseName = `toktickit_test_lab4_${suffix}`;
const initialPassword = 'Password_123';
const legacyEmail = `legacy.lab4.${suffix}@example.com`;

const migrationFiles = [
  '20260812165245_init_category_model/migration.sql',
  '20260901033000_init_lab2_schema/migration.sql',
  '20260910000000_lab3_auth_foundation/migration.sql',
  '20260910010000_canonical_user_email/migration.sql',
  '20260912000000_lab3_authorization_requester/migration.sql',
  '20260913000000_lab3_staff_ticket_workflow/migration.sql',
  '20261013000000_lab4_actions_taken_foundation/migration.sql',
];

let adminClient: Client | undefined;
let databaseClient: Client | undefined;
let temporaryDatabaseUrl: string;

function databaseUrlWithName(source: string, name: string): string {
  const url = new URL(source);
  url.pathname = `/${name}`;
  return url.toString();
}

async function runSeed(password: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolvePromise, rejectPromise) => {
    const processInstance = spawn('npx', ['tsx', 'prisma/seed.ts'], {
      cwd: resolve(process.cwd()),
      env: {
        ...process.env,
        DATABASE_URL: temporaryDatabaseUrl,
        SEED_INITIAL_PASSWORD: password,
      },
    });

    let stdout = '';
    let stderr = '';
    processInstance.stdout.on('data', chunk => { stdout += chunk.toString(); });
    processInstance.stderr.on('data', chunk => { stderr += chunk.toString(); });
    processInstance.on('error', rejectPromise);
    processInstance.on('close', code => {
      resolvePromise({ exitCode: code ?? 1, stdout, stderr });
    });
  });
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
    UNION ALL SELECT 'actions', COUNT(*)::text FROM "ActionTaken"
    UNION ALL SELECT 'actionEvents', COUNT(*)::text FROM "ActionTakenEvent"
  `);
  return Object.fromEntries(result.rows.map(row => [row.tableName, Number(row.count)]));
}

describe('PG-02: Lab 4 Migration, Schema & Repeatable Seed Integration (MIGRATION-04, SEED-04, AC-09)', () => {
  beforeAll(async () => {
    temporaryDatabaseUrl = databaseUrlWithName(TEST_DATABASE_URL, temporaryDatabaseName);
    adminClient = new Client({ connectionString: databaseUrlWithName(TEST_DATABASE_URL, 'postgres') });
    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE "${temporaryDatabaseName}"`);
    await adminClient.end();
    adminClient = undefined;

    databaseClient = new Client({ connectionString: temporaryDatabaseUrl });
    await databaseClient.connect();

    // Apply migrations up through Lab 3
    for (const file of migrationFiles.slice(0, 6)) {
      await applyMigration(file);
    }

    // Insert legacy user and ticket to test non-destructive additive migration
    const userRes = await databaseClient.query<{ id: number }>(
      'INSERT INTO "User" ("name", "email", "role", "isActive", "createdAt", "updatedAt") VALUES ($1, $2, $3, true, now(), now()) RETURNING id',
      ['Legacy User', legacyEmail, 'REQUESTER'],
    );
    const catRes = await databaseClient.query<{ id: number }>(
      'INSERT INTO "Category" ("name", "isActive") VALUES ($1, true) RETURNING id',
      [`Legacy Cat ${suffix}`],
    );
    await databaseClient.query(
      'INSERT INTO "Ticket" ("ticketNumber", "summary", "description", "requestedPriority", "itPriority", "currentStatus", "requesterId", "categoryId", "ticketDate", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now(), now())',
      [`TK-LEGACY-${suffix}`, 'Legacy summary', 'Legacy description', 'LOW', 'HIGH', 'NEW', userRes.rows[0].id, catRes.rows[0].id],
    );

    // Apply Lab 4 additive migration
    await applyMigration(migrationFiles[6]);

    // Run first seed
    const seedResult = await runSeed(initialPassword);
    expect(seedResult.exitCode, `${seedResult.stdout}\n${seedResult.stderr}`).toBe(0);
  }, 120_000);

  afterAll(async () => {
    await databaseClient?.end();
    const cleanupClient = new Client({ connectionString: databaseUrlWithName(TEST_DATABASE_URL, 'postgres') });
    await cleanupClient.connect();
    await cleanupClient.query(`DROP DATABASE IF EXISTS "${temporaryDatabaseName}"`);
    await cleanupClient.end();
  });

  it('preserves legacy tickets with default version=1 and nullable resolvedAt', async () => {
    const res = await databaseClient!.query<{ version: number; resolvedAt: Date | null }>(
      'SELECT "version", "resolvedAt" FROM "Ticket" WHERE "ticketNumber" = $1',
      [`TK-LEGACY-${suffix}`],
    );
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].version).toBe(1);
    expect(res.rows[0].resolvedAt).toBeNull();
  });

  it('seeds actions taken covering varied statuses, assignees, and follow-ups', async () => {
    const actions = await databaseClient!.query<{ status: string; count: string }>(
      'SELECT "status", COUNT(*)::text AS count FROM "ActionTaken" GROUP BY "status"',
    );
    const statusMap = Object.fromEntries(actions.rows.map(r => [r.status, Number(r.count)]));

    expect(statusMap['PENDING']).toBeGreaterThanOrEqual(1);
    expect(statusMap['IN_PROGRESS']).toBeGreaterThanOrEqual(1);
    expect(statusMap['COMPLETED']).toBeGreaterThanOrEqual(1);
    expect(statusMap['CANCELLED']).toBeGreaterThanOrEqual(1);

    const inactiveAssignee = await databaseClient!.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM "ActionTaken" a JOIN "User" u ON a."assigneeId" = u.id WHERE u."isActive" = false',
    );
    expect(Number(inactiveAssignee.rows[0].count)).toBeGreaterThanOrEqual(1);
  });

  it('keeps seed data repeatable without duplicating rows on rerun (SEED-04)', async () => {
    const countsBefore = await readCounts();

    const secondSeed = await runSeed(initialPassword);
    expect(secondSeed.exitCode, `${secondSeed.stdout}\n${secondSeed.stderr}`).toBe(0);

    const countsAfter = await readCounts();
    expect(countsAfter).toEqual(countsBefore);
  });
});

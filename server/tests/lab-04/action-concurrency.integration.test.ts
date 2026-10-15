import { createHash } from 'node:crypto';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '../../generated/prisma';

const ORIGIN = 'http://localhost:5173';
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const suffix = `${Date.now()}-${process.pid}`;
const passwordHash = 'concurrency-test-password-hash';

let app: Express;
let prisma: PrismaClient;

let adminId: number;
let staffId: number;
let requesterId: number;
let categoryId: number;
let ticketId: number;

let adminToken: string;
let staffToken: string;
let requesterToken: string;

function tokenHash(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

async function createSession(userId: number, label: string): Promise<{ id: number; token: string }> {
  const token = `concurrency-integration-${suffix}-${label}`;
  const session = await prisma.userSession.create({
    data: {
      tokenHash: tokenHash(token),
      userId,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  return { id: session.id, token };
}

function cookie(token: string): string {
  return `tt_session=${encodeURIComponent(token)}`;
}

describe.skipIf(!TEST_DATABASE_URL)('PG-01: Action Concurrency, Idempotency & Eligibility Integration (CONCURRENCY-01, IDEMPOTENCY-01, ELIGIBILITY-04, AC-11)', () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    process.env.PORT = '0';
    ({ default: app } = await import('../../src/index'));
    ({ prisma } = await import('../../src/lib/prisma'));

    const category = await prisma.category.create({
      data: { name: `Concurrency category ${suffix}`, isActive: true },
    });
    categoryId = category.id;

    const admin = await prisma.user.create({
      data: {
        name: `Concurrency Admin ${suffix}`,
        email: `concurrency-admin-${suffix}@example.com`,
        role: 'ADMINISTRATOR',
        isActive: true,
        passwordHash,
        mustChangePassword: false,
      },
    });
    adminId = admin.id;

    const staff = await prisma.user.create({
      data: {
        name: `Concurrency Staff ${suffix}`,
        email: `concurrency-staff-${suffix}@example.com`,
        role: 'IT_STAFF',
        isActive: true,
        passwordHash,
        mustChangePassword: false,
      },
    });
    staffId = staff.id;

    const requester = await prisma.user.create({
      data: {
        name: `Concurrency Requester ${suffix}`,
        email: `concurrency-requester-${suffix}@example.com`,
        role: 'REQUESTER',
        isActive: true,
        passwordHash,
        mustChangePassword: false,
      },
    });
    requesterId = requester.id;

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TK-CC-${suffix}`,
        summary: 'Concurrency test ticket',
        description: 'Testing concurrency, serializable transactions and idempotency',
        requestedPriority: 'MEDIUM',
        itPriority: 'HIGH',
        currentStatus: 'OPEN',
        requesterId,
        ownerId: staffId,
        categoryId,
        version: 1,
      },
    });
    ticketId = ticket.id;

    const adminSession = await createSession(adminId, 'admin');
    adminToken = adminSession.token;

    const staffSession = await createSession(staffId, 'staff');
    staffToken = staffSession.token;

    const reqSession = await createSession(requesterId, 'req');
    requesterToken = reqSession.token;
  });

  afterAll(async () => {
    await prisma.actionTakenEvent.deleteMany({
      where: { action: { ticketId } },
    });
    await prisma.actionTaken.deleteMany({
      where: { ticketId },
    });
    await prisma.ticket.deleteMany({
      where: { id: ticketId },
    });
    await prisma.userSession.deleteMany({
      where: { userId: { in: [adminId, staffId, requesterId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminId, staffId, requesterId] } },
    });
    await prisma.category.deleteMany({
      where: { id: categoryId },
    });
    await prisma.$disconnect();
  });

  it('handles concurrent identical action creations with same Idempotency-Key safely (IDEMPOTENCY-01)', async () => {
    const key = `concurr-idem-key-${suffix}`;
    const payload = {
      description: 'Concurrent creation test with identical payload',
      assigneeId: staffId,
      followUpRequired: false,
      expectedTicketVersion: 1,
    };

    const [res1, res2] = await Promise.all([
      request(app)
        .post(`/api/tickets/${ticketId}/actions-taken`)
        .set('Cookie', cookie(staffToken))
        .set('Origin', ORIGIN)
        .set('Idempotency-Key', key)
        .send(payload),
      request(app)
        .post(`/api/tickets/${ticketId}/actions-taken`)
        .set('Cookie', cookie(staffToken))
        .set('Origin', ORIGIN)
        .set('Idempotency-Key', key)
        .send(payload),
    ]);

    const statuses = [res1.status, res2.status].sort();
    // One creates (201) and one replays (200), or if race conflict, 409
    expect(statuses).toContain(201);

    const createdRows = await prisma.actionTaken.findMany({
      where: { ticketId, creationKey: key },
    });
    expect(createdRows).toHaveLength(1);
  });

  it('rejects stale expectedTicketVersion on subsequent write (CONCURRENCY-01)', async () => {
    const latestTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { version: true },
    });
    expect(latestTicket?.version).toBeGreaterThan(1);

    // Stale write with version 1
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/actions-taken`)
      .set('Cookie', cookie(staffToken))
      .set('Origin', ORIGIN)
      .set('Idempotency-Key', `stale-version-key-${suffix}`)
      .send({
        description: 'This write uses stale ticket version 1',
        assigneeId: staffId,
        followUpRequired: false,
        expectedTicketVersion: 1,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('unassigns active actions and appends UNASSIGNED event when Staff is deactivated (ELIGIBILITY-04)', async () => {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { version: true },
    });

    const createRes = await request(app)
      .post(`/api/tickets/${ticketId}/actions-taken`)
      .set('Cookie', cookie(staffToken))
      .set('Origin', ORIGIN)
      .set('Idempotency-Key', `deactivate-elig-key-${suffix}`)
      .send({
        description: 'Action to be unassigned upon staff deactivation',
        assigneeId: staffId,
        followUpRequired: false,
        expectedTicketVersion: ticket!.version,
      });

    expect(createRes.status).toBe(201);
    const actionId = createRes.body.data.action.id;

    // Admin deactivates the staff user
    const deactRes = await request(app)
      .patch(`/api/admin/users/${staffId}`)
      .set('Cookie', cookie(adminToken))
      .set('Origin', ORIGIN)
      .send({ isActive: false });

    expect(deactRes.status).toBe(200);

    // Verify in database that action was unassigned
    const updatedAction = await prisma.actionTaken.findUnique({
      where: { id: actionId },
    });
    expect(updatedAction?.assigneeId).toBeNull();
    expect(updatedAction?.version).toBeGreaterThan(1);

    // Verify UNASSIGNED event was logged
    const unassignedEvent = await prisma.actionTakenEvent.findFirst({
      where: { actionId, type: 'UNASSIGNED' },
    });
    expect(unassignedEvent).not.toBeNull();
    expect(unassignedEvent?.actorId).toBe(adminId);

    const updatedTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { version: true },
    });
    expect(updatedTicket?.version).toBeGreaterThan(ticket!.version);
  });

  it('handles competing resolve vs concurrent status mutation with rollback/409 (CONCURRENCY-01, BR-14, AC-11)', async () => {
    // Put ticket into IN_PROGRESS
    const currentTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { version: true },
    });

    const statusRes = await request(app)
      .patch(`/api/tickets/${ticketId}/status`)
      .set('Cookie', cookie(staffToken))
      .set('Origin', ORIGIN)
      .send({
        status: 'IN_PROGRESS',
        confirmed: false,
        expectedTicketVersion: currentTicket!.version,
      });
    expect(statusRes.status).toBe(200);

    // Create and complete an action so ticket can be resolved
    const actionRes = await request(app)
      .post(`/api/tickets/${ticketId}/actions-taken`)
      .set('Cookie', cookie(staffToken))
      .set('Origin', ORIGIN)
      .set('Idempotency-Key', `competing-resolve-action-${suffix}`)
      .send({
        description: 'Completed action to satisfy resolution gate',
        result: 'Issue fully resolved',
        assigneeId: staffId,
        followUpRequired: false,
        expectedTicketVersion: statusRes.body.data.version,
      });
    expect(actionRes.status).toBe(201);
    const actionId = actionRes.body.data.action.id;

    // Complete the action
    const completeRes = await request(app)
      .patch(`/api/tickets/${ticketId}/actions-taken/${actionId}/status`)
      .set('Cookie', cookie(staffToken))
      .set('Origin', ORIGIN)
      .send({
        status: 'COMPLETED',
        result: 'Issue fully resolved',
        expectedActionVersion: 1,
        expectedTicketVersion: actionRes.body.data.ticketVersion,
      });
    expect(completeRes.status).toBe(200);

    const ticketBeforeRace = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { version: true },
    });
    const staleVersion = ticketBeforeRace!.version;

    // Two competing operations with the same stale version:
    // One tries to resolve, one tries to transition to WAITING_FOR_REQUESTER
    const [resA, resB] = await Promise.all([
      request(app)
        .patch(`/api/tickets/${ticketId}/status`)
        .set('Cookie', cookie(staffToken))
        .set('Origin', ORIGIN)
        .send({
          status: 'RESOLVED',
          confirmed: true,
          expectedTicketVersion: staleVersion,
        }),
      request(app)
        .patch(`/api/tickets/${ticketId}/status`)
        .set('Cookie', cookie(staffToken))
        .set('Origin', ORIGIN)
        .send({
          status: 'WAITING_FOR_REQUESTER',
          confirmed: false,
          expectedTicketVersion: staleVersion,
        }),
    ]);

    const results = [resA.status, resB.status].sort();
    // Exactly one succeeds (200), and the other fails with 409 CONFLICT
    expect(results).toEqual([200, 409]);
  });
});


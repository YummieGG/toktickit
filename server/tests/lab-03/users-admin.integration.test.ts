import { createHash } from 'node:crypto';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '../../generated/prisma';

const ORIGIN = 'http://localhost:5173';
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const suffix = `${Date.now()}-${process.pid}`;
const passwordHash = 'integration-test-password-hash';

let app: Express;
let prisma: PrismaClient;
let adminId: number;
let secondaryAdminId: number;
let requesterId: number;
let ownerId: number;
let conflictUserId: number;
let categoryId: number;
let ticketId: number;
let ownerSessionId: number;
let adminToken: string;
let secondaryAdminToken: string;
let requesterToken: string;

function tokenHash(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

async function createSession(userId: number, label: string): Promise<{ id: number; token: string }> {
  const token = `admin-user-integration-${suffix}-${label}`;
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

describe('Issue #42 Administrator user-management PostgreSQL integration', () => {
  beforeAll(async () => {
    if (!TEST_DATABASE_URL) {
      throw new Error('TEST_DATABASE_URL is required for the PostgreSQL integration suite');
    }

    process.env.DATABASE_URL = TEST_DATABASE_URL;
    process.env.PORT = '0';
    ({ default: app } = await import('../../src/index'));
    ({ prisma } = await import('../../src/lib/prisma'));

    const category = await prisma.category.create({
      data: { name: `Admin integration category ${suffix}`, isActive: true },
    });
    categoryId = category.id;

    const requester = await prisma.user.create({
      data: {
        name: `Admin integration requester ${suffix}`,
        email: `admin-integration-requester-${suffix}@example.com`,
        role: 'REQUESTER',
        isActive: true,
        passwordHash,
        mustChangePassword: false,
      },
    });
    requesterId = requester.id;

    const owner = await prisma.user.create({
      data: {
        name: `Admin integration owner ${suffix}`,
        email: `admin-integration-owner-${suffix}@example.com`,
        role: 'IT_STAFF',
        isActive: true,
        passwordHash,
        mustChangePassword: false,
      },
    });
    ownerId = owner.id;

    const admin = await prisma.user.create({
      data: {
        name: `Admin integration primary ${suffix}`,
        email: `admin-integration-primary-${suffix}@example.com`,
        role: 'ADMINISTRATOR',
        isActive: true,
        passwordHash,
        mustChangePassword: false,
      },
    });
    adminId = admin.id;

    const secondaryAdmin = await prisma.user.create({
      data: {
        name: `Admin integration secondary ${suffix}`,
        email: `admin-integration-secondary-${suffix}@example.com`,
        role: 'ADMINISTRATOR',
        isActive: true,
        passwordHash,
        mustChangePassword: false,
      },
    });
    secondaryAdminId = secondaryAdmin.id;

    const conflictUser = await prisma.user.create({
      data: {
        name: `Admin integration conflict ${suffix}`,
        email: `admin-integration-conflict-${suffix}@example.com`,
        role: 'REQUESTER',
        isActive: true,
        passwordHash,
        mustChangePassword: false,
      },
    });
    conflictUserId = conflictUser.id;

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `ADMIN-INTEGRATION-${suffix}`,
        summary: 'Administrator transaction verification',
        description: 'Created only for the Issue #42 integration suite.',
        requestedPriority: 'LOW',
        itPriority: 'LOW',
        currentStatus: 'NEW',
        requesterId,
        ownerId,
        categoryId,
      },
    });
    ticketId = ticket.id;

    const adminSession = await createSession(adminId, 'primary');
    adminToken = adminSession.token;
    const secondarySession = await createSession(secondaryAdminId, 'secondary');
    secondaryAdminToken = secondarySession.token;
    const requesterSession = await createSession(requesterId, 'requester');
    requesterToken = requesterSession.token;
    const ownerSession = await createSession(ownerId, 'owner');
    ownerSessionId = ownerSession.id;
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.ticket.deleteMany({ where: { id: ticketId } });
    await prisma.userSession.deleteMany({
      where: { userId: { in: [adminId, secondaryAdminId, requesterId, ownerId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminId, secondaryAdminId, requesterId, ownerId, conflictUserId] } },
    });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  it('enforces real session, role, and trusted-origin guards', async () => {
    const unauthenticated = await request(app).get('/api/admin/users');
    expect(unauthenticated.status).toBe(401);

    const wrongRole = await request(app)
      .get('/api/admin/users')
      .set('Cookie', cookie(requesterToken));
    expect(wrongRole.status).toBe(403);

    const missingOrigin = await request(app)
      .patch(`/api/admin/users/${ownerId}`)
      .set('Cookie', cookie(adminToken))
      .send({ isActive: false });
    expect(missingOrigin.status).toBe(403);
    expect(missingOrigin.body.error.code).toBe('CSRF_ORIGIN_INVALID');

    const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { isActive: true } });
    expect(owner?.isActive).toBe(true);
  });

  it('rolls back owner and session changes when the unique email constraint fails', async () => {
    const response = await request(app)
      .patch(`/api/admin/users/${ownerId}`)
      .set('Cookie', cookie(adminToken))
      .set('Origin', ORIGIN)
      .send({ email: `admin-integration-conflict-${suffix}@example.com`, isActive: false });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('DUPLICATE_EMAIL');

    const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { isActive: true } });
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { ownerId: true } });
    const session = await prisma.userSession.findUnique({ where: { id: ownerSessionId }, select: { revokedAt: true } });
    expect(owner?.isActive).toBe(true);
    expect(ticket?.ownerId).toBe(ownerId);
    expect(session?.revokedAt).toBeNull();
  });

  it('persists owner unassignment and session revocation in one real transaction', async () => {
    const response = await request(app)
      .patch(`/api/admin/users/${ownerId}`)
      .set('Cookie', cookie(adminToken))
      .set('Origin', ORIGIN)
      .send({ isActive: false });

    expect(response.status).toBe(200);

    const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { isActive: true } });
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { ownerId: true } });
    const session = await prisma.userSession.findUnique({ where: { id: ownerSessionId }, select: { revokedAt: true } });
    expect(owner?.isActive).toBe(false);
    expect(ticket?.ownerId).toBeNull();
    expect(session?.revokedAt).not.toBeNull();
  });

  it('protects the last active Administrator using persisted state', async () => {
    const demoteSecondary = await request(app)
      .patch(`/api/admin/users/${secondaryAdminId}`)
      .set('Cookie', cookie(adminToken))
      .set('Origin', ORIGIN)
      .send({ role: 'REQUESTER' });
    expect(demoteSecondary.status).toBe(200);

    const demoteLast = await request(app)
      .patch(`/api/admin/users/${adminId}`)
      .set('Cookie', cookie(adminToken))
      .set('Origin', ORIGIN)
      .send({ role: 'REQUESTER' });
    expect(demoteLast.status).toBe(409);
    expect(demoteLast.body.error.code).toBe('LAST_ADMIN_PROTECTION');

    const activeAdministrators = await prisma.user.count({ where: { role: 'ADMINISTRATOR', isActive: true } });
    expect(activeAdministrators).toBeGreaterThanOrEqual(1);
  });

  it('serializes concurrent demotions so one Administrator remains active', async () => {
    await prisma.user.update({ where: { id: adminId }, data: { role: 'ADMINISTRATOR', isActive: true } });
    await prisma.user.update({ where: { id: secondaryAdminId }, data: { role: 'ADMINISTRATOR', isActive: true } });

    const [primaryResponse, secondaryResponse] = await Promise.all([
      request(app)
        .patch(`/api/admin/users/${adminId}`)
        .set('Cookie', cookie(adminToken))
        .set('Origin', ORIGIN)
        .send({ role: 'IT_STAFF' }),
      request(app)
        .patch(`/api/admin/users/${secondaryAdminId}`)
        .set('Cookie', cookie(secondaryAdminToken))
        .set('Origin', ORIGIN)
        .send({ role: 'IT_STAFF' }),
    ]);

    const statuses = [primaryResponse.status, secondaryResponse.status].sort();
    expect(statuses).toEqual([200, 409]);
    const rejectedCode = primaryResponse.status === 409
      ? primaryResponse.body.error?.code
      : secondaryResponse.body.error?.code;
    expect(['CONFLICT', 'LAST_ADMIN_PROTECTION']).toContain(rejectedCode);

    const activeAdministrators = await prisma.user.count({ where: { role: 'ADMINISTRATOR', isActive: true } });
    expect(activeAdministrators).toBeGreaterThanOrEqual(1);
  });
});

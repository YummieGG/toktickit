import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    userSession: { findUnique: vi.fn() },
    ticket: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

const cookie = 'tt_session=test-session-token';
const origin = 'http://localhost:5173';

function session(
  role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR' = 'IT_STAFF',
  id = role === 'IT_STAFF' ? 20 : 30,
) {
  return {
    id: 10,
    tokenHash: 'hash',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: { id, name: `${role}_User`, email: `${role.toLowerCase()}@example.com`, role, isActive: true, mustChangePassword: false },
  };
}

function staffDetail(status = 'OPEN', problemAppearsResolvedAt: string | null = null) {
  return {
    id: 8,
    ticketNumber: 'TK-0008',
    summary: 'Email server unreachable',
    description: 'Cannot connect to IMAP server',
    currentStatus: status,
    requestedPriority: 'HIGH',
    itPriority: 'HIGH',
    ticketDate: '2026-09-05T08:30:00.000Z',
    category: { id: 1, name: 'Email' },
    relatedSystem: null,
    requester: { id: 7, name: 'Alice Requester', email: 'alice@example.com' },
    owner: null,
    attachments: [],
    comments: [],
    internalNotes: [],
    problemAppearsResolvedAt,
    createdAt: '2026-09-05T08:30:00.000Z',
    updatedAt: '2026-09-05T09:00:00.000Z',
  };
}

describe('API-08 & API-10: Staff Ticket Detail Workflow (FR-08, FR-10, BR-13, BR-14, BR-16, BR-19, BR-20, AC-07, AC-09)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('IT_STAFF') as never);
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 8, currentStatus: 'OPEN' } as never);
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue(staffDetail('OPEN') as never);
    vi.mocked(prisma.ticket.update).mockResolvedValue(staffDetail('OPEN') as never);
    vi.mocked(prisma.ticket.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 21, isActive: true, role: 'IT_STAFF' } as never);
  });

  describe('Detail Projection & Visibility', () => {
    it('returns full staff projection to IT Staff and Administrator', async () => {
      vi.mocked(prisma.ticket.findFirst).mockResolvedValue(staffDetail('OPEN', '2026-09-13T10:00:00Z') as never);

      const staffRes = await request(app).get('/api/tickets/8').set('Cookie', cookie);
      expect(staffRes.status).toBe(200);
      expect(staffRes.body.data.currentStatus).toBe('OPEN');
      expect(staffRes.body.data.problemAppearsResolvedAt).toBe('2026-09-13T10:00:00Z');
      expect(staffRes.body.data).toHaveProperty('internalNotes');

      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('ADMINISTRATOR', 30) as never);
      const adminRes = await request(app).get('/api/tickets/8').set('Cookie', cookie);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data).toHaveProperty('internalNotes');
    });
  });

  describe('Owner Assignment (BR-10, BR-19)', () => {
    it('allows Staff to assign/claim to active IT Staff or Administrator, and unassign', async () => {
      const assignStaff = await request(app)
        .patch('/api/tickets/8/owner')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ ownerId: 21 });
      expect(assignStaff.status).toBe(200);
      expect(prisma.ticket.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 8 },
        data: { ownerId: 21 },
      }));

      // Unassign
      const unassign = await request(app)
        .patch('/api/tickets/8/owner')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ ownerId: null });
      expect(unassign.status).toBe(200);
      expect(prisma.ticket.update).toHaveBeenLastCalledWith(expect.objectContaining({
        data: { ownerId: null },
      }));
    });

    it('rejects assignment to inactive user or Requester', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 21, isActive: false, role: 'IT_STAFF' } as never);
      const inactive = await request(app)
        .patch('/api/tickets/8/owner')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ ownerId: 21 });
      expect(inactive.status).toBe(400);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 7, isActive: true, role: 'REQUESTER' } as never);
      const requester = await request(app)
        .patch('/api/tickets/8/owner')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ ownerId: 7 });
      expect(requester.status).toBe(400);
    });

    it('forbids Administrator and Requester from updating owner with 403', async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('ADMINISTRATOR') as never);
      const adminRes = await request(app)
        .patch('/api/tickets/8/owner')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ ownerId: null });
      expect(adminRes.status).toBe(403);

      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('REQUESTER') as never);
      const reqRes = await request(app)
        .patch('/api/tickets/8/owner')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ ownerId: null });
      expect(reqRes.status).toBe(403);
    });
  });

  describe('IT Priority Mutation (BR-14, BR-20)', () => {
    it('allows Staff to update IT Priority without modifying Requested Priority', async () => {
      const response = await request(app)
        .patch('/api/tickets/8/it-priority')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ itPriority: 'CRITICAL', requestedPriority: 'LOW' });
      expect(response.status).toBe(200);
      expect(prisma.ticket.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { itPriority: 'CRITICAL' },
      }));
    });

    it('rejects invalid IT priority and requires trusted origin', async () => {
      const invalid = await request(app)
        .patch('/api/tickets/8/it-priority')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ itPriority: 'SUPER_URGENT' });
      expect(invalid.status).toBe(400);

      const csrf = await request(app)
        .patch('/api/tickets/8/it-priority')
        .set('Cookie', cookie)
        .send({ itPriority: 'LOW' });
      expect(csrf.status).toBe(403);
    });

    it('forbids Administrator and Requester from updating IT priority with 403', async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('ADMINISTRATOR') as never);
      const adminRes = await request(app)
        .patch('/api/tickets/8/it-priority')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ itPriority: 'LOW' });
      expect(adminRes.status).toBe(403);

      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('REQUESTER') as never);
      const reqRes = await request(app)
        .patch('/api/tickets/8/it-priority')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ itPriority: 'LOW' });
      expect(reqRes.status).toBe(403);
    });
  });

  describe('Status Workflow & Resolution Reset (BR-13, BR-16, AC-07)', () => {
    const allowedTransitions = [
      ['NEW', 'OPEN'],
      ['NEW', 'CANCELLED'],
      ['OPEN', 'IN_PROGRESS'],
      ['OPEN', 'WAITING_FOR_REQUESTER'],
      ['OPEN', 'CANCELLED'],
      ['IN_PROGRESS', 'WAITING_FOR_REQUESTER'],
      ['IN_PROGRESS', 'RESOLVED'],
      ['IN_PROGRESS', 'CANCELLED'],
      ['WAITING_FOR_REQUESTER', 'IN_PROGRESS'],
      ['WAITING_FOR_REQUESTER', 'CANCELLED'],
      ['RESOLVED', 'CLOSED'],
      ['RESOLVED', 'REOPENED'],
      ['CLOSED', 'REOPENED'],
      ['REOPENED', 'IN_PROGRESS'],
      ['REOPENED', 'CANCELLED'],
      ['CANCELLED', 'REOPENED'],
    ] as const;

    it.each(allowedTransitions)('accepts every allowed API transition %s -> %s', async (from, to) => {
      vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 8, currentStatus: from } as never);
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue(staffDetail(to) as never);

      const response = await request(app)
        .patch('/api/tickets/8/status')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ status: to, confirmed: ['CANCELLED', 'RESOLVED', 'CLOSED', 'REOPENED'].includes(to) });

      expect(response.status).toBe(200);
      expect(prisma.ticket.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 8, currentStatus: from },
        data: expect.objectContaining({ currentStatus: to }),
      }));
    });

    it('enforces allowed status transitions and confirmation on designated states', async () => {
      vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 8, currentStatus: 'NEW' } as never);
      const res = await request(app)
        .patch('/api/tickets/8/status')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ status: 'OPEN', confirmed: false });
      expect(res.status).toBe(200);

      // Unconfirmed transition requiring confirmation
      vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 8, currentStatus: 'OPEN' } as never);
      const unconfirmed = await request(app)
        .patch('/api/tickets/8/status')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ status: 'CANCELLED', confirmed: false });
      expect(unconfirmed.status).toBe(400);
      expect(unconfirmed.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('clears problemAppearsResolvedAt when status transitions to REOPENED', async () => {
      vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 8, currentStatus: 'RESOLVED' } as never);
      const response = await request(app)
        .patch('/api/tickets/8/status')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ status: 'REOPENED', confirmed: true });

      expect(response.status).toBe(200);
      expect(prisma.ticket.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ currentStatus: 'REOPENED', problemAppearsResolvedAt: null }),
      }));
    });

    it('rejects invalid status transitions with 400 INVALID_STATUS_TRANSITION', async () => {
      vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 8, currentStatus: 'NEW' } as never);
      const response = await request(app)
        .patch('/api/tickets/8/status')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ status: 'CLOSED', confirmed: true });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(prisma.ticket.updateMany).not.toHaveBeenCalled();
    });

    it('returns 409 CONFLICT when the status changes after the read', async () => {
      vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 8, currentStatus: 'OPEN' } as never);
      vi.mocked(prisma.ticket.updateMany).mockResolvedValueOnce({ count: 0 } as never);

      const response = await request(app)
        .patch('/api/tickets/8/status')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ status: 'IN_PROGRESS', confirmed: false });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        error: {
          code: 'CONFLICT',
          message: 'The resource was modified by another user. Reload and try again.',
        },
      });
      expect(prisma.ticket.findUnique).not.toHaveBeenCalled();
    });

    it('forbids Administrator and Requester from mutating status with 403', async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('ADMINISTRATOR') as never);
      const adminRes = await request(app)
        .patch('/api/tickets/8/status')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ status: 'OPEN', confirmed: false });
      expect(adminRes.status).toBe(403);

      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('REQUESTER') as never);
      const reqRes = await request(app)
        .patch('/api/tickets/8/status')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ status: 'OPEN', confirmed: false });
      expect(reqRes.status).toBe(403);
    });
  });
});

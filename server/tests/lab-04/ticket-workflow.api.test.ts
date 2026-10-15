import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { Prisma } from '../../generated/prisma';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    userSession: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    ticket: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    actionTaken: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    actionTakenEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

const COOKIE = 'tt_session=test-token';
const ORIGIN = 'http://localhost:5173';

function session(
  role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR' = 'IT_STAFF',
  id = role === 'REQUESTER' ? 7 : role === 'IT_STAFF' ? 20 : 30,
) {
  return {
    id: 10,
    tokenHash: 'hash',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: {
      id,
      name: `${role}_User`,
      email: `${role.toLowerCase()}@example.com`,
      role,
      isActive: true,
      mustChangePassword: false,
    },
  };
}

function ticketDetail(
  status = 'OPEN',
  version = 1,
  resolvedAt: Date | string | null = null,
  problemAppearsResolvedAt: Date | string | null = null,
) {
  return {
    id: 5,
    ticketNumber: 'TK-0005',
    summary: 'Workflow test ticket',
    description: 'Testing 8-state transition matrix and resolution gate',
    currentStatus: status,
    requestedPriority: 'MEDIUM',
    itPriority: 'HIGH',
    ticketDate: new Date('2026-10-14T08:00:00.000Z'),
    category: { id: 1, name: 'Hardware' },
    relatedSystem: null,
    requester: { id: 7, name: 'Requester_User', email: 'requester@example.com', role: 'REQUESTER' },
    owner: { id: 20, name: 'IT_STAFF_User', email: 'it_staff@example.com', role: 'IT_STAFF' },
    attachments: [],
    comments: [],
    internalNotes: [],
    problemAppearsResolvedAt,
    resolvedAt,
    version,
    createdAt: new Date('2026-10-14T08:00:00.000Z'),
    updatedAt: new Date('2026-10-14T08:30:00.000Z'),
  };
}

describe('API-04: Ticket Workflow, 8-State Transitions, Resolution Gate & Child Action Cancellation (FR-04-08, FR-04-09, BR-13, BR-14, BR-16, AC-06)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('IT_STAFF') as never);
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 5, currentStatus: 'IN_PROGRESS' } as never);
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
      id: 5,
      currentStatus: 'IN_PROGRESS',
      version: 1,
      resolvedAt: null,
    } as never);
    vi.mocked(prisma.actionTaken.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.ticket.update).mockImplementation(({ data }: { data: Record<string, unknown> }) => {
      return Promise.resolve(
        ticketDetail(
          (data.currentStatus as string) ?? 'IN_PROGRESS',
          2,
          (data.resolvedAt as Date | string | null) ?? null,
          (data.problemAppearsResolvedAt as Date | string | null) ?? null,
        ),
      ) as never;
    });
  });

  describe('Authorization and Role Checks (BR-13, AUTHZ-04)', () => {
    it('returns 401 when request is unauthenticated', async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/tickets/5/status')
        .set('Origin', ORIGIN)
        .send({ status: 'WAITING_FOR_REQUESTER', confirmed: false, expectedTicketVersion: 1 });

      expect(res.status).toBe(401);
    });

    it('returns 403 when authenticated user is REQUESTER', async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('REQUESTER') as never);

      const res = await request(app)
        .patch('/api/tickets/5/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ status: 'WAITING_FOR_REQUESTER', confirmed: false, expectedTicketVersion: 1 });

      expect(res.status).toBe(403);
    });

    it('returns 403 when authenticated user is ADMINISTRATOR (Admin formal writes prohibited)', async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('ADMINISTRATOR') as never);

      const res = await request(app)
        .patch('/api/tickets/5/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ status: 'WAITING_FOR_REQUESTER', confirmed: false, expectedTicketVersion: 1 });

      expect(res.status).toBe(403);
    });

    it('returns 404 when ticket does not exist or is not accessible', async () => {
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/tickets/999/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ status: 'WAITING_FOR_REQUESTER', confirmed: false, expectedTicketVersion: 1 });

      expect(res.status).toBe(404);
    });
  });

  describe('Payload and Concurrency Validation (BR-17)', () => {
    it('rejects unknown fields with 400 INVALID_STATUS_TRANSITION', async () => {
      const res = await request(app)
        .patch('/api/tickets/5/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({
          status: 'WAITING_FOR_REQUESTER',
          confirmed: false,
          expectedTicketVersion: 1,
          unexpectedField: 'malicious',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('validates status, confirmed, and expectedTicketVersion types', async () => {
      const res = await request(app)
        .patch('/api/tickets/5/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({
          status: 'INVALID_STATUS',
          confirmed: 'not_a_boolean',
          expectedTicketVersion: -5,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('returns 409 CONFLICT on stale expectedTicketVersion', async () => {
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
        id: 5,
        currentStatus: 'IN_PROGRESS',
        version: 3,
        resolvedAt: null,
      } as never);

      const res = await request(app)
        .patch('/api/tickets/5/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ status: 'WAITING_FOR_REQUESTER', confirmed: false, expectedTicketVersion: 1 });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('returns 409 CONFLICT on Prisma P2034 serializable transaction conflict', async () => {
      vi.mocked(prisma.ticket.update).mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Transaction conflict', {
          code: 'P2034',
          clientVersion: '5.0.0',
        }),
      );

      const res = await request(app)
        .patch('/api/tickets/5/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ status: 'WAITING_FOR_REQUESTER', confirmed: false, expectedTicketVersion: 1 });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('8-State Transition Matrix (BR-13)', () => {
    it.each([
      ['NEW', 'OPEN', false],
      ['NEW', 'CANCELLED', true],
      ['OPEN', 'IN_PROGRESS', false],
      ['OPEN', 'WAITING_FOR_REQUESTER', false],
      ['OPEN', 'CANCELLED', true],
      ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', false],
      ['IN_PROGRESS', 'CANCELLED', true],
      ['WAITING_FOR_REQUESTER', 'IN_PROGRESS', false],
      ['WAITING_FOR_REQUESTER', 'CANCELLED', true],
      ['RESOLVED', 'CLOSED', true],
      ['RESOLVED', 'REOPENED', true],
      ['CLOSED', 'REOPENED', true],
      ['REOPENED', 'IN_PROGRESS', false],
      ['REOPENED', 'CANCELLED', true],
      ['CANCELLED', 'REOPENED', true],
    ])('allows valid transition from %s to %s', async (from, to, confirmed) => {
      vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 5, currentStatus: from } as never);
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
        id: 5,
        currentStatus: from,
        version: 1,
        resolvedAt: from === 'RESOLVED' || from === 'CLOSED' ? new Date() : null,
      } as never);

      const res = await request(app)
        .patch('/api/tickets/5/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ status: to, confirmed, expectedTicketVersion: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.currentStatus).toBe(to);
    });

    it.each([
      ['NEW', 'RESOLVED'],
      ['NEW', 'CLOSED'],
      ['NEW', 'IN_PROGRESS'],
      ['OPEN', 'RESOLVED'],
      ['OPEN', 'CLOSED'],
      ['IN_PROGRESS', 'OPEN'],
      ['WAITING_FOR_REQUESTER', 'RESOLVED'],
      ['RESOLVED', 'CANCELLED'],
      ['RESOLVED', 'IN_PROGRESS'],
      ['CLOSED', 'IN_PROGRESS'],
      ['CLOSED', 'CANCELLED'],
      ['REOPENED', 'RESOLVED'],
      ['CANCELLED', 'IN_PROGRESS'],
    ])('rejects invalid transition from %s to %s with 400 INVALID_STATUS_TRANSITION', async (from, to) => {
      vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 5, currentStatus: from } as never);
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
        id: 5,
        currentStatus: from,
        version: 1,
        resolvedAt: null,
      } as never);

      const res = await request(app)
        .patch('/api/tickets/5/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ status: to, confirmed: true, expectedTicketVersion: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it.each(['CANCELLED', 'RESOLVED', 'CLOSED', 'REOPENED'])(
      'rejects transition to %s when confirmed is false',
      async (targetStatus) => {
        const fromStatus = targetStatus === 'RESOLVED' ? 'IN_PROGRESS' : targetStatus === 'CLOSED' ? 'RESOLVED' : 'NEW';
        vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 5, currentStatus: fromStatus } as never);
        vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
          id: 5,
          currentStatus: fromStatus,
          version: 1,
          resolvedAt: fromStatus === 'RESOLVED' ? new Date() : null,
        } as never);

        if (targetStatus === 'RESOLVED') {
          vi.mocked(prisma.actionTaken.findMany).mockResolvedValue([
            { id: 1, status: 'COMPLETED', result: 'Completed task', followUpRequired: false },
          ] as never);
        }

        const res = await request(app)
          .patch('/api/tickets/5/status')
          .set('Cookie', COOKIE)
          .set('Origin', ORIGIN)
          .send({ status: targetStatus, confirmed: false, expectedTicketVersion: 1 });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
      },
    );
  });

  describe('Resolution Gate Evaluation (BR-14)', () => {
    it('blocks transition to RESOLVED when ticket has 0 actions', async () => {
      vi.mocked(prisma.actionTaken.findMany).mockResolvedValue([] as never);

      const res = await request(app)
        .patch('/api/tickets/5/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ status: 'RESOLVED', confirmed: true, expectedTicketVersion: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TICKET_RESOLUTION_BLOCKED');
      expect(res.body.error.message).toContain('At least one completed action');
      expect(prisma.ticket.update).not.toHaveBeenCalled();
    });

    it('blocks transition to RESOLVED when ticket only has CANCELLED actions', async () => {
      vi.mocked(prisma.actionTaken.findMany).mockResolvedValue([
        { id: 1, status: 'CANCELLED', result: null, followUpRequired: false },
      ] as never);

      const res = await request(app)
        .patch('/api/tickets/5/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ status: 'RESOLVED', confirmed: true, expectedTicketVersion: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TICKET_RESOLUTION_BLOCKED');
      expect(res.body.error.message).toContain('At least one completed action');
    });

    it('blocks transition to RESOLVED when completed action has empty/whitespace result', async () => {
      vi.mocked(prisma.actionTaken.findMany).mockResolvedValue([
        { id: 1, status: 'COMPLETED', result: '   ', followUpRequired: false },
      ] as never);

      const res = await request(app)
        .patch('/api/tickets/5/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ status: 'RESOLVED', confirmed: true, expectedTicketVersion: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TICKET_RESOLUTION_BLOCKED');
    });

    it('blocks transition to RESOLVED when active actions (PENDING / IN_PROGRESS) exist', async () => {
      vi.mocked(prisma.actionTaken.findMany).mockResolvedValue([
        { id: 1, status: 'COMPLETED', result: 'Fixed router switch', followUpRequired: false },
        { id: 2, status: 'IN_PROGRESS', result: null, followUpRequired: false },
      ] as never);

      const res = await request(app)
        .patch('/api/tickets/5/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ status: 'RESOLVED', confirmed: true, expectedTicketVersion: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TICKET_RESOLUTION_BLOCKED');
      expect(res.body.error.message).toContain('All actions must be completed or cancelled');
    });

    it('blocks transition to RESOLVED when non-cancelled action has followUpRequired=true', async () => {
      vi.mocked(prisma.actionTaken.findMany).mockResolvedValue([
        { id: 1, status: 'COMPLETED', result: 'Replaced router cable', followUpRequired: true },
      ] as never);

      const res = await request(app)
        .patch('/api/tickets/5/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ status: 'RESOLVED', confirmed: true, expectedTicketVersion: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TICKET_RESOLUTION_BLOCKED');
      expect(res.body.error.message).toContain('follow-up');
    });

    it('allows transition to RESOLVED when followUpRequired=true is on a CANCELLED action', async () => {
      vi.mocked(prisma.actionTaken.findMany).mockResolvedValue([
        { id: 1, status: 'COMPLETED', result: 'Configured VLAN properly', followUpRequired: false },
        { id: 2, status: 'CANCELLED', result: null, followUpRequired: true },
      ] as never);

      const res = await request(app)
        .patch('/api/tickets/5/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ status: 'RESOLVED', confirmed: true, expectedTicketVersion: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.currentStatus).toBe('RESOLVED');
    });

    it('succeeds with 200 and sets resolvedAt when all resolution gate rules pass', async () => {
      vi.mocked(prisma.actionTaken.findMany).mockResolvedValue([
        { id: 1, status: 'COMPLETED', result: 'Fixed power supply', followUpRequired: false },
      ] as never);

      const res = await request(app)
        .patch('/api/tickets/5/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ status: 'RESOLVED', confirmed: true, expectedTicketVersion: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.currentStatus).toBe('RESOLVED');
      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentStatus: 'RESOLVED',
            resolvedAt: expect.any(Date),
            version: { increment: 1 },
          }),
        }),
      );
    });
  });

  describe('Timestamp Management on Closed and Reopened (BR-15)', () => {
    it('preserves resolvedAt on transition from RESOLVED to CLOSED', async () => {
      const pastResolvedDate = new Date('2026-10-14T09:00:00.000Z');
      vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 5, currentStatus: 'RESOLVED' } as never);
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
        id: 5,
        currentStatus: 'RESOLVED',
        version: 2,
        resolvedAt: pastResolvedDate,
      } as never);

      const res = await request(app)
        .patch('/api/tickets/5/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ status: 'CLOSED', confirmed: true, expectedTicketVersion: 2 });

      expect(res.status).toBe(200);
      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentStatus: 'CLOSED',
            version: { increment: 1 },
          }),
        }),
      );
      // Ensure resolvedAt is not overwritten with null or a new Date
      const updateData = vi.mocked(prisma.ticket.update).mock.calls[0][0].data;
      expect(updateData).not.toHaveProperty('resolvedAt');
    });

    it('clears resolvedAt and problemAppearsResolvedAt on transition to REOPENED', async () => {
      vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 5, currentStatus: 'RESOLVED' } as never);
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
        id: 5,
        currentStatus: 'RESOLVED',
        version: 2,
        resolvedAt: new Date(),
        problemAppearsResolvedAt: new Date(),
      } as never);

      const res = await request(app)
        .patch('/api/tickets/5/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ status: 'REOPENED', confirmed: true, expectedTicketVersion: 2 });

      expect(res.status).toBe(200);
      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentStatus: 'REOPENED',
            resolvedAt: null,
            problemAppearsResolvedAt: null,
            version: { increment: 1 },
          }),
        }),
      );
    });
  });

  describe('Child Action Cancellation on Ticket CANCELLED (BR-16)', () => {
    it('atomically cancels active child actions (PENDING and IN_PROGRESS) and logs CANCELLED event', async () => {
      vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 5, currentStatus: 'OPEN' } as never);
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
        id: 5,
        currentStatus: 'OPEN',
        version: 1,
        resolvedAt: null,
      } as never);

      vi.mocked(prisma.actionTaken.findMany).mockResolvedValue([
        { id: 101, status: 'PENDING', cancelReason: null, version: 1 },
        { id: 102, status: 'IN_PROGRESS', cancelReason: null, version: 2 },
      ] as never);

      const res = await request(app)
        .patch('/api/tickets/5/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ status: 'CANCELLED', confirmed: true, expectedTicketVersion: 1 });

      expect(res.status).toBe(200);

      // Verify each active action was updated to CANCELLED with the exact cancelReason
      expect(prisma.actionTaken.update).toHaveBeenCalledTimes(2);
      expect(prisma.actionTaken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 101 },
          data: expect.objectContaining({
            status: 'CANCELLED',
            cancelReason: 'Ticket cancelled by IT Staff',
            version: { increment: 1 },
          }),
        }),
      );
      expect(prisma.actionTaken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 102 },
          data: expect.objectContaining({
            status: 'CANCELLED',
            cancelReason: 'Ticket cancelled by IT Staff',
            version: { increment: 1 },
          }),
        }),
      );

      // Verify ActionTakenEvents created for both
      expect(prisma.actionTakenEvent.create).toHaveBeenCalledTimes(2);
      expect(prisma.actionTakenEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actionId: 101,
            type: 'CANCELLED',
            actorId: 20,
            after: expect.objectContaining({
              status: 'CANCELLED',
              cancelReason: 'Ticket cancelled by IT Staff',
            }),
          }),
        }),
      );
      expect(prisma.actionTakenEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actionId: 102,
            type: 'CANCELLED',
            actorId: 20,
            after: expect.objectContaining({
              status: 'CANCELLED',
              cancelReason: 'Ticket cancelled by IT Staff',
            }),
          }),
        }),
      );
    });

    it('does not touch already COMPLETED or CANCELLED child actions when cancelling ticket', async () => {
      vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 5, currentStatus: 'IN_PROGRESS' } as never);
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
        id: 5,
        currentStatus: 'IN_PROGRESS',
        version: 1,
        resolvedAt: null,
      } as never);

      // prisma.actionTaken.findMany with status: { in: ['PENDING', 'IN_PROGRESS'] } returns empty because all children are COMPLETED or CANCELLED
      vi.mocked(prisma.actionTaken.findMany).mockResolvedValue([] as never);

      const res = await request(app)
        .patch('/api/tickets/5/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ status: 'CANCELLED', confirmed: true, expectedTicketVersion: 1 });

      expect(res.status).toBe(200);
      expect(prisma.actionTaken.update).not.toHaveBeenCalled();
      expect(prisma.actionTakenEvent.create).not.toHaveBeenCalled();
    });
  });
});

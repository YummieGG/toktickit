import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    userSession: { findUnique: vi.fn() },
    ticket: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    actionTaken: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

const COOKIE = 'tt_session=test-staff-token';

function session(role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR' = 'IT_STAFF', id = 20) {
  return {
    id: 10,
    tokenHash: 'hash',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: {
      id,
      name: role === 'ADMINISTRATOR' ? 'Admin_User' : 'Staff_User',
      email: `${role.toLowerCase()}@example.com`,
      role,
      isActive: true,
      mustChangePassword: false,
    },
  };
}

describe('API-06: Staff and Administrator Dashboard API & Drill-down (FR-04-13, FR-04-14, AC-08)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation((callback) => (callback as (tx: unknown) => unknown)(prisma) as never);
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('IT_STAFF', 20) as never);
    vi.mocked(prisma.ticket.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.ticket.groupBy).mockResolvedValue([] as never);
    vi.mocked(prisma.ticket.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.actionTaken.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.actionTaken.findMany).mockResolvedValue([] as never);
  });

  describe('Authentication & Role Authorization', () => {
    it('returns 401 when request is unauthenticated', async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(null as never);
      const res = await request(app).get('/api/dashboards/staff');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns 403 when authenticated as REQUESTER', async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('REQUESTER', 7) as never);
      const res = await request(app).get('/api/dashboards/staff').set('Cookie', COOKIE);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 200 when authenticated as IT_STAFF', async () => {
      const res = await request(app).get('/api/dashboards/staff').set('Cookie', COOKIE);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('metrics');
      expect(res.body.timezone).toBe('Asia/Bangkok');
      expect(res.body.listLimit).toBe(5);
    });

    it('returns 200 when authenticated as ADMINISTRATOR and scopes "My" to Admin user', async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('ADMINISTRATOR', 30) as never);
      const res = await request(app).get('/api/dashboards/staff').set('Cookie', COOKIE);
      expect(res.status).toBe(200);

      // Verify that myTickets and myActions query used admin user id 30
      const ticketCountCalls = vi.mocked(prisma.ticket.count).mock.calls;
      expect(ticketCountCalls.some(([arg]) => arg?.where?.ownerId === 30)).toBe(true);

      const actionCountCalls = vi.mocked(prisma.actionTaken.count).mock.calls;
      expect(actionCountCalls.some(([arg]) => arg?.where?.assigneeId === 30)).toBe(true);
    });
  });

  describe('Zero-State Handling and Authoritative Calculation', () => {
    it('includes all 8 ticket statuses with 0 for empty counts in ticketsByStatus', async () => {
      vi.mocked(prisma.ticket.groupBy).mockResolvedValueOnce([
        { currentStatus: 'OPEN', _count: { _all: 5 } },
        { currentStatus: 'RESOLVED', _count: { _all: 2 } },
      ] as never);

      const res = await request(app).get('/api/dashboards/staff').set('Cookie', COOKIE);

      expect(res.status).toBe(200);
      expect(res.body.metrics.ticketsByStatus).toEqual({
        NEW: 0,
        OPEN: 5,
        IN_PROGRESS: 0,
        WAITING_FOR_REQUESTER: 0,
        RESOLVED: 2,
        CLOSED: 0,
        REOPENED: 0,
        CANCELLED: 0,
      });
    });

    it('includes all 4 IT priorities with 0 for empty counts in activeTicketsByItPriority', async () => {
      vi.mocked(prisma.ticket.groupBy)
        .mockResolvedValueOnce([] as never) // status groups
        .mockResolvedValueOnce([
          { itPriority: 'HIGH', _count: { _all: 3 } },
          { itPriority: 'CRITICAL', _count: { _all: 1 } },
        ] as never); // priority groups

      const res = await request(app).get('/api/dashboards/staff').set('Cookie', COOKIE);

      expect(res.status).toBe(200);
      expect(res.body.metrics.activeTicketsByItPriority).toEqual({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 3,
        CRITICAL: 1,
      });
    });

    it('enforces RepeatableRead isolation level in transaction', async () => {
      await request(app).get('/api/dashboards/staff').set('Cookie', COOKIE);

      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { isolationLevel: 'RepeatableRead' },
      );
    });

    it('returns 500 INTERNAL_ERROR envelope on database failure', async () => {
      vi.mocked(prisma.ticket.count).mockRejectedValueOnce(new Error('DB failure'));

      const res = await request(app).get('/api/dashboards/staff').set('Cookie', COOKIE);

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Staff Action Rows and Preview Lists', () => {
    it('returns urgent tickets and user-assigned actions with ticket details', async () => {
      const sampleTicket = {
        id: 201,
        ticketNumber: 'TK-0201',
        summary: 'Database CPU 100%',
        currentStatus: 'IN_PROGRESS',
        itPriority: 'CRITICAL',
        updatedAt: new Date('2026-10-18T11:00:00.000Z'),
        resolvedAt: null,
      };

      const sampleAction = {
        id: 501,
        ticketId: 201,
        description: 'Restarted connection pooler',
        result: null,
        status: 'IN_PROGRESS',
        performedBy: { id: 20, name: 'Staff_User', role: 'IT_STAFF' },
        assignee: { id: 20, name: 'Staff_User', role: 'IT_STAFF', isActive: true },
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: null,
        cancelReason: null,
        createdAt: new Date('2026-10-18T11:05:00.000Z'),
        updatedAt: new Date('2026-10-18T11:05:00.000Z'),
        version: 1,
        ticket: {
          id: 201,
          ticketNumber: 'TK-0201',
          summary: 'Database CPU 100%',
          currentStatus: 'IN_PROGRESS',
        },
      };

      vi.mocked(prisma.ticket.findMany)
        .mockResolvedValueOnce([sampleTicket] as never) // recentTickets
        .mockResolvedValueOnce([sampleTicket] as never); // urgentTickets

      vi.mocked(prisma.actionTaken.findMany).mockResolvedValueOnce([sampleAction] as never);

      const res = await request(app).get('/api/dashboards/staff').set('Cookie', COOKIE);

      expect(res.status).toBe(200);
      expect(res.body.urgentTickets).toHaveLength(1);
      expect(res.body.urgentTickets[0].itPriority).toBe('CRITICAL');
      expect(res.body.myActions).toHaveLength(1);
      expect(res.body.myActions[0]).toMatchObject({
        id: 501,
        description: 'Restarted connection pooler',
        status: 'IN_PROGRESS',
        ticket: {
          id: 201,
          ticketNumber: 'TK-0201',
          summary: 'Database CPU 100%',
          currentStatus: 'IN_PROGRESS',
        },
      });
    });
  });

  describe('GET /api/staff/actions-taken Drill-down Endpoint', () => {
    it('requires assignee=me query parameter and returns 400 when missing or tampered', async () => {
      const missing = await request(app).get('/api/staff/actions-taken').set('Cookie', COOKIE);
      expect(missing.status).toBe(400);
      expect(missing.body.error.code).toBe('INVALID_QUERY');

      const tampered = await request(app).get('/api/staff/actions-taken?assignee=999').set('Cookie', COOKIE);
      expect(tampered.status).toBe(400);
      expect(tampered.body.error.code).toBe('INVALID_QUERY');
    });

    it('validates statuses query parameter and returns 400 on invalid status enum', async () => {
      const invalid = await request(app)
        .get('/api/staff/actions-taken?assignee=me&statuses=INVALID_STATUS')
        .set('Cookie', COOKIE);
      expect(invalid.status).toBe(400);
      expect(invalid.body.error.code).toBe('INVALID_QUERY');
    });

    it('returns paginated actions with ticket details for assignee=me', async () => {
      vi.mocked(prisma.actionTaken.count).mockResolvedValue(1 as never);
      vi.mocked(prisma.actionTaken.findMany).mockResolvedValue([
        {
          id: 601,
          ticketId: 301,
          description: 'Migrate user credentials',
          result: null,
          status: 'PENDING',
          performedBy: { id: 20, name: 'Staff_User', role: 'IT_STAFF' },
          assignee: { id: 20, name: 'Staff_User', role: 'IT_STAFF', isActive: true },
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
          cancelReason: null,
          createdAt: new Date('2026-10-18T10:00:00.000Z'),
          updatedAt: new Date('2026-10-18T10:00:00.000Z'),
          version: 1,
          ticket: {
            id: 301,
            ticketNumber: 'TK-0301',
            summary: 'User auth migration',
            currentStatus: 'OPEN',
          },
        },
      ] as never);

      const res = await request(app)
        .get('/api/staff/actions-taken?assignee=me&statuses=PENDING,IN_PROGRESS&page=1&pageSize=10')
        .set('Cookie', COOKIE);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(601);
      expect(res.body.data[0].ticket.ticketNumber).toBe('TK-0301');
      expect(res.body.pagination).toEqual({
        page: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      expect(prisma.actionTaken.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            assigneeId: 20,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
      );
    });

    it('rejects requester access with 403', async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('REQUESTER', 7) as never);
      const res = await request(app)
        .get('/api/staff/actions-taken?assignee=me')
        .set('Cookie', COOKIE);

      expect(res.status).toBe(403);
    });
  });

  describe('Drill-down Parity with /api/staff/tickets Extensions', () => {
    it('supports ownerId=me and statuses on /api/staff/tickets', async () => {
      vi.mocked(prisma.ticket.count).mockResolvedValue(2 as never);
      vi.mocked(prisma.ticket.findMany).mockResolvedValue([] as never);

      const res = await request(app)
        .get('/api/staff/tickets?ownerId=me&statuses=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED')
        .set('Cookie', COOKIE);

      expect(res.status).toBe(200);
      expect(prisma.ticket.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: 20, // resolved to current authenticated staff user.id
            currentStatus: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'] },
          }),
        }),
      );
    });

    it('supports itPriorities filter on /api/staff/tickets', async () => {
      vi.mocked(prisma.ticket.count).mockResolvedValue(1 as never);
      vi.mocked(prisma.ticket.findMany).mockResolvedValue([] as never);

      const res = await request(app)
        .get('/api/staff/tickets?itPriorities=HIGH,CRITICAL')
        .set('Cookie', COOKIE);

      expect(res.status).toBe(200);
      expect(prisma.ticket.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            itPriority: { in: ['HIGH', 'CRITICAL'] },
          }),
        }),
      );
    });

    it('rejects combining itPriority and itPriorities with 400 INVALID_QUERY', async () => {
      const res = await request(app)
        .get('/api/staff/tickets?itPriority=HIGH&itPriorities=HIGH,CRITICAL')
        .set('Cookie', COOKIE);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_QUERY');
    });
  });
});

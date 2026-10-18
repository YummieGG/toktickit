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
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

const COOKIE = 'tt_session=test-requester-token';

function session(role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR' = 'REQUESTER', id = 7) {
  return {
    id: 10,
    tokenHash: 'hash',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: {
      id,
      name: 'Somchai_Requester',
      email: 'somchai@example.com',
      role,
      isActive: true,
      mustChangePassword: false,
    },
  };
}

describe('API-05: Requester Dashboard API (FR-04-12, FR-04-14, DASHBOARD-01, AC-07)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation((callback) => (callback as (tx: unknown) => unknown)(prisma) as never);
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('REQUESTER', 7) as never);
    vi.mocked(prisma.ticket.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.ticket.findMany).mockResolvedValue([] as never);
  });

  describe('Authentication & Role Authorization', () => {
    it('returns 401 when request is unauthenticated', async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(null as never);
      const res = await request(app).get('/api/dashboards/requester');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns 403 when authenticated as IT_STAFF', async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('IT_STAFF', 20) as never);
      const res = await request(app).get('/api/dashboards/requester').set('Cookie', COOKIE);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 403 when authenticated as ADMINISTRATOR', async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('ADMINISTRATOR', 30) as never);
      const res = await request(app).get('/api/dashboards/requester').set('Cookie', COOKIE);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 200 when authenticated as REQUESTER', async () => {
      const res = await request(app).get('/api/dashboards/requester').set('Cookie', COOKIE);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('metrics');
      expect(res.body).toHaveProperty('window');
      expect(res.body.timezone).toBe('Asia/Bangkok');
      expect(res.body.listLimit).toBe(5);
    });
  });

  describe('Session Ownership & Isolation', () => {
    it('scopes all metrics strictly to session user.id and ignores query tampering', async () => {
      await request(app)
        .get('/api/dashboards/requester?requesterId=999')
        .set('Cookie', COOKIE);

      // Verify that every count query scoped to requesterId = 7
      const countCalls = vi.mocked(prisma.ticket.count).mock.calls;
      expect(countCalls.length).toBeGreaterThanOrEqual(4);
      for (const [arg] of countCalls) {
        expect(arg?.where).toHaveProperty('requesterId', 7);
      }

      // Verify that every findMany query scoped to requesterId = 7
      const findCalls = vi.mocked(prisma.ticket.findMany).mock.calls;
      expect(findCalls.length).toBeGreaterThanOrEqual(3);
      for (const [arg] of findCalls) {
        expect(arg?.where).toHaveProperty('requesterId', 7);
      }
    });
  });

  describe('Metrics Calculation & Response Shape', () => {
    it('returns exact metric numbers and empty arrays for zero state', async () => {
      vi.mocked(prisma.ticket.count).mockResolvedValue(0 as never);
      vi.mocked(prisma.ticket.findMany).mockResolvedValue([] as never);

      const res = await request(app).get('/api/dashboards/requester').set('Cookie', COOKIE);

      expect(res.status).toBe(200);
      expect(res.body.metrics).toEqual({
        openTickets: 0,
        waitingForYou: 0,
        recentlyUpdated: 0,
        recentlyResolved: 0,
      });
      expect(res.body.recentTickets).toEqual([]);
      expect(res.body.attentionTickets).toEqual([]);
      expect(res.body.resolvedTickets).toEqual([]);
      expect(res.body.timezone).toBe('Asia/Bangkok');
      expect(typeof res.body.generatedAt).toBe('string');
      expect(typeof res.body.window.from).toBe('string');
      expect(typeof res.body.window.to).toBe('string');
    });

    it('returns populated metrics and formatted preview lists', async () => {
      // Mock counts: open=3, waiting=1, updated=4, resolved=2
      vi.mocked(prisma.ticket.count)
        .mockResolvedValueOnce(3 as never) // openTickets
        .mockResolvedValueOnce(1 as never) // waitingForYou
        .mockResolvedValueOnce(4 as never) // recentlyUpdated
        .mockResolvedValueOnce(2 as never); // recentlyResolved

      const sampleTicket = {
        id: 101,
        ticketNumber: 'TK-0101',
        summary: 'VPN disconnect issue',
        currentStatus: 'IN_PROGRESS',
        itPriority: 'HIGH',
        updatedAt: new Date('2026-10-18T10:00:00.000Z'),
        resolvedAt: null,
      };

      const resolvedTicket = {
        id: 102,
        ticketNumber: 'TK-0102',
        summary: 'Password reset request',
        currentStatus: 'RESOLVED',
        itPriority: 'LOW',
        updatedAt: new Date('2026-10-17T09:00:00.000Z'),
        resolvedAt: new Date('2026-10-17T09:30:00.000Z'),
      };

      vi.mocked(prisma.ticket.findMany)
        .mockResolvedValueOnce([sampleTicket] as never)
        .mockResolvedValueOnce([sampleTicket] as never)
        .mockResolvedValueOnce([resolvedTicket] as never);

      const res = await request(app).get('/api/dashboards/requester').set('Cookie', COOKIE);

      expect(res.status).toBe(200);
      expect(res.body.metrics).toEqual({
        openTickets: 3,
        waitingForYou: 1,
        recentlyUpdated: 4,
        recentlyResolved: 2,
      });
      expect(res.body.recentTickets).toHaveLength(1);
      expect(res.body.recentTickets[0]).toEqual({
        id: 101,
        ticketNumber: 'TK-0101',
        summary: 'VPN disconnect issue',
        currentStatus: 'IN_PROGRESS',
        itPriority: 'HIGH',
        updatedAt: '2026-10-18T10:00:00.000Z',
        resolvedAt: null,
      });
      expect(res.body.resolvedTickets[0]).toEqual({
        id: 102,
        ticketNumber: 'TK-0102',
        summary: 'Password reset request',
        currentStatus: 'RESOLVED',
        itPriority: 'LOW',
        updatedAt: '2026-10-17T09:00:00.000Z',
        resolvedAt: '2026-10-17T09:30:00.000Z',
      });
    });

    it('enforces RepeatableRead transaction isolation level', async () => {
      await request(app).get('/api/dashboards/requester').set('Cookie', COOKIE);

      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { isolationLevel: 'RepeatableRead' },
      );
    });

    it('returns 500 INTERNAL_ERROR envelope on unexpected error', async () => {
      vi.mocked(prisma.ticket.count).mockRejectedValueOnce(new Error('DB failure'));

      const res = await request(app).get('/api/dashboards/requester').set('Cookie', COOKIE);

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Drill-down Parity with /api/tickets Query Extensions', () => {
    it('supports statuses filter set on /api/tickets', async () => {
      vi.mocked(prisma.ticket.count).mockResolvedValue(3 as never);
      vi.mocked(prisma.ticket.findMany).mockResolvedValue([] as never);

      const res = await request(app)
        .get('/api/tickets?statuses=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED')
        .set('Cookie', COOKIE);

      expect(res.status).toBe(200);
      expect(prisma.ticket.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            currentStatus: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'] },
          }),
        }),
      );
    });

    it('rejects combining status and statuses with 400 INVALID_QUERY', async () => {
      const res = await request(app)
        .get('/api/tickets?status=NEW&statuses=OPEN,IN_PROGRESS')
        .set('Cookie', COOKIE);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_QUERY');
    });

    it('supports date-range and resolvedAt sorting on /api/tickets', async () => {
      const from = '2026-10-12T00:00:00.000Z';
      const to = '2026-10-18T12:00:00.000Z';

      const res = await request(app)
        .get(`/api/tickets?statuses=RESOLVED,CLOSED&resolvedFrom=${from}&resolvedTo=${to}&sortBy=resolvedAt&sortOrder=desc`)
        .set('Cookie', COOKIE);

      expect(res.status).toBe(200);
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            currentStatus: { in: ['RESOLVED', 'CLOSED'] },
            resolvedAt: { gte: new Date(from), lte: new Date(to) },
          }),
          orderBy: [{ resolvedAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
        }),
      );
    });
  });
});

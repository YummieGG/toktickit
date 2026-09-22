import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    ticket: { findFirst: vi.fn() },
    userSession: { findUnique: vi.fn() },
  },
}));

const cookie = 'tt_session=test-session-token';

function session(role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR' = 'REQUESTER', id = 7) {
  return {
    id: 10,
    tokenHash: 'hash',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: {
      id, name: 'Somchai', email: 'somchai@example.com', role,
      isActive: true, mustChangePassword: false,
    },
  };
}

const ticket = {
  id: 8,
  ticketNumber: 'TK-0008',
  summary: 'VPN access unavailable',
  description: 'VPN disconnects after login.',
  requestedPriority: 'HIGH',
  itPriority: 'HIGH',
  currentStatus: 'NEW',
  ticketDate: new Date('2026-09-05T08:30:00.000Z'),
  problemAppearsResolvedAt: new Date('2026-09-05T09:00:00.000Z'),
  owner: null,
  category: { id: 2, name: 'Network' },
  relatedSystem: { id: 3, name: 'VPN Gateway' },
  requester: { id: 7, name: 'Somchai', email: 'somchai@example.com', role: 'REQUESTER' },
  attachments: [],
  comments: [{
    id: 1,
    ticketId: 8,
    content: 'Please retry now.',
    createdAt: new Date('2026-09-05T08:45:00.000Z'),
    author: { id: 20, name: 'Support', role: 'IT_STAFF' },
  }],
  createdAt: new Date('2026-09-05T08:30:00.000Z'),
  updatedAt: new Date('2026-09-05T09:00:00.000Z'),
};

describe('Tickets API - GET /api/tickets/:id', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session() as never);
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue(ticket as never);
  });

  it('returns 401 without a session', async () => {
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(null as never);

    const response = await request(app).get('/api/tickets/8');

    expect(response.status).toBe(401);
    expect(prisma.ticket.findFirst).not.toHaveBeenCalled();
  });

  it('returns the complete owned ticket using the session identity', async () => {
    const response = await request(app)
      .get('/api/tickets/8?requesterId=999')
      .set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: 8,
      ticketNumber: 'TK-0008',
      itPriority: 'HIGH',
      problemAppearsResolvedAt: '2026-09-05T09:00:00.000Z',
      requester: { id: 7, role: 'REQUESTER' },
      comments: [{ content: 'Please retry now.', author: { role: 'IT_STAFF' } }],
    });
    expect(prisma.ticket.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 8, requesterId: 7 },
      select: expect.objectContaining({
        description: true,
        problemAppearsResolvedAt: true,
        comments: expect.any(Object),
        attachments: expect.any(Object),
      }),
    }));
  });

  it.each(['IT_STAFF', 'ADMINISTRATOR'] as const)('allows %s to read any ticket detail', async role => {
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session(role, 20) as never);

    const response = await request(app).get('/api/tickets/8').set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(prisma.ticket.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 8 } }));
  });

  it('returns the same safe 404 for a missing or cross-owner ticket', async () => {
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue(null as never);

    const response = await request(app)
      .get('/api/tickets/8?requesterId=7')
      .set('Cookie', cookie);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
    expect(JSON.stringify(response.body)).not.toContain('requester');
  });

  it.each(['/api/tickets/nope', '/api/tickets/0', '/api/tickets/2147483648'])(
    'rejects malformed ticket id %s before database access',
    async url => {
      const response = await request(app).get(url).set('Cookie', cookie);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(prisma.ticket.findFirst).not.toHaveBeenCalled();
    },
  );
});

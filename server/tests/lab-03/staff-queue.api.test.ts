import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    userSession: { findUnique: vi.fn() },
    ticket: { findMany: vi.fn(), count: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

const cookie = 'tt_session=test-session-token';
function session(role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR' = 'IT_STAFF') {
  return {
    id: 10, tokenHash: 'hash', expiresAt: new Date(Date.now() + 60_000), revokedAt: null,
    user: { id: role === 'IT_STAFF' ? 20 : 30, name: 'Support', email: 'support@example.com', role, isActive: true, mustChangePassword: false },
  };
}

describe('Issue #41 Staff Queue API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session() as never);
    vi.mocked(prisma.ticket.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.ticket.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
  });

  it('requires authentication and the Staff/Admin role', async () => {
    const unauthenticated = await request(app).get('/api/staff/tickets');
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('REQUESTER') as never);
    const requester = await request(app).get('/api/staff/tickets').set('Cookie', cookie);
    expect(unauthenticated.status).toBe(401);
    expect(requester.status).toBe(403);
    expect(prisma.ticket.findMany).not.toHaveBeenCalled();
  });

  it.each(['IT_STAFF', 'ADMINISTRATOR'] as const)('allows %s to read the full queue', async role => {
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session(role) as never);
    vi.mocked(prisma.ticket.findMany).mockResolvedValue([{ id: 8, ticketNumber: 'TK-0008' }] as never);
    vi.mocked(prisma.ticket.count).mockResolvedValue(12 as never);
    const response = await request(app)
      .get('/api/staff/tickets?search=VPN&status=IN_PROGRESS&requestedPriority=HIGH&itPriority=CRITICAL&category=3&ownerId=unassigned&sortBy=owner&sortOrder=asc&page=2&pageSize=5')
      .set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([{ id: 8, ticketNumber: 'TK-0008' }]);
    expect(response.body.pagination).toEqual({ page: 2, pageSize: 5, totalItems: 12, totalPages: 3, hasNextPage: true, hasPreviousPage: true });
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        currentStatus: 'IN_PROGRESS', requestedPriority: 'HIGH', itPriority: 'CRITICAL', categoryId: 3, ownerId: null,
        OR: [
          { ticketNumber: { contains: 'VPN', mode: 'insensitive' } },
          { summary: { contains: 'VPN', mode: 'insensitive' } },
          { description: { contains: 'VPN', mode: 'insensitive' } },
          { requester: { name: { contains: 'VPN', mode: 'insensitive' } } },
          { requester: { email: { contains: 'VPN', mode: 'insensitive' } } },
        ],
      },
      orderBy: [{ owner: { name: 'asc' } }, { id: 'desc' }], skip: 5, take: 5,
    }));
  });

  it('uses the contract defaults and returns a stable empty result', async () => {
    const response = await request(app).get('/api/staff/tickets').set('Cookie', cookie);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } });
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], skip: 0, take: 10 }));
  });

  it.each(['IT_STAFF', 'ADMINISTRATOR'] as const)('returns active eligible owners to %s', async role => {
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session(role) as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 21, name: 'Narin Support', email: 'narin.staff@toktickit.local', role: 'IT_STAFF' },
      { id: 30, name: 'Araya Administrator', email: 'araya.admin@toktickit.local', role: 'ADMINISTRATOR' },
    ] as never);

    const response = await request(app).get('/api/staff/tickets/owners').set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { isActive: true, role: { in: ['IT_STAFF', 'ADMINISTRATOR'] } },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, email: true, role: true },
    });
  });

  it('forbids Requester from reading eligible owners', async () => {
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('REQUESTER') as never);

    const response = await request(app).get('/api/staff/tickets/owners').set('Cookie', cookie);

    expect(response.status).toBe(403);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it.each(['?pageSize=15', '?page=0', '?status=ASSIGNED', '?ownerId=999.5', '?search=one&search=two'])('rejects invalid query %s without reading data', async query => {
    const response = await request(app).get(`/api/staff/tickets${query}`).set('Cookie', cookie);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_QUERY');
    expect(prisma.ticket.findMany).not.toHaveBeenCalled();
  });
});

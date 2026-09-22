import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    ticket: { findMany: vi.fn(), count: vi.fn() },
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

describe('Tickets API - GET /api/tickets', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session() as never);
    vi.mocked(prisma.ticket.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.ticket.count).mockResolvedValue(0 as never);
  });

  it('returns 401 without a session and 403 for a non-requester role', async () => {
    const unauthenticated = await request(app).get('/api/tickets');

    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('IT_STAFF') as never);
    const wrongRole = await request(app).get('/api/tickets').set('Cookie', cookie);

    expect(unauthenticated.status).toBe(401);
    expect(wrongRole.status).toBe(403);
    expect(prisma.ticket.findMany).not.toHaveBeenCalled();
  });

  it('uses only the session requester and ignores a tampered requesterId query', async () => {
    vi.mocked(prisma.ticket.findMany).mockResolvedValue([{ id: 8, ticketNumber: 'TK-0008' }] as never);
    vi.mocked(prisma.ticket.count).mockResolvedValue(1 as never);

    const response = await request(app)
      .get('/api/tickets?requesterId=999')
      .set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body.pagination).toEqual({
      page: 1, pageSize: 10, totalItems: 1, totalPages: 1,
      hasNextPage: false, hasPreviousPage: false,
    });
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { requesterId: 7 },
      orderBy: [{ ticketDate: 'desc' }, { id: 'desc' }],
      skip: 0,
      take: 10,
    }));
    expect(prisma.ticket.count).toHaveBeenCalledWith({ where: { requesterId: 7 } });
  });

  it('applies search, filters, sorting, and pagination within the authenticated scope', async () => {
    vi.mocked(prisma.ticket.count).mockResolvedValue(12 as never);

    const response = await request(app)
      .get('/api/tickets?search=VpN&category=2&status=NEW&priority=HIGH&sortBy=summary&sortOrder=asc&page=2&pageSize=5')
      .set('Cookie', cookie);

    const where = {
      requesterId: 7,
      categoryId: 2,
      currentStatus: 'NEW',
      requestedPriority: 'HIGH',
      OR: [
        { ticketNumber: { contains: 'VpN', mode: 'insensitive' } },
        { summary: { contains: 'VpN', mode: 'insensitive' } },
        { description: { contains: 'VpN', mode: 'insensitive' } },
      ],
    };
    expect(response.status).toBe(200);
    expect(response.body.pagination).toEqual({
      page: 2, pageSize: 5, totalItems: 12, totalPages: 3,
      hasNextPage: true, hasPreviousPage: true,
    });
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where, orderBy: [{ summary: 'asc' }, { id: 'desc' }], skip: 5, take: 5,
    }));
    expect(prisma.ticket.count).toHaveBeenCalledWith({ where });
  });

  it.each([
    ['fractional category', '?category=1.5'],
    ['invalid status', '?status=CLOSED'],
    ['invalid priority', '?priority=URGENT'],
    ['invalid sort field', '?sortBy=description'],
    ['invalid sort order', '?sortOrder=sideways'],
    ['invalid page', '?page=0'],
    ['invalid page size', '?pageSize=15'],
    ['repeated page', '?page=1&page=2'],
  ])('returns a structured 400 for %s', async (_label, query) => {
    const response = await request(app).get(`/api/tickets${query}`).set('Cookie', cookie);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_QUERY');
    expect(response.body.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: expect.any(String), message: expect.any(String) }),
    ]));
    expect(prisma.ticket.findMany).not.toHaveBeenCalled();
  });

  it('returns stable empty pagination metadata', async () => {
    const response = await request(app).get('/api/tickets').set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [],
      pagination: {
        page: 1, pageSize: 10, totalItems: 0, totalPages: 0,
        hasNextPage: false, hasPreviousPage: false,
      },
    });
  });
});

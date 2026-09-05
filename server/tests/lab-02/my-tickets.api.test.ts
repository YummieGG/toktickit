import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => {
  const mockPrisma = {
    ticket: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    requesterUser: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
    $executeRaw: vi.fn().mockResolvedValue(1),
    $queryRaw: vi.fn().mockResolvedValue([]),
  };
  return {
    prisma: mockPrisma,
  };
});

describe('Tickets API - GET /api/tickets', () => {
  const ticket = {
    id: 8,
    ticketNumber: 'TK-0008',
    summary: 'VPN access unavailable',
    requestedPriority: 'HIGH',
    currentStatus: 'NEW',
    ticketDate: new Date('2026-09-05T08:30:00.000Z'),
    category: { id: 2, name: 'Network' },
    updatedAt: new Date('2026-09-05T08:30:00.000Z'),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    (prisma.requesterUser.findUnique as any).mockResolvedValue({ id: 1, isActive: true });
    (prisma.ticket.findMany as any).mockResolvedValue([ticket]);
    (prisma.ticket.count as any).mockResolvedValue(1);
  });

  it('returns only the active requester tickets using default sorting and pagination (API-15, API-21, API-23)', async () => {
    const response = await request(app).get('/api/tickets?requesterId=1');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.pagination).toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { requesterId: 1 },
      orderBy: [{ ticketDate: 'desc' }, { id: 'desc' }],
      skip: 0,
      take: 10,
      select: expect.objectContaining({
        category: { select: { id: true, name: true } },
      }),
    }));
    const listQuery = (prisma.ticket.findMany as any).mock.calls[0][0];
    expect(listQuery.select).not.toHaveProperty('description');
  });

  it('applies case-insensitive search, filters, sorting, and pagination to both list and count (API-17, API-18, API-19, API-20)', async () => {
    (prisma.ticket.count as any).mockResolvedValue(12);

    const response = await request(app).get(
      '/api/tickets?requesterId=7&search=VpN&category=2&status=NEW&priority=HIGH&sortBy=summary&sortOrder=asc&page=2&pageSize=5'
    );

    expect(response.status).toBe(200);
    expect(response.body.pagination).toEqual({
      page: 2,
      pageSize: 5,
      totalItems: 12,
      totalPages: 3,
    });
    const expectedWhere = {
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
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expectedWhere,
      orderBy: [{ summary: 'asc' }, { id: 'asc' }],
      skip: 5,
      take: 5,
    }));
    expect(prisma.ticket.count).toHaveBeenCalledWith({ where: expectedWhere });
  });

  it('supports sorting by ticketNumber in ascending order (API-22)', async () => {
    const response = await request(app).get(
      '/api/tickets?requesterId=1&sortBy=ticketNumber&sortOrder=asc'
    );

    expect(response.status).toBe(200);
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ ticketNumber: 'asc' }, { id: 'asc' }],
      })
    );
  });

  it.each([
    ['missing requesterId (API-16)', ''],
    ['invalid requesterId', '?requesterId=0'],
    ['requesterId beyond database integer range', '?requesterId=2147483648'],
    ['fractional category', '?requesterId=1&category=1.5'],
    ['invalid status', '?requesterId=1&status=CLOSED'],
    ['invalid priority', '?requesterId=1&priority=URGENT'],
    ['invalid sort field', '?requesterId=1&sortBy=description'],
    ['invalid sort order', '?requesterId=1&sortOrder=sideways'],
    ['invalid page (API-25)', '?requesterId=1&page=0'],
    ['page beyond database integer range', '?requesterId=1&page=2147483648'],
    ['invalid page size (API-26)', '?requesterId=1&pageSize=15'],
    ['repeated page', '?requesterId=1&page=1&page=2'],
  ])('returns the common 400 response for %s', async (_label, query) => {
    const response = await request(app).get(`/api/tickets${query}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    expect(response.body.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: expect.any(String), message: expect.any(String) }),
    ]));
    expect(prisma.ticket.findMany).not.toHaveBeenCalled();
  });

  it('rejects a requester that does not exist or is inactive', async () => {
    (prisma.requesterUser.findUnique as any).mockResolvedValue({ id: 1, isActive: false });

    const response = await request(app).get('/api/tickets?requesterId=1');

    expect(response.status).toBe(400);
    expect(response.body.details).toContainEqual({
      field: 'requesterId',
      message: 'Requester not found or is inactive',
    });
    expect(prisma.ticket.findMany).not.toHaveBeenCalled();
  });

  it('returns an empty array with zero pagination metadata when requester has no matching tickets (API-24)', async () => {
    (prisma.ticket.findMany as any).mockResolvedValue([]);
    (prisma.ticket.count as any).mockResolvedValue(0);

    const response = await request(app).get('/api/tickets?requesterId=1');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.pagination).toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
    });
  });
});

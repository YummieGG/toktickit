import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    category: { findMany: vi.fn() },
    userSession: { findUnique: vi.fn() },
  },
}));

const cookie = 'tt_session=test-session-token';

describe('Categories API - GET /api/categories', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue({
      id: 10,
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: {
        id: 7, name: 'Somchai', email: 'somchai@example.com', role: 'REQUESTER',
        isActive: true, mustChangePassword: false,
      },
    } as never);
  });

  it('returns active categories with id and name only for an authenticated user', async () => {
    const categories = [{ id: 1, name: 'Hardware' }, { id: 2, name: 'Software' }];
    vi.mocked(prisma.category.findMany).mockResolvedValue(categories as never);

    const response = await request(app).get('/api/categories').set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: categories });
    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' },
    });
  });

  it('returns the common 500 response when the query fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(prisma.category.findMany).mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/api/categories').set('Cookie', cookie);

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
  });
});

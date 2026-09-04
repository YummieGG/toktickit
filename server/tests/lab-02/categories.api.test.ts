import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => {
  return {
    prisma: {
      category: {
        findMany: vi.fn(),
      },
    },
  };
});

describe('Categories API - GET /api/categories', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return active categories with id and name only', async () => {
    const mockCategories = [
      { id: 1, name: 'Hardware' },
      { id: 2, name: 'Software' },
    ];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.category.findMany as any).mockResolvedValue(mockCategories);

    const response = await request(app).get('/api/categories');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: mockCategories });
    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });
  });

  it('should return 500 if database query fails', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.category.findMany as any).mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/api/categories');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
});

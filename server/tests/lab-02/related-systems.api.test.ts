import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => {
  return {
    prisma: {
      relatedSystem: {
        findMany: vi.fn(),
      },
    },
  };
});

describe('Related Systems API - GET /api/related-systems', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return active systems with id and name only', async () => {
    const mockSystems = [
      { id: 1, name: 'Email' },
    ];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.relatedSystem.findMany as any).mockResolvedValue(mockSystems);

    const response = await request(app).get('/api/related-systems');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: mockSystems });
    expect(prisma.relatedSystem.findMany).toHaveBeenCalledWith({
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
    (prisma.relatedSystem.findMany as any).mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/api/related-systems');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
});

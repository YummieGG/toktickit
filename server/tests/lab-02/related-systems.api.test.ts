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

  it('should return active systems', async () => {
    const mockSystems = [
      { id: 1, name: 'Email', isActive: true },
    ];
    
    (prisma.relatedSystem.findMany as any).mockResolvedValue(mockSystems);

    const response = await request(app).get('/api/related-systems');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: mockSystems });
    expect(prisma.relatedSystem.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  });
});

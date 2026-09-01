import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';

// Mock the Prisma Client
vi.mock('../../src/lib/prisma', () => {
  return {
    prisma: {
      requesterUser: {
        findMany: vi.fn(),
      },
    },
  };
});

describe('Requesters API - GET /api/requesters', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return only active requesters in alphabetical order', async () => {
    const mockRequesters = [
      { id: 2, name: 'Anan Sukjai', email: 'anan@example.com' },
      { id: 1, name: 'Somchai Prasert', email: 'somchai@example.com' },
    ];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.requesterUser.findMany as any).mockResolvedValue(mockRequesters);

    const response = await request(app).get('/api/requesters');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: mockRequesters });
    
    // Verify prisma was called with correct parameters
    expect(prisma.requesterUser.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    });
  });

  it('should return 500 if database query fails', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.requesterUser.findMany as any).mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/api/requesters');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
});

import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../generated/prisma', () => {
  return {
    PrismaClient: class {
      category = {
        findMany: vi.fn().mockResolvedValue([
          { id: 1, name: 'Account and Access', isActive: true },
          { id: 2, name: 'Hardware', isActive: true },
          { id: 3, name: 'Software', isActive: true },
          { id: 4, name: 'Network', isActive: true }
        ])
      };
    }
  };
});

import app from '../../src/index';

describe('API-02: GET /api/categories', () => {
  it('returns 200 and the seeded categories', async () => {
    const response = await request(app).get('/api/categories');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true); // Adjusted for Lab 2 spec
    
    // Check if the body contains the required categories
    const categoryNames = response.body.data.map((cat: any) => cat.name);
    expect(categoryNames).toContain('Account and Access');
    expect(categoryNames).toContain('Hardware');
    expect(categoryNames).toContain('Software');
    expect(categoryNames).toContain('Network');
  });
});

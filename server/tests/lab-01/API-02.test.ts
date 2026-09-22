import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

describe('API-02: GET /api/categories', () => {
  it('is protected after the Lab 3 authentication migration', async () => {
    const response = await request(app).get('/api/categories');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { code: 'UNAUTHENTICATED', message: 'Authentication is required' },
    });
  });
});

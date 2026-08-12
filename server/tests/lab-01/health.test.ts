import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

describe('GET /api/health', () => {
  it('should return 200 and health status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({
      status: 'ok',
      service: 'TokTickIT API'
    });
  });
});

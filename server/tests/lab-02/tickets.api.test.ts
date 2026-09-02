import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';
import * as ticketNumberLib from '../../src/lib/ticket-number';

// Mock Prisma
vi.mock('../../src/lib/prisma', () => {
  return {
    prisma: {
      ticket: {
        create: vi.fn(),
      },
    },
  };
});

describe('Tickets API - POST /api/tickets', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('validates required fields', async () => {
    const response = await request(app).post('/api/tickets').send({});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('requesterId is required');
  });

  it('validates summary length', async () => {
    const response = await request(app).post('/api/tickets').send({
      requesterId: 1,
      categoryId: 1,
      summary: 'abc', // too short
      description: 'valid description here',
      requestedPriority: 'LOW'
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Summary must be between 5 and 200 characters');
  });

  it('creates ticket successfully and sets NEW status', async () => {
    const mockCreatedTicket = {
      id: 1,
      ticketNumber: 'TK-0001',
      summary: 'Valid summary',
      description: 'Valid description here',
      requestedPriority: 'LOW',
      currentStatus: 'NEW',
      requesterId: 1,
      categoryId: 1
    };

    vi.spyOn(ticketNumberLib, 'generateTicketNumber').mockResolvedValue('TK-0001');
    (prisma.ticket.create as any).mockResolvedValue(mockCreatedTicket);

    const response = await request(app).post('/api/tickets').send({
      requesterId: 1,
      categoryId: 1,
      summary: 'Valid summary',
      description: 'Valid description here',
      requestedPriority: 'LOW'
    });

    expect(response.status).toBe(201);
    expect(response.body.data.ticketNumber).toBe('TK-0001');
    expect(prisma.ticket.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        currentStatus: 'NEW',
        ticketNumber: 'TK-0001'
      })
    }));
  });
});

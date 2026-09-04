import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';
import * as ticketNumberLib from '../../src/lib/ticket-number';
import { Prisma } from '../../generated/prisma';

// Mock Prisma
vi.mock('../../src/lib/prisma', () => {
  const mockPrisma = {
    ticket: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    requesterUser: {
      findUnique: vi.fn(),
    },
    category: {
      findUnique: vi.fn(),
    },
    relatedSystem: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
    $executeRaw: vi.fn().mockResolvedValue(1),
  };
  return {
    prisma: mockPrisma,
  };
});

describe('Tickets API - POST /api/tickets', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default $transaction mock passes transaction client (or mockPrisma) to the callback
    (prisma.$transaction as any).mockImplementation(async (callback: any) => {
      return callback(prisma);
    });
  });

  it('validates required fields and returns details array', async () => {
    const response = await request(app).post('/api/tickets').send({});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    expect(Array.isArray(response.body.details)).toBe(true);
    
    const fields = response.body.details.map((d: any) => d.field);
    expect(fields).toContain('requesterId');
    expect(fields).toContain('categoryId');
    expect(fields).toContain('summary');
    expect(fields).toContain('description');
    expect(fields).toContain('requestedPriority');
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
    expect(response.body.error).toBe('Validation failed');
    const summaryError = response.body.details.find((d: any) => d.field === 'summary');
    expect(summaryError?.message).toContain('Summary must be between 5 and 200 characters');
  });

  it('returns 400 if requester does not exist or is inactive (BR-05)', async () => {
    (prisma.requesterUser.findUnique as any).mockResolvedValue(null);
    (prisma.category.findUnique as any).mockResolvedValue({ id: 1, name: 'Hardware', isActive: true });

    const response = await request(app).post('/api/tickets').send({
      requesterId: 999,
      categoryId: 1,
      summary: 'Valid summary here',
      description: 'Valid description here',
      requestedPriority: 'LOW'
    });

    expect(response.status).toBe(400);
    const requesterError = response.body.details.find((d: any) => d.field === 'requesterId');
    expect(requesterError?.message).toContain('Requester not found or is inactive');
  });

  it('returns 400 if category does not exist or is inactive (BR-24)', async () => {
    (prisma.requesterUser.findUnique as any).mockResolvedValue({ id: 1, name: 'Somchai', isActive: true });
    (prisma.category.findUnique as any).mockResolvedValue({ id: 999, name: 'Inactive Cat', isActive: false });

    const response = await request(app).post('/api/tickets').send({
      requesterId: 1,
      categoryId: 999,
      summary: 'Valid summary here',
      description: 'Valid description here',
      requestedPriority: 'LOW'
    });

    expect(response.status).toBe(400);
    const categoryError = response.body.details.find((d: any) => d.field === 'categoryId');
    expect(categoryError?.message).toContain('Category not found or is inactive');
  });

  it('creates ticket successfully inside transaction and returns expanded contract', async () => {
    const mockCreatedTicket = {
      id: 1,
      ticketNumber: 'TK-0001',
      summary: 'Valid summary here',
      description: 'Valid description here',
      requestedPriority: 'LOW',
      currentStatus: 'NEW',
      ticketDate: new Date(),
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 2,
      category: { id: 1, name: 'Hardware' },
      relatedSystem: { id: 2, name: 'Email' },
      requester: { id: 1, name: 'Somchai' },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    (prisma.requesterUser.findUnique as any).mockResolvedValue({ id: 1, name: 'Somchai', isActive: true });
    (prisma.category.findUnique as any).mockResolvedValue({ id: 1, name: 'Hardware', isActive: true });
    (prisma.relatedSystem.findUnique as any).mockResolvedValue({ id: 2, name: 'Email', isActive: true });
    vi.spyOn(ticketNumberLib, 'generateTicketNumber').mockResolvedValue('TK-0001');
    (prisma.ticket.create as any).mockResolvedValue(mockCreatedTicket);

    const response = await request(app).post('/api/tickets').send({
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 2,
      summary: 'Valid summary here',
      description: 'Valid description here',
      requestedPriority: 'LOW'
    });

    expect(response.status).toBe(201);
    expect(response.body.data.ticketNumber).toBe('TK-0001');
    expect(response.body.data.category).toEqual({ id: 1, name: 'Hardware' });
    expect(response.body.data.relatedSystem).toEqual({ id: 2, name: 'Email' });
    expect(response.body.data.requester).toEqual({ id: 1, name: 'Somchai' });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.ticket.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        currentStatus: 'NEW',
        ticketNumber: 'TK-0001',
        requesterId: 1,
        categoryId: 1
      }),
      include: expect.objectContaining({
        category: expect.any(Object),
        relatedSystem: expect.any(Object),
        requester: expect.any(Object)
      })
    }));
  });

  it('retries on P2002 unique constraint violation and succeeds on retry', async () => {
    (prisma.requesterUser.findUnique as any).mockResolvedValue({ id: 1, name: 'Somchai', isActive: true });
    (prisma.category.findUnique as any).mockResolvedValue({ id: 1, name: 'Hardware', isActive: true });
    vi.spyOn(ticketNumberLib, 'generateTicketNumber')
      .mockResolvedValueOnce('TK-0001')
      .mockResolvedValueOnce('TK-0002');

    const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.x',
    });

    const mockCreatedTicket = {
      id: 2,
      ticketNumber: 'TK-0002',
      summary: 'Valid summary here',
      description: 'Valid description here',
      requestedPriority: 'LOW',
      currentStatus: 'NEW',
      ticketDate: new Date(),
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: null,
      category: { id: 1, name: 'Hardware' },
      relatedSystem: null,
      requester: { id: 1, name: 'Somchai' },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    (prisma.ticket.create as any)
      .mockRejectedValueOnce(p2002Error)
      .mockResolvedValueOnce(mockCreatedTicket);

    const response = await request(app).post('/api/tickets').send({
      requesterId: 1,
      categoryId: 1,
      summary: 'Valid summary here',
      description: 'Valid description here',
      requestedPriority: 'LOW'
    });

    expect(response.status).toBe(201);
    expect(response.body.data.ticketNumber).toBe('TK-0002');
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });
});

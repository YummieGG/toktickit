import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';
import * as ticketNumberLib from '../../src/lib/ticket-number';
import { Prisma } from '../../generated/prisma';
import fs from 'fs';

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
    $queryRaw: vi.fn().mockResolvedValue([]),
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

  it.each([
    ['fractional requesterId', { requesterId: 1.5, categoryId: 1 }],
    ['non-numeric categoryId', { requesterId: 1, categoryId: 'abc' }],
    ['exponential categoryId string', { requesterId: 1, categoryId: '1e0' }],
    ['object relatedSystemId', { requesterId: 1, categoryId: 1, relatedSystemId: { id: 2 } }],
  ])('rejects %s before querying reference data', async (_label, ids) => {
    const response = await request(app).post('/api/tickets').send({
      ...ids,
      summary: 'Valid summary here',
      description: 'Valid description here',
      requestedPriority: 'LOW'
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    expect(prisma.requesterUser.findUnique).not.toHaveBeenCalled();
    expect(prisma.category.findUnique).not.toHaveBeenCalled();
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

  it('creates ticket with optional attachments via multipart/form-data', async () => {
    (prisma.requesterUser.findUnique as any).mockResolvedValue({ id: 1, name: 'Somchai', isActive: true });
    (prisma.category.findUnique as any).mockResolvedValue({ id: 1, name: 'Hardware', isActive: true });
    vi.spyOn(ticketNumberLib, 'generateTicketNumber').mockResolvedValue('TK-0003');

    const mockTicketWithAttachment = {
      id: 3,
      ticketNumber: 'TK-0003',
      summary: 'Printer broken summary',
      description: 'Printer keeps jamming paper constantly',
      requestedPriority: 'HIGH',
      currentStatus: 'NEW',
      ticketDate: new Date(),
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: null,
      category: { id: 1, name: 'Hardware' },
      relatedSystem: null,
      requester: { id: 1, name: 'Somchai' },
      attachments: [
        {
          id: 1,
          originalName: 'error_screenshot.png',
          storedName: 'uuid-1234.png',
          mimeType: 'image/png',
          sizeBytes: 1024,
          isRemoved: false,
          createdAt: new Date()
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    (prisma.ticket.create as any).mockResolvedValue(mockTicketWithAttachment);

    const response = await request(app)
      .post('/api/tickets')
      .field('requesterId', '1')
      .field('categoryId', '1')
      .field('summary', 'Printer broken summary')
      .field('description', 'Printer keeps jamming paper constantly')
      .field('requestedPriority', 'HIGH')
      .attach('attachments', Buffer.from('fake image content'), {
        filename: 'error_screenshot.png',
        contentType: 'image/png'
      });

    expect(response.status).toBe(201);
    expect(response.body.data.ticketNumber).toBe('TK-0003');
    expect(response.body.data.attachments).toHaveLength(1);
    expect(response.body.data.attachments[0].originalName).toBe('error_screenshot.png');
  });

  it('rejects upload with more than 5 attachments (BR-10)', async () => {
    const req = request(app)
      .post('/api/tickets')
      .field('requesterId', '1')
      .field('categoryId', '1')
      .field('summary', 'Printer broken summary')
      .field('description', 'Printer keeps jamming paper constantly')
      .field('requestedPriority', 'HIGH');

    for (let i = 1; i <= 6; i++) {
      req.attach('attachments', Buffer.from('file content'), {
        filename: `photo${i}.png`,
        contentType: 'image/png'
      });
    }

    const response = await req;
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    const attachmentError = response.body.details.find((d: any) => d.field === 'attachments');
    expect(attachmentError?.message).toContain('Maximum 5 attachments allowed');
  });

  it('rejects attachment with invalid file type (BR-08)', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .field('requesterId', '1')
      .field('categoryId', '1')
      .field('summary', 'Printer broken summary')
      .field('description', 'Printer keeps jamming paper constantly')
      .field('requestedPriority', 'HIGH')
      .attach('attachments', Buffer.from('malicious content'), {
        filename: 'virus.exe',
        contentType: 'application/x-msdownload'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    const attachmentError = response.body.details.find((d: any) => d.field === 'attachments');
    expect(attachmentError?.message).toContain('not permitted');
  });

  it('rejects a file sent under a multipart field other than attachments', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .field('requesterId', '1')
      .field('categoryId', '1')
      .field('summary', 'Printer broken summary')
      .field('description', 'Printer keeps jamming paper constantly')
      .field('requestedPriority', 'HIGH')
      .attach('avatar', Buffer.from('fake image content'), {
        filename: 'photo.png',
        contentType: 'image/png'
      });

    expect(response.status).toBe(400);
    expect(response.body.details).toContainEqual({
      field: 'attachments',
      message: 'Files must use the attachments field'
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not create database metadata when storing an attachment fails', async () => {
    (prisma.requesterUser.findUnique as any).mockResolvedValue({ id: 1, name: 'Somchai', isActive: true });
    (prisma.category.findUnique as any).mockResolvedValue({ id: 1, name: 'Hardware', isActive: true });
    const mkdirSpy = vi.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
    const writeSpy = vi.spyOn(fs.promises, 'writeFile').mockRejectedValue(new Error('disk full'));

    try {
      const response = await request(app)
        .post('/api/tickets')
        .field('requesterId', '1')
        .field('categoryId', '1')
        .field('summary', 'Printer broken summary')
        .field('description', 'Printer keeps jamming paper constantly')
        .field('requestedPriority', 'HIGH')
        .attach('attachments', Buffer.from('fake image content'), {
          filename: 'photo.png',
          contentType: 'image/png'
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    } finally {
      mkdirSpy.mockRestore();
      writeSpy.mockRestore();
    }
  });

  it('removes stored attachment files when ticket creation fails', async () => {
    (prisma.requesterUser.findUnique as any).mockResolvedValue({ id: 1, name: 'Somchai', isActive: true });
    (prisma.category.findUnique as any).mockResolvedValue({ id: 1, name: 'Hardware', isActive: true });
    (prisma.$transaction as any).mockRejectedValue(new Error('database unavailable'));
    const mkdirSpy = vi.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
    const writeSpy = vi.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
    const unlinkSpy = vi.spyOn(fs.promises, 'unlink').mockResolvedValue(undefined);

    try {
      const response = await request(app)
        .post('/api/tickets')
        .field('requesterId', '1')
        .field('categoryId', '1')
        .field('summary', 'Printer broken summary')
        .field('description', 'Printer keeps jamming paper constantly')
        .field('requestedPriority', 'HIGH')
        .attach('attachments', Buffer.from('fake image content'), {
          filename: 'photo.png',
          contentType: 'image/png'
        });

      expect(response.status).toBe(500);
      expect(writeSpy).toHaveBeenCalledTimes(1);
      expect(unlinkSpy).toHaveBeenCalledTimes(1);
    } finally {
      mkdirSpy.mockRestore();
      writeSpy.mockRestore();
      unlinkSpy.mockRestore();
    }
  });

  it('rejects oversized attachment > 5MB (BR-09)', async () => {
    const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024); // 5MB + 1KB
    const response = await request(app)
      .post('/api/tickets')
      .field('requesterId', '1')
      .field('categoryId', '1')
      .field('summary', 'Printer broken summary')
      .field('description', 'Printer keeps jamming paper constantly')
      .field('requestedPriority', 'HIGH')
      .attach('attachments', largeBuffer, {
        filename: 'huge_scan.pdf',
        contentType: 'application/pdf'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    const attachmentError = response.body.details.find((d: any) => d.field === 'attachments');
    expect(attachmentError?.message).toContain('5 MB limit');
  });
});

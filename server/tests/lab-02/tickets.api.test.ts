import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';
import * as ticketNumberLib from '../../src/lib/ticket-number';

vi.mock('../../src/lib/prisma', () => {
  const prismaMock = {
    userSession: { findUnique: vi.fn() },
    category: { findUnique: vi.fn() },
    relatedSystem: { findUnique: vi.fn() },
    ticket: { create: vi.fn() },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
  };
  return { prisma: prismaMock };
});

const cookie = 'tt_session=test-session-token';
const origin = 'http://localhost:5173';

function session(role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR' = 'REQUESTER') {
  return {
    id: 10,
    tokenHash: 'hash',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: {
      id: 7, name: 'Somchai', email: 'somchai@example.com', role,
      isActive: true, mustChangePassword: false,
    },
  };
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    categoryId: 1,
    relatedSystemId: 2,
    summary: 'VPN access unavailable',
    description: 'VPN disconnects after login.',
    requestedPriority: 'HIGH',
    ...overrides,
  };
}

describe('Tickets API - POST /api/tickets', () => {
  let uploadsDirectory: string;

  beforeEach(() => {
    vi.resetAllMocks();
    uploadsDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'toktickit-ticket-create-'));
    process.env.UPLOADS_DIR = uploadsDirectory;
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session() as never);
    vi.mocked(prisma.category.findUnique).mockResolvedValue({ id: 1, name: 'Network', isActive: true } as never);
    vi.mocked(prisma.relatedSystem.findUnique).mockResolvedValue({ id: 2, name: 'VPN', isActive: true } as never);
    vi.spyOn(ticketNumberLib, 'generateTicketNumber').mockResolvedValue('TK-0001');
    vi.mocked(prisma.ticket.create).mockResolvedValue({ id: 1, ticketNumber: 'TK-0001' } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(prisma));
  });

  afterEach(() => {
    delete process.env.UPLOADS_DIR;
    fs.rmSync(uploadsDirectory, { recursive: true, force: true });
  });

  it('returns 401 before ticket validation when no session exists', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .set('Origin', origin)
      .send(validBody());

    expect(response.status).toBe(401);
    expect(prisma.category.findUnique).not.toHaveBeenCalled();
  });

  it('returns 403 for authenticated Staff and rejects an untrusted Origin', async () => {
    vi.mocked(prisma.userSession.findUnique).mockResolvedValueOnce(session('IT_STAFF') as never);
    const wrongRole = await request(app)
      .post('/api/tickets')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send(validBody());

    vi.mocked(prisma.userSession.findUnique).mockResolvedValueOnce(session() as never);
    const csrf = await request(app)
      .post('/api/tickets')
      .set('Cookie', cookie)
      .send(validBody());

    expect(wrongRole.status).toBe(403);
    expect(csrf.status).toBe(403);
    expect(csrf.body.error.code).toBe('CSRF_ORIGIN_INVALID');
    expect(prisma.ticket.create).not.toHaveBeenCalled();
  });

  it('validates required and boundary fields before reference queries', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.fields).toEqual(expect.objectContaining({
      categoryId: expect.any(String),
      summary: expect.any(String),
    }));
    expect(response.body.details.map((detail: { field: string }) => detail.field)).toEqual(
      expect.arrayContaining(['categoryId', 'summary', 'description', 'requestedPriority']),
    );
    expect(response.body.details).not.toContainEqual(expect.objectContaining({ field: 'requesterId' }));
    expect(prisma.category.findUnique).not.toHaveBeenCalled();
  });

  it('creates with the session user and ignores a tampered requesterId', async () => {
    const created = {
      id: 1,
      ticketNumber: 'TK-0001',
      requester: { id: 7, name: 'Somchai', email: 'somchai@example.com', role: 'REQUESTER' },
      currentStatus: 'NEW',
      requestedPriority: 'HIGH',
      itPriority: 'HIGH',
    };
    vi.mocked(prisma.ticket.create).mockResolvedValue(created as never);

    const response = await request(app)
      .post('/api/tickets')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send(validBody({ requesterId: 999 }));

    expect(response.status).toBe(201);
    expect(response.body.data.requester.id).toBe(7);
    expect(prisma.ticket.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        requesterId: 7,
        requestedPriority: 'HIGH',
        itPriority: 'HIGH',
        currentStatus: 'NEW',
      }),
    }));
    expect(JSON.stringify(vi.mocked(prisma.ticket.create).mock.calls[0][0])).not.toContain('999');
  });

  it.each(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])('accepts requested priority %s', async requestedPriority => {
    const response = await request(app)
      .post('/api/tickets')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send(validBody({ requestedPriority }));

    expect(response.status).toBe(201);
    expect(prisma.ticket.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ requestedPriority, itPriority: requestedPriority }),
    }));
  });

  it('rejects missing or inactive reference data', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue({ id: 1, name: 'Network', isActive: false } as never);
    vi.mocked(prisma.relatedSystem.findUnique).mockResolvedValue(null as never);

    const response = await request(app)
      .post('/api/tickets')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send(validBody());

    expect(response.status).toBe(400);
    expect(response.body.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'categoryId' }),
      expect.objectContaining({ field: 'relatedSystemId' }),
    ]));
    expect(prisma.ticket.create).not.toHaveBeenCalled();
  });

  it('preserves multipart attachment behavior without accepting requester identity', async () => {
    vi.mocked(prisma.ticket.create).mockResolvedValue({
      id: 1,
      ticketNumber: 'TK-0001',
      attachments: [{ id: 4, originalName: 'evidence.png', isRemoved: false }],
    } as never);

    const response = await request(app)
      .post('/api/tickets')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .field('requesterId', '999')
      .field('categoryId', '1')
      .field('summary', 'VPN access unavailable')
      .field('description', 'VPN disconnects after login.')
      .field('requestedPriority', 'HIGH')
      .attach('attachments', Buffer.from('image'), { filename: 'evidence.png', contentType: 'image/png' });

    expect(response.status).toBe(201);
    expect(prisma.ticket.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        requesterId: 7,
        attachments: { create: [expect.objectContaining({ originalName: 'evidence.png' })] },
      }),
    }));
  });

  it('rejects invalid or oversized attachments before database writes', async () => {
    const invalid = await request(app)
      .post('/api/tickets')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .field('categoryId', '1')
      .field('summary', 'VPN access unavailable')
      .field('description', 'VPN disconnects after login.')
      .field('requestedPriority', 'HIGH')
      .attach('attachments', Buffer.from('bad'), { filename: 'bad.txt', contentType: 'text/plain' });

    const oversized = await request(app)
      .post('/api/tickets')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .attach('attachments', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'large.pdf', contentType: 'application/pdf',
      });

    expect(invalid.status).toBe(400);
    expect(invalid.body.details[0].field).toBe('attachments');
    expect(oversized.status).toBe(400);
    expect(oversized.body.details[0].message).toContain('5 MB');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    ticket: {
      findUnique: vi.fn(),
    },
    requesterUser: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Tickets API - GET /api/tickets/:id', () => {
  const ticket = {
    id: 8,
    ticketNumber: 'TK-0008',
    summary: 'VPN access unavailable',
    description: 'VPN disconnects after login.\n\nPlease check my profile.',
    requestedPriority: 'HIGH',
    currentStatus: 'NEW',
    ticketDate: new Date('2026-09-05T08:30:00.000Z'),
    category: { id: 2, name: 'Network' },
    relatedSystem: { id: 3, name: 'VPN Gateway' },
    requester: { id: 7, name: 'Somchai Prasert', email: 'somchai@example.com' },
    attachments: [
      {
        id: 11,
        originalName: 'vpn-error.png',
        mimeType: 'image/png',
        sizeBytes: 204800,
        isRemoved: false,
        removalReason: null,
        removedAt: null,
        createdAt: new Date('2026-09-05T08:35:00.000Z'),
      },
      {
        id: 12,
        originalName: 'old-log.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        isRemoved: true,
        removalReason: 'Contains outdated information',
        removedAt: new Date('2026-09-05T09:00:00.000Z'),
        createdAt: new Date('2026-09-05T08:40:00.000Z'),
      },
    ],
    createdAt: new Date('2026-09-05T08:30:00.000Z'),
    updatedAt: new Date('2026-09-05T09:00:00.000Z'),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.requesterUser.findUnique).mockResolvedValue({ id: 7, isActive: true } as never);
    vi.mocked(prisma.ticket.findUnique)
      .mockResolvedValueOnce({ id: 8, requesterId: 7 } as never)
      .mockResolvedValue(ticket as never);
  });

  it('returns the complete owned ticket and attachment metadata (API-27, API-31)', async () => {
    const response = await request(app).get('/api/tickets/8?requesterId=7');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: 8,
      ticketNumber: 'TK-0008',
      summary: 'VPN access unavailable',
      description: 'VPN disconnects after login.\n\nPlease check my profile.',
      requestedPriority: 'HIGH',
      currentStatus: 'NEW',
      ticketDate: '2026-09-05T08:30:00.000Z',
      category: { id: 2, name: 'Network' },
      relatedSystem: { id: 3, name: 'VPN Gateway' },
      requester: { id: 7, name: 'Somchai Prasert', email: 'somchai@example.com' },
      createdAt: '2026-09-05T08:30:00.000Z',
      updatedAt: '2026-09-05T09:00:00.000Z',
    });
    expect(response.body.data).not.toHaveProperty('requesterId');
    expect(response.body.data.attachments).toEqual([
      expect.objectContaining({ id: 11, originalName: 'vpn-error.png', isRemoved: false }),
      expect.objectContaining({
        id: 12,
        originalName: 'old-log.pdf',
        isRemoved: true,
        removalReason: 'Contains outdated information',
        removedAt: '2026-09-05T09:00:00.000Z',
      }),
    ]);
    expect(prisma.ticket.findUnique).toHaveBeenNthCalledWith(1, {
      where: { id: 8 },
      select: { id: true, requesterId: true },
    });
    expect(prisma.ticket.findUnique).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { id: 8 },
      select: expect.objectContaining({
        description: true,
        requester: { select: { id: true, name: true, email: true } },
        attachments: expect.objectContaining({
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        }),
      }),
    }));
  });

  it('returns null for an optional related system', async () => {
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
      ...ticket,
      relatedSystem: null,
    } as never);

    const response = await request(app).get('/api/tickets/8?requesterId=7');

    expect(response.status).toBe(200);
    expect(response.body.data.relatedSystem).toBeNull();
  });

  it.each([
    ['missing requesterId (API-28)', '/api/tickets/8'],
    ['invalid requesterId', '/api/tickets/8?requesterId=0'],
    ['fractional requesterId', '/api/tickets/8?requesterId=1.5'],
    ['requesterId beyond database range', '/api/tickets/8?requesterId=2147483648'],
    ['repeated requesterId', '/api/tickets/8?requesterId=7&requesterId=8'],
    ['invalid ticket id', '/api/tickets/not-a-number?requesterId=7'],
    ['non-positive ticket id', '/api/tickets/0?requesterId=7'],
    ['ticket id beyond database range', '/api/tickets/2147483648?requesterId=7'],
  ])('returns the common 400 response for %s', async (_label, url) => {
    const response = await request(app).get(url);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
    expect(response.body.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: expect.any(String), message: expect.any(String) }),
    ]));
    expect(prisma.ticket.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ['does not exist', null],
    ['is inactive', { id: 999, isActive: false }],
  ])('returns 400 when requester %s', async (_label, requesterResult) => {
    vi.mocked(prisma.requesterUser.findUnique).mockResolvedValue(requesterResult as never);

    const response = await request(app).get('/api/tickets/8?requesterId=999');

    expect(response.status).toBe(400);
    expect(response.body.details).toContainEqual({
      field: 'requesterId',
      message: 'Requester not found or is inactive',
    });
    expect(prisma.ticket.findUnique).not.toHaveBeenCalled();
  });

  it('returns 403 without ticket data when another requester owns the ticket (API-29)', async () => {
    vi.mocked(prisma.requesterUser.findUnique).mockResolvedValue({ id: 9, isActive: true } as never);
    vi.mocked(prisma.ticket.findUnique).mockReset();
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue({ id: 8, requesterId: 7 } as never);

    const response = await request(app).get('/api/tickets/8?requesterId=9');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'You do not have access to this ticket' });
    expect(JSON.stringify(response.body)).not.toContain('TK-0008');
    expect(JSON.stringify(response.body)).not.toContain('VPN access unavailable');
    expect(prisma.ticket.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.ticket.findUnique).toHaveBeenCalledWith({
      where: { id: 8 },
      select: { id: true, requesterId: true },
    });
  });

  it('returns 404 when the ticket does not exist (API-30)', async () => {
    vi.mocked(prisma.ticket.findUnique).mockReset();
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue(null);

    const response = await request(app).get('/api/tickets/999?requesterId=7');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Ticket not found' });
    expect(prisma.ticket.findUnique).toHaveBeenCalledTimes(1);
  });

  it('returns the common 500 response for an unexpected database failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(prisma.ticket.findUnique).mockReset();
    vi.mocked(prisma.ticket.findUnique)
      .mockResolvedValueOnce({ id: 8, requesterId: 7 } as never)
      .mockRejectedValue(new Error('database unavailable'));

    const response = await request(app).get('/api/tickets/8?requesterId=7');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal server error' });
  });
});

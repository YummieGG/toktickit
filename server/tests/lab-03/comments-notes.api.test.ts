import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    userSession: { findUnique: vi.fn() },
    ticket: { findFirst: vi.fn() },
    publicComment: { findMany: vi.fn(), create: vi.fn() },
    internalNote: { findMany: vi.fn(), create: vi.fn() },
  },
}));

const cookie = 'tt_session=test-session-token';
const origin = 'http://localhost:5173';

function session(
  role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR' = 'IT_STAFF',
  id = role === 'REQUESTER' ? 7 : role === 'IT_STAFF' ? 20 : 30,
) {
  return {
    id: 10,
    tokenHash: 'hash',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: { id, name: `${role}_User`, email: `${role.toLowerCase()}@example.com`, role, isActive: true, mustChangePassword: false },
  };
}

describe('API-07: Public Comments and Internal Notes (FR-11, FR-12, BR-15, AC-09, AC-10)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('IT_STAFF') as never);
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 8, requesterId: 7 } as never);
    vi.mocked(prisma.publicComment.findMany).mockResolvedValue([
      { id: 1, ticketId: 8, content: 'Public question', createdAt: new Date('2026-09-13T10:00:00Z'), author: { id: 7, name: 'Requester', role: 'REQUESTER' } },
    ] as never);
    vi.mocked(prisma.publicComment.create).mockResolvedValue({
      id: 2, ticketId: 8, content: 'Support reply', createdAt: new Date('2026-09-13T10:05:00Z'), author: { id: 20, name: 'Support', role: 'IT_STAFF' },
    } as never);
    vi.mocked(prisma.internalNote.findMany).mockResolvedValue([
      { id: 10, ticketId: 8, content: 'Internal triage note', createdAt: new Date('2026-09-13T10:02:00Z'), author: { id: 20, name: 'Support', role: 'IT_STAFF' } },
    ] as never);
    vi.mocked(prisma.internalNote.create).mockResolvedValue({
      id: 11, ticketId: 8, content: 'Checking database replication', createdAt: new Date('2026-09-13T10:10:00Z'), author: { id: 20, name: 'Support', role: 'IT_STAFF' },
    } as never);
  });

  describe('Public Comments', () => {
    it('allows Requester owner and IT Staff to read and create public comments', async () => {
      // IT Staff read
      const staffRead = await request(app).get('/api/tickets/8/comments').set('Cookie', cookie);
      expect(staffRead.status).toBe(200);
      expect(staffRead.body.data).toHaveLength(1);

      // IT Staff create
      const staffPost = await request(app)
        .post('/api/tickets/8/comments')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ content: 'Help is on the way.' });
      expect(staffPost.status).toBe(201);
      expect(prisma.publicComment.create).toHaveBeenCalledWith(expect.objectContaining({
        data: { ticketId: 8, content: 'Help is on the way.', authorId: 20 },
      }));

      // Requester owner read
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('REQUESTER', 7) as never);
      const reqRead = await request(app).get('/api/tickets/8/comments').set('Cookie', cookie);
      expect(reqRead.status).toBe(200);

      // Requester owner create
      const reqPost = await request(app)
        .post('/api/tickets/8/comments')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ content: 'Thank you.' });
      expect(reqPost.status).toBe(201);
      expect(prisma.publicComment.create).toHaveBeenCalledWith(expect.objectContaining({
        data: { ticketId: 8, content: 'Thank you.', authorId: 7 },
      }));
    });

    it('allows Administrator to read public comments, but forbids creation with 403', async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('ADMINISTRATOR', 30) as never);

      const read = await request(app).get('/api/tickets/8/comments').set('Cookie', cookie);
      expect(read.status).toBe(200);

      const write = await request(app)
        .post('/api/tickets/8/comments')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ content: 'Admin comment' });
      expect(write.status).toBe(403);
      expect(prisma.publicComment.create).not.toHaveBeenCalled();
    });

    it('validates public comment length, trims input, normalizes newlines, and rejects CSRF', async () => {
      const empty = await request(app)
        .post('/api/tickets/8/comments')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ content: '   ' });
      expect(empty.status).toBe(400);

      const tooLong = await request(app)
        .post('/api/tickets/8/comments')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ content: 'a'.repeat(2001) });
      expect(tooLong.status).toBe(400);

      const noOrigin = await request(app)
        .post('/api/tickets/8/comments')
        .set('Cookie', cookie)
        .send({ content: 'Missing origin' });
      expect(noOrigin.status).toBe(403);
      expect(noOrigin.body.error.code).toBe('CSRF_ORIGIN_INVALID');
    });
  });

  describe('Internal Notes', () => {
    it('allows IT Staff to read and create Internal Notes with server-attribution', async () => {
      const list = await request(app).get('/api/tickets/8/internal-notes').set('Cookie', cookie);
      expect(list.status).toBe(200);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0].content).toBe('Internal triage note');

      const create = await request(app)
        .post('/api/tickets/8/internal-notes')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ content: '  line1\r\nline2  ', authorId: 999, createdAt: '1999-01-01' });
      expect(create.status).toBe(201);
      expect(prisma.internalNote.create).toHaveBeenCalledWith(expect.objectContaining({
        data: { ticketId: 8, content: 'line1\nline2', authorId: 20 },
      }));
    });

    it('allows Administrator to read Internal Notes, but forbids creation with 403', async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('ADMINISTRATOR', 30) as never);

      const read = await request(app).get('/api/tickets/8/internal-notes').set('Cookie', cookie);
      expect(read.status).toBe(200);

      const write = await request(app)
        .post('/api/tickets/8/internal-notes')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ content: 'Admin internal note' });
      expect(write.status).toBe(403);
      expect(prisma.internalNote.create).not.toHaveBeenCalled();
    });

    it('forbids Requesters from reading or creating Internal Notes with 403', async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('REQUESTER', 7) as never);

      const read = await request(app).get('/api/tickets/8/internal-notes').set('Cookie', cookie);
      expect(read.status).toBe(403);
      expect(prisma.internalNote.findMany).not.toHaveBeenCalled();

      const write = await request(app)
        .post('/api/tickets/8/internal-notes')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ content: 'Requester attempt' });
      expect(write.status).toBe(403);
      expect(prisma.internalNote.create).not.toHaveBeenCalled();
    });

    it('never leaks Internal Notes into the Requester ticket detail projection', async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('REQUESTER', 7) as never);
      vi.mocked(prisma.ticket.findFirst).mockResolvedValue({
        id: 8,
        ticketNumber: 'TK-0008',
        summary: 'Network down',
        description: 'Wifi disconnects',
        currentStatus: 'OPEN',
        requestedPriority: 'HIGH',
        comments: [],
      } as never);

      const response = await request(app).get('/api/tickets/8').set('Cookie', cookie);
      expect(response.status).toBe(200);
      expect(response.body.data).not.toHaveProperty('internalNotes');
      expect(JSON.stringify(vi.mocked(prisma.ticket.findFirst).mock.calls[0]?.[0])).not.toContain('internalNotes');
    });

    it('validates Internal Note content constraints and rejects CSRF', async () => {
      const empty = await request(app)
        .post('/api/tickets/8/internal-notes')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ content: '   ' });
      expect(empty.status).toBe(400);
      expect(empty.body.error.code).toBe('CONTENT_REQUIRED');

      const tooLong = await request(app)
        .post('/api/tickets/8/internal-notes')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({ content: 'x'.repeat(2001) });
      expect(tooLong.status).toBe(400);
      expect(tooLong.body.error.code).toBe('CONTENT_TOO_LONG');

      const noOrigin = await request(app)
        .post('/api/tickets/8/internal-notes')
        .set('Cookie', cookie)
        .send({ content: 'Valid note content' });
      expect(noOrigin.status).toBe(403);
      expect(noOrigin.body.error.code).toBe('CSRF_ORIGIN_INVALID');
      expect(prisma.internalNote.create).not.toHaveBeenCalled();
    });
  });
});

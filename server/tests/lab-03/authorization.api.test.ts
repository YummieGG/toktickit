import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    userSession: { findUnique: vi.fn() },
    ticket: { findFirst: vi.fn(), updateMany: vi.fn() },
    publicComment: { findMany: vi.fn(), create: vi.fn() },
    attachment: {
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const cookie = 'tt_session=test-session-token';
const origin = 'http://localhost:5173';

function session(role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR' = 'REQUESTER', id = 7) {
  return {
    id: 10,
    tokenHash: 'hash',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: {
      id, name: 'Somchai', email: 'somchai@example.com', role,
      isActive: true, mustChangePassword: false,
    },
  };
}

describe('Lab 3 requester authorization, comments, and resolution (API-05)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session() as never);
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 8 } as never);
    vi.mocked(prisma.publicComment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.publicComment.create).mockResolvedValue({
      id: 1,
      ticketId: 8,
      content: 'Please retry.\nIt should work now.',
      createdAt: new Date('2026-09-12T03:00:00.000Z'),
      author: { id: 7, name: 'Somchai', role: 'REQUESTER' },
    } as never);
    vi.mocked(prisma.ticket.updateMany).mockResolvedValue({ count: 1 } as never);
  });

  it('protects public comments and scopes Requester reads to the session owner', async () => {
    const unauthenticated = await request(app).get('/api/tickets/8/comments');

    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session() as never);
    const owned = await request(app)
      .get('/api/tickets/8/comments?requesterId=999')
      .set('Cookie', cookie);

    expect(unauthenticated.status).toBe(401);
    expect(owned.status).toBe(200);
    expect(prisma.ticket.findFirst).toHaveBeenCalledWith({
      where: { id: 8, requesterId: 7 },
      select: { id: true },
    });
    expect(prisma.publicComment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ticketId: 8 } }));
  });

  it.each([
    '/api/tickets',
    '/api/tickets/8',
    '/api/attachments/11',
    '/api/categories',
  ])('blocks normal application API %s until the mandatory password change succeeds', async url => {
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue({
      ...session(),
      user: { ...session().user, mustChangePassword: true },
    } as never);

    const response = await request(app).get(url).set('Cookie', cookie);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: {
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Change your password before continuing',
      },
    });
  });

  it('returns the same safe 404 for missing and cross-owner comment resources', async () => {
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue(null as never);

    const response = await request(app)
      .get('/api/tickets/8/comments?requesterId=999')
      .set('Cookie', cookie);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
    expect(prisma.publicComment.findMany).not.toHaveBeenCalled();
  });

  it.each(['IT_STAFF', 'ADMINISTRATOR'] as const)('allows %s to read comments on any ticket', async role => {
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session(role, 20) as never);

    const response = await request(app).get('/api/tickets/8/comments').set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(prisma.ticket.findFirst).toHaveBeenCalledWith({ where: { id: 8 }, select: { id: true } });
  });

  it.each([
    ['REQUESTER', 7, { id: 8, requesterId: 7 }],
    ['IT_STAFF', 20, { id: 8 }],
  ] as const)('lets %s append a normalized, server-attributed public comment', async (role, id, where) => {
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session(role, id) as never);

    const response = await request(app)
      .post('/api/tickets/8/comments')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({
        content: '  Please retry.\r\nIt should work now.  ',
        requesterId: 999,
        authorId: 999,
        createdAt: '2000-01-01T00:00:00.000Z',
      });

    expect(response.status).toBe(201);
    expect(prisma.ticket.findFirst).toHaveBeenCalledWith({ where, select: { id: true } });
    expect(prisma.publicComment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: { ticketId: 8, content: 'Please retry.\nIt should work now.', authorId: id },
    }));
    expect(JSON.stringify(vi.mocked(prisma.publicComment.create).mock.calls[0][0])).not.toContain('2000-01-01');
  });

  it('forbids Administrator comment creation before ticket lookup', async () => {
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('ADMINISTRATOR', 30) as never);

    const response = await request(app)
      .post('/api/tickets/8/comments')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ content: 'Read-only account' });

    expect(response.status).toBe(403);
    expect(prisma.ticket.findFirst).not.toHaveBeenCalled();
    expect(prisma.publicComment.create).not.toHaveBeenCalled();
  });

  it('validates comment length after trimming', async () => {
    const empty = await request(app)
      .post('/api/tickets/8/comments')
      .set('Cookie', cookie).set('Origin', origin)
      .send({ content: '   ' });
    const long = await request(app)
      .post('/api/tickets/8/comments')
      .set('Cookie', cookie).set('Origin', origin)
      .send({ content: 'x'.repeat(2001) });

    expect(empty.status).toBe(400);
    expect(long.status).toBe(400);
    expect(prisma.publicComment.create).not.toHaveBeenCalled();
  });

  it('sets a server resolution timestamp without changing formal status or trusting requesterId', async () => {
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 8, problemAppearsResolvedAt: null } as never);

    const before = Date.now();
    const response = await request(app)
      .post('/api/tickets/8/problem-appears-resolved')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ requesterId: 999, problemAppearsResolvedAt: '2000-01-01T00:00:00.000Z', currentStatus: 'RESOLVED' });
    const after = Date.now();

    expect(response.status).toBe(200);
    const timestamp = new Date(response.body.data.problemAppearsResolvedAt).getTime();
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
    expect(prisma.ticket.updateMany).toHaveBeenCalledWith({
      where: { id: 8, requesterId: 7, problemAppearsResolvedAt: null },
      data: { problemAppearsResolvedAt: expect.any(Date) },
    });
    const update = vi.mocked(prisma.ticket.updateMany).mock.calls[0][0];
    expect(update.data).not.toHaveProperty('currentStatus');
  });

  it('is idempotent and returns the original persisted timestamp without an update', async () => {
    const original = new Date('2026-09-12T03:00:00.000Z');
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 8, problemAppearsResolvedAt: original } as never);

    const response = await request(app)
      .post('/api/tickets/8/problem-appears-resolved')
      .set('Cookie', cookie)
      .set('Origin', origin);

    expect(response.status).toBe(200);
    expect(response.body.data.problemAppearsResolvedAt).toBe(original.toISOString());
    expect(prisma.ticket.updateMany).not.toHaveBeenCalled();
  });

  it.each(['IT_STAFF', 'ADMINISTRATOR'] as const)('forbids %s from submitting requester resolution', async role => {
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session(role, 20) as never);

    const response = await request(app)
      .post('/api/tickets/8/problem-appears-resolved')
      .set('Cookie', cookie)
      .set('Origin', origin);

    expect(response.status).toBe(403);
    expect(prisma.ticket.findFirst).not.toHaveBeenCalled();
  });

  it('returns safe 404 when a Requester resolves another owner ticket', async () => {
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue(null as never);

    const response = await request(app)
      .post('/api/tickets/8/problem-appears-resolved')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ requesterId: 999 });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(prisma.ticket.updateMany).not.toHaveBeenCalled();
  });

  it.each(['CLOSED', 'CANCELLED'] as const)(
    'rejects problem-appears-resolved when ticket is already %s',
    async status => {
      vi.mocked(prisma.ticket.findFirst).mockResolvedValue({
        id: 8,
        currentStatus: status,
        problemAppearsResolvedAt: null,
      } as never);

      const response = await request(app)
        .post('/api/tickets/8/problem-appears-resolved')
        .set('Cookie', cookie)
        .set('Origin', origin);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(prisma.ticket.updateMany).not.toHaveBeenCalled();
    },
  );

  it.each(['IT_STAFF', 'ADMINISTRATOR'] as const)(
    'forbids %s from creating or listing tickets on requester endpoints',
    async role => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session(role, 30) as never);

      const postRes = await request(app)
        .post('/api/tickets')
        .set('Cookie', cookie)
        .set('Origin', origin)
        .send({
          categoryId: 1,
          requestedPriority: 'HIGH',
          summary: 'Admin cannot create requester ticket',
          description: 'This operation must return 403 forbidden.',
        });
      const getRes = await request(app).get('/api/tickets').set('Cookie', cookie);

      expect(postRes.status).toBe(403);
      expect(postRes.body.error.code).toBe('FORBIDDEN');
      expect(getRes.status).toBe(403);
      expect(getRes.body.error.code).toBe('FORBIDDEN');
    },
  );

  it('fails closed and returns 403 on GET /api/tickets/:id for unknown or disallowed role', async () => {
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue({
      ...session(),
      user: { ...session().user, role: 'UNKNOWN_ROLE' as any },
    } as never);

    const response = await request(app).get('/api/tickets/8').set('Cookie', cookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(prisma.ticket.findFirst).not.toHaveBeenCalled();
  });
});

describe('Attachment authorization and metadata-only policy (API-06)', () => {
  let uploadsDirectory: string;

  const sampleAttachment = {
    id: 11,
    originalName: 'evidence.png',
    storedName: '11111111-1111-4111-8111-111111111111.png',
    mimeType: 'image/png',
    sizeBytes: 8,
    isRemoved: false,
    removalReason: null,
    removedAt: null,
    createdAt: new Date('2026-09-05T08:35:00.000Z'),
    ticketId: 8,
    ticket: { requesterId: 7 },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    uploadsDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'toktickit-auth-att-'));
    process.env.UPLOADS_DIR = uploadsDirectory;
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session() as never);
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 8 } as never);
    vi.mocked(prisma.attachment.findFirst).mockResolvedValue(sampleAttachment as never);
    vi.mocked(prisma.attachment.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.attachment.create).mockImplementation(async ({ data }: any) => ({
      id: 21, ...data, createdAt: new Date('2026-09-06T08:00:00.000Z'),
    }));
    vi.mocked(prisma.attachment.update).mockResolvedValue({} as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(prisma));
  });

  afterEach(() => {
    delete process.env.UPLOADS_DIR;
    fs.rmSync(uploadsDirectory, { recursive: true, force: true });
  });

  it.each([
    ['REQUESTER', 7, { id: 11, ticket: { requesterId: 7 } }],
    ['IT_STAFF', 20, { id: 11 }],
    ['ADMINISTRATOR', 30, { id: 11 }],
  ] as const)('allows %s to read metadata projection without file bytes or ticket leak', async (role, id, where) => {
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session(role, id) as never);

    const response = await request(app)
      .get('/api/attachments/11?requesterId=999')
      .set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      id: 11,
      originalName: 'evidence.png',
      storedName: sampleAttachment.storedName,
      mimeType: 'image/png',
      sizeBytes: 8,
      isRemoved: false,
      createdAt: '2026-09-05T08:35:00.000Z',
      ticketId: 8,
    });
    expect(response.body.data).not.toHaveProperty('ticket');
    expect(prisma.attachment.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where }));
  });

  it('returns safe 404 for cross-owner attachment metadata access', async () => {
    vi.mocked(prisma.attachment.findFirst).mockResolvedValue(null as never);

    const response = await request(app).get('/api/attachments/11').set('Cookie', cookie);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
  });

  it('allows Requester owner and Staff to download active file, but forbids Administrator with 403', async () => {
    fs.writeFileSync(path.join(uploadsDirectory, sampleAttachment.storedName), Buffer.from('png-bytes'));

    const requesterDownload = await request(app)
      .get('/api/attachments/11/download')
      .set('Cookie', cookie);

    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('IT_STAFF', 20) as never);
    const staffDownload = await request(app)
      .get('/api/attachments/11/download')
      .set('Cookie', cookie);

    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('ADMINISTRATOR', 30) as never);
    const adminDownload = await request(app)
      .get('/api/attachments/11/download')
      .set('Cookie', cookie);

    expect(requesterDownload.status).toBe(200);
    expect(requesterDownload.body).toEqual(Buffer.from('png-bytes'));
    expect(staffDownload.status).toBe(200);
    expect(adminDownload.status).toBe(403);
  });

  it('blocks removed files from download with 400', async () => {
    vi.mocked(prisma.attachment.findFirst).mockResolvedValue({
      ...sampleAttachment,
      isRemoved: true,
      removalReason: 'Outdated',
      removedAt: new Date(),
    } as never);

    const response = await request(app)
      .get('/api/attachments/11/download')
      .set('Cookie', cookie);

    expect(response.status).toBe(400);
    expect(response.body.details[0].message).toContain('cannot be downloaded');
  });

  it('allows Requester owner to soft-remove attachment, but forbids IT Staff and Administrator with 403', async () => {
    const requesterRemove = await request(app)
      .patch('/api/attachments/11/remove')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ removalReason: 'Outdated screenshot' });

    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('IT_STAFF', 20) as never);
    const staffRemove = await request(app)
      .patch('/api/attachments/11/remove')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ removalReason: 'Staff remove' });

    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('ADMINISTRATOR', 30) as never);
    const adminRemove = await request(app)
      .patch('/api/attachments/11/remove')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ removalReason: 'Admin remove' });

    expect(requesterRemove.status).toBe(204);
    expect(staffRemove.status).toBe(403);
    expect(adminRemove.status).toBe(403);
  });

  it('forbids IT Staff and Administrator from uploading attachments with 403', async () => {
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('IT_STAFF', 20) as never);
    const staffUpload = await request(app)
      .post('/api/tickets/8/attachments')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .attach('file', Buffer.from('data'), { filename: 'file.png', contentType: 'image/png' });

    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('ADMINISTRATOR', 30) as never);
    const adminUpload = await request(app)
      .post('/api/tickets/8/attachments')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .attach('file', Buffer.from('data'), { filename: 'file.png', contentType: 'image/png' });

    expect(staffUpload.status).toBe(403);
    expect(adminUpload.status).toBe(403);
  });
});

describe('Direct API access and CSRF protection (SEC-01)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session() as never);
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 8 } as never);
  });

  it.each([
    ['GET', '/api/tickets'],
    ['GET', '/api/tickets/8'],
    ['POST', '/api/tickets'],
    ['GET', '/api/attachments/11'],
    ['GET', '/api/attachments/11/download'],
    ['PATCH', '/api/attachments/11/remove'],
    ['GET', '/api/tickets/8/comments'],
    ['POST', '/api/tickets/8/comments'],
    ['POST', '/api/tickets/8/problem-appears-resolved'],
    ['GET', '/api/categories'],
    ['GET', '/api/related-systems'],
  ])('returns safe 401 UNAUTHENTICATED for unauthenticated %s %s', async (method, path) => {
    const req = method === 'GET' ? request(app).get(path)
      : method === 'POST' ? request(app).post(path).set('Origin', origin)
      : request(app).patch(path).set('Origin', origin);

    const response = await req;
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it.each([
    ['POST', '/api/tickets'],
    ['POST', '/api/tickets/8/comments'],
    ['POST', '/api/tickets/8/problem-appears-resolved'],
    ['PATCH', '/api/attachments/11/remove'],
  ])('rejects %s %s without trusted Origin with 403 CSRF_ORIGIN_INVALID', async (method, path) => {
    const req = method === 'POST' ? request(app).post(path) : request(app).patch(path);
    const response = await req.set('Cookie', cookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('CSRF_ORIGIN_INVALID');
  });
});

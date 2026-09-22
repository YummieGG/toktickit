import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => {
  const prismaMock = {
    userSession: { findUnique: vi.fn() },
    ticket: { findFirst: vi.fn() },
    attachment: {
      findFirst: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { prisma: prismaMock };
});

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

const activeAttachment = {
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

describe('Attachment lifecycle API', () => {
  let uploadsDirectory: string;

  beforeEach(() => {
    vi.resetAllMocks();
    uploadsDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'toktickit-attachments-'));
    process.env.UPLOADS_DIR = uploadsDirectory;
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session() as never);
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 8 } as never);
    vi.mocked(prisma.attachment.findFirst).mockResolvedValue(activeAttachment as never);
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

  it('returns 401 before multipart processing without a session', async () => {
    const response = await request(app)
      .post('/api/tickets/8/attachments')
      .set('Origin', origin)
      .attach('file', Buffer.from('not parsed'), { filename: 'file.png', contentType: 'image/png' });

    expect(response.status).toBe(401);
    expect(prisma.ticket.findFirst).not.toHaveBeenCalled();
  });

  it.each(['IT_STAFF', 'ADMINISTRATOR'] as const)('returns 403 when %s tries to upload', async role => {
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session(role, 20) as never);

    const response = await request(app)
      .post('/api/tickets/8/attachments')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .attach('file', Buffer.from('image'), { filename: 'file.png', contentType: 'image/png' });

    expect(response.status).toBe(403);
    expect(fs.readdirSync(uploadsDirectory)).toHaveLength(0);
  });

  it('uploads one valid owned file and ignores tampered requesterId input', async () => {
    const response = await request(app)
      .post('/api/tickets/8/attachments?requesterId=999')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .field('requesterId', '999')
      .attach('file', Buffer.from('png-data'), { filename: 'Evidence.PNG', contentType: 'image/png' });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      id: 21, originalName: 'Evidence.PNG', mimeType: 'image/png',
      sizeBytes: 8, isRemoved: false, ticketId: 8,
    });
    expect(prisma.ticket.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 8, requesterId: 7 },
    }));
    expect(response.body.data.storedName).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(fs.readFileSync(path.join(uploadsDirectory, response.body.data.storedName))).toEqual(Buffer.from('png-data'));
  });

  it('returns safe 404 for a ticket outside the requester scope', async () => {
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue(null as never);

    const response = await request(app)
      .post('/api/tickets/8/attachments')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .attach('file', Buffer.from('png'), { filename: 'file.png', contentType: 'image/png' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(fs.readdirSync(uploadsDirectory)).toHaveLength(0);
  });

  it('enforces file type, size, and five-active attachment limits', async () => {
    const invalidType = await request(app)
      .post('/api/tickets/8/attachments')
      .set('Cookie', cookie).set('Origin', origin)
      .attach('file', Buffer.from('bad'), { filename: 'bad.txt', contentType: 'text/plain' });

    const oversized = await request(app)
      .post('/api/tickets/8/attachments')
      .set('Cookie', cookie).set('Origin', origin)
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'large.pdf', contentType: 'application/pdf' });

    vi.mocked(prisma.attachment.count).mockResolvedValue(5 as never);
    const atLimit = await request(app)
      .post('/api/tickets/8/attachments')
      .set('Cookie', cookie).set('Origin', origin)
      .attach('file', Buffer.from('png'), { filename: 'file.png', contentType: 'image/png' });

    expect(invalidType.status).toBe(400);
    expect(oversized.status).toBe(400);
    expect(oversized.body.details[0].message).toContain('5 MB');
    expect(atLimit.status).toBe(400);
    expect(atLimit.body.details[0].message).toContain('5 active attachments');
  });

  it.each(['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'] as const)('allows %s to read permitted metadata', async role => {
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session(role, role === 'REQUESTER' ? 7 : 20) as never);

    const response = await request(app)
      .get('/api/attachments/11?requesterId=999')
      .set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      id: 11,
      originalName: 'evidence.png',
      storedName: activeAttachment.storedName,
      mimeType: 'image/png',
      sizeBytes: 8,
      isRemoved: false,
      createdAt: '2026-09-05T08:35:00.000Z',
      ticketId: 8,
    });
    expect(response.body.data).not.toHaveProperty('ticket');
    expect(prisma.attachment.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: role === 'REQUESTER' ? { id: 11, ticket: { requesterId: 7 } } : { id: 11 },
    }));
  });

  it('returns safe 404 for a cross-owner attachment', async () => {
    vi.mocked(prisma.attachment.findFirst).mockResolvedValue(null as never);

    const response = await request(app).get('/api/attachments/11').set('Cookie', cookie);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('allows requester and Staff downloads but forbids Administrator', async () => {
    fs.writeFileSync(path.join(uploadsDirectory, activeAttachment.storedName), Buffer.from('png-data'));

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
    expect(requesterDownload.body).toEqual(Buffer.from('png-data'));
    expect(staffDownload.status).toBe(200);
    expect(adminDownload.status).toBe(403);
  });

  it('blocks removed or missing files from download', async () => {
    vi.mocked(prisma.attachment.findFirst).mockResolvedValueOnce({ ...activeAttachment, isRemoved: true } as never);
    const removed = await request(app).get('/api/attachments/11/download').set('Cookie', cookie);

    vi.mocked(prisma.attachment.findFirst).mockResolvedValueOnce(activeAttachment as never);
    const missing = await request(app).get('/api/attachments/11/download').set('Cookie', cookie);

    expect(removed.status).toBe(400);
    expect(removed.body.details[0].message).toContain('cannot be downloaded');
    expect(missing.status).toBe(404);
  });

  it('soft-removes an owned attachment with 204 and keeps the physical file', async () => {
    const filePath = path.join(uploadsDirectory, activeAttachment.storedName);
    fs.writeFileSync(filePath, Buffer.from('retained'));

    const response = await request(app)
      .patch('/api/attachments/11/remove')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ requesterId: 999, removalReason: '  Outdated evidence  ' });

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(prisma.attachment.update).toHaveBeenCalledWith({
      where: { id: 11 },
      data: { isRemoved: true, removalReason: 'Outdated evidence', removedAt: expect.any(Date) },
    });
    expect(fs.readFileSync(filePath)).toEqual(Buffer.from('retained'));
  });

  it.each(['IT_STAFF', 'ADMINISTRATOR'] as const)('returns 403 when %s tries to remove metadata', async role => {
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session(role, 20) as never);

    const response = await request(app)
      .patch('/api/attachments/11/remove')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ removalReason: 'Wrong file' });

    expect(response.status).toBe(403);
    expect(prisma.attachment.update).not.toHaveBeenCalled();
  });
});

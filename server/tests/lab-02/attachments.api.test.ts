import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    ticket: { findUnique: vi.fn() },
    requesterUser: { findUnique: vi.fn() },
    attachment: {
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

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
    vi.mocked(prisma.requesterUser.findUnique).mockResolvedValue({ id: 7, isActive: true } as never);
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue({ id: 8, requesterId: 7 } as never);
    vi.mocked(prisma.attachment.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.attachment.findUnique).mockResolvedValue(activeAttachment as never);
    vi.mocked(prisma.attachment.create).mockImplementation(async ({ data }: any) => ({
      id: 21,
      ...data,
      createdAt: new Date('2026-09-06T08:00:00.000Z'),
    }));
    vi.mocked(prisma.attachment.update).mockImplementation(async ({ data }: any) => ({
      id: 11,
      originalName: 'evidence.png',
      ...data,
    }));
  });

  afterEach(() => {
    delete process.env.UPLOADS_DIR;
    fs.rmSync(uploadsDirectory, { recursive: true, force: true });
  });

  it('uploads one valid owned file using UUID storage while preserving its original name', async () => {
    const response = await request(app)
      .post('/api/tickets/8/attachments')
      .field('requesterId', '7')
      .attach('file', Buffer.from('png-data'), { filename: 'Evidence.PNG', contentType: 'image/png' });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      id: 21,
      originalName: 'Evidence.PNG',
      mimeType: 'image/png',
      sizeBytes: 8,
      isRemoved: false,
      ticketId: 8,
    });
    expect(response.body.data.storedName).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(fs.readFileSync(path.join(uploadsDirectory, response.body.data.storedName))).toEqual(Buffer.from('png-data'));
  });

  it.each([
    ['missing file', (call: request.Test) => call.field('requesterId', '7')],
    ['wrong file type', (call: request.Test) => call.field('requesterId', '7').attach('file', Buffer.from('bad'), { filename: 'bad.txt', contentType: 'text/plain' })],
    ['more than one file', (call: request.Test) => call.field('requesterId', '7').attach('file', Buffer.from('one'), { filename: 'one.png', contentType: 'image/png' }).attach('file', Buffer.from('two'), { filename: 'two.png', contentType: 'image/png' })],
  ])('rejects %s with a clear 400 response', async (_label, buildRequest) => {
    const response = await buildRequest(request(app).post('/api/tickets/8/attachments'));
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: 'Validation failed', details: [expect.objectContaining({ field: 'file' })] });
    expect(prisma.attachment.create).not.toHaveBeenCalled();
  });

  it('rejects a file larger than exactly 5 MB', async () => {
    const response = await request(app)
      .post('/api/tickets/8/attachments')
      .field('requesterId', '7')
      .attach('file', Buffer.alloc(5_242_881), { filename: 'large.pdf', contentType: 'application/pdf' });
    expect(response.status).toBe(400);
    expect(response.body.details[0].message).toContain('5 MB');
  });

  it('accepts a file at the exact 5 MB boundary', async () => {
    const response = await request(app)
      .post('/api/tickets/8/attachments')
      .field('requesterId', '7')
      .attach('file', Buffer.alloc(5_242_880), { filename: 'boundary.pdf', contentType: 'application/pdf' });
    expect(response.status).toBe(201);
    expect(response.body.data.sizeBytes).toBe(5_242_880);
  });

  it.each([
    ['/api/tickets/nope/attachments', '7', 'ticketId'],
    ['/api/tickets/8/attachments', '0', 'requesterId'],
    ['/api/tickets/2147483648/attachments', '7', 'ticketId'],
  ])('rejects malformed upload identifiers before database access', async (url, requesterId, field) => {
    const response = await request(app)
      .post(url)
      .field('requesterId', requesterId)
      .attach('file', Buffer.from('png'), { filename: 'file.png', contentType: 'image/png' });
    expect(response.status).toBe(400);
    expect(response.body.details).toContainEqual(expect.objectContaining({ field }));
    expect(prisma.ticket.findUnique).not.toHaveBeenCalled();
  });

  it('returns 403 before storing a file when another requester owns the ticket', async () => {
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue({ id: 8, requesterId: 99 } as never);
    const response = await request(app)
      .post('/api/tickets/8/attachments')
      .field('requesterId', '7')
      .attach('file', Buffer.from('png'), { filename: 'file.png', contentType: 'image/png' });
    expect(response.status).toBe(403);
    expect(fs.readdirSync(uploadsDirectory)).toHaveLength(0);
  });

  it('returns 404 when the upload ticket does not exist', async () => {
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue(null);
    const response = await request(app)
      .post('/api/tickets/8/attachments')
      .field('requesterId', '7')
      .attach('file', Buffer.from('png'), { filename: 'file.png', contentType: 'image/png' });
    expect(response.status).toBe(404);
  });

  it('counts active files only and rejects an upload when five remain active', async () => {
    vi.mocked(prisma.attachment.count).mockResolvedValue(5 as never);
    const response = await request(app)
      .post('/api/tickets/8/attachments')
      .field('requesterId', '7')
      .attach('file', Buffer.from('png'), { filename: 'file.png', contentType: 'image/png' });
    expect(response.status).toBe(400);
    expect(response.body.details[0].message).toContain('5 active attachments');
    expect(prisma.attachment.count).toHaveBeenCalledWith({ where: { ticketId: 8, isRemoved: false } });
  });

  it('allows a replacement after removal leaves fewer than five active files', async () => {
    vi.mocked(prisma.attachment.count).mockResolvedValue(4 as never);
    const response = await request(app)
      .post('/api/tickets/8/attachments')
      .field('requesterId', '7')
      .attach('file', Buffer.from('pdf'), { filename: 'replacement.pdf', contentType: 'application/pdf' });
    expect(response.status).toBe(201);
  });

  it('accepts requesterId from the upload query as permitted by the API contract', async () => {
    const response = await request(app)
      .post('/api/tickets/8/attachments?requesterId=7')
      .attach('file', Buffer.from('webp'), { filename: 'evidence.webp', contentType: 'image/webp' });
    expect(response.status).toBe(201);
    expect(prisma.ticket.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 8 } }));
  });

  it('removes a just-written file when metadata persistence fails', async () => {
    vi.mocked(prisma.attachment.create).mockRejectedValue(new Error('database unavailable'));
    const response = await request(app)
      .post('/api/tickets/8/attachments')
      .field('requesterId', '7')
      .attach('file', Buffer.from('png'), { filename: 'file.png', contentType: 'image/png' });
    expect(response.status).toBe(500);
    expect(fs.readdirSync(uploadsDirectory)).toHaveLength(0);
  });

  it('returns owned attachment metadata matching the exact API contract without over-exposure', async () => {
    const response = await request(app).get('/api/attachments/11?requesterId=7');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      id: 11,
      originalName: 'evidence.png',
      storedName: '11111111-1111-4111-8111-111111111111.png',
      mimeType: 'image/png',
      sizeBytes: 8,
      isRemoved: false,
      createdAt: '2026-09-05T08:35:00.000Z',
      ticketId: 8,
    });
    expect(response.body.data).not.toHaveProperty('ticket');
    expect(response.body.data).not.toHaveProperty('removalReason');
    expect(response.body.data).not.toHaveProperty('removedAt');
  });

  it.each([
    ['metadata', '/api/attachments/11?requesterId=7', 'get'],
    ['download', '/api/attachments/11/download?requesterId=7', 'get'],
    ['removal', '/api/attachments/11/remove', 'patch'],
  ])('blocks non-owner %s access with 403', async (_label, url, method) => {
    vi.mocked(prisma.attachment.findUnique).mockResolvedValue({
      ...activeAttachment,
      ticket: { requesterId: 99 },
    } as never);
    const call = method === 'patch'
      ? request(app).patch(url).send({ requesterId: 7, removalReason: 'Wrong file' })
      : request(app).get(url);
    const response = await call;
    expect(response.status).toBe(403);
    expect(response.body.data).toBeUndefined();
  });

  it('returns 404 when attachment metadata does not exist', async () => {
    vi.mocked(prisma.attachment.findUnique).mockResolvedValue(null);
    const response = await request(app).get('/api/attachments/404?requesterId=7');
    expect(response.status).toBe(404);
  });

  it('downloads the owned active bytes using the original name and content type', async () => {
    fs.writeFileSync(path.join(uploadsDirectory, activeAttachment.storedName), Buffer.from('png-data'));
    const response = await request(app).get('/api/attachments/11/download?requesterId=7');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/^image\/png/);
    expect(response.headers['content-disposition']).toContain('attachment;');
    expect(response.headers['content-disposition']).toContain('evidence.png');
    expect(response.body).toEqual(Buffer.from('png-data'));
  });

  it('returns 404 when active metadata points to a missing server file', async () => {
    const response = await request(app).get('/api/attachments/11/download?requesterId=7');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('File not found on server');
  });

  it('returns 404 when a download attachment does not exist', async () => {
    vi.mocked(prisma.attachment.findUnique).mockResolvedValue(null);
    const response = await request(app).get('/api/attachments/404/download?requesterId=7');
    expect(response.status).toBe(404);
  });

  it('blocks download after soft removal', async () => {
    vi.mocked(prisma.attachment.findUnique).mockResolvedValue({ ...activeAttachment, isRemoved: true } as never);
    const response = await request(app).get('/api/attachments/11/download?requesterId=7');
    expect(response.status).toBe(400);
    expect(response.body.details[0].message).toContain('cannot be downloaded');
  });

  it.each([
    ['', 'missing'],
    ['ab', 'two characters'],
    ['x'.repeat(501), 'over 500 characters'],
  ])('rejects an invalid removal reason: %s', async (reason) => {
    const response = await request(app)
      .patch('/api/attachments/11/remove')
      .send({ requesterId: 7, removalReason: reason });
    expect(response.status).toBe(400);
    expect(response.body.details).toContainEqual(expect.objectContaining({ field: 'removalReason' }));
    expect(prisma.attachment.update).not.toHaveBeenCalled();
  });

  it.each(['abc', 'x'.repeat(500)])('accepts trimmed removal reason boundary length %s', async reason => {
    const response = await request(app)
      .patch('/api/attachments/11/remove')
      .send({ requesterId: 7, removalReason: `  ${reason}  ` });
    expect(response.status).toBe(200);
    expect(prisma.attachment.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 11 },
      data: expect.objectContaining({ isRemoved: true, removalReason: reason, removedAt: expect.any(Date) }),
    }));
  });

  it('soft-removes metadata while retaining the physical file', async () => {
    const filePath = path.join(uploadsDirectory, activeAttachment.storedName);
    fs.writeFileSync(filePath, Buffer.from('retained'));
    const response = await request(app)
      .patch('/api/attachments/11/remove')
      .send({ requesterId: 7, removalReason: 'Outdated evidence' });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: 11,
      isRemoved: true,
      removalReason: 'Outdated evidence',
    });
    expect(fs.readFileSync(filePath)).toEqual(Buffer.from('retained'));
  });

  it('returns 404 when the attachment to remove does not exist', async () => {
    vi.mocked(prisma.attachment.findUnique).mockResolvedValue(null);
    const response = await request(app)
      .patch('/api/attachments/404/remove')
      .send({ requesterId: 7, removalReason: 'Wrong file' });
    expect(response.status).toBe(404);
  });

  it('rejects repeated removal and preserves metadata without touching the physical file', async () => {
    fs.writeFileSync(path.join(uploadsDirectory, activeAttachment.storedName), Buffer.from('kept'));
    vi.mocked(prisma.attachment.findUnique).mockResolvedValue({ ...activeAttachment, isRemoved: true } as never);
    const response = await request(app)
      .patch('/api/attachments/11/remove')
      .send({ requesterId: 7, removalReason: 'Remove again' });
    expect(response.status).toBe(400);
    expect(prisma.attachment.update).not.toHaveBeenCalled();
    expect(fs.existsSync(path.join(uploadsDirectory, activeAttachment.storedName))).toBe(true);
  });

  it.each([
    ['/api/attachments/not-a-number?requesterId=7', 'get'],
    ['/api/attachments/11?requesterId=0', 'get'],
    ['/api/attachments/0/download?requesterId=7', 'get'],
    ['/api/attachments/not-a-number/remove', 'patch'],
  ])('rejects malformed attachment endpoint identifiers', async (url, method) => {
    const response = method === 'patch'
      ? await request(app).patch(url).send({ requesterId: 7, removalReason: 'Wrong file' })
      : await request(app).get(url);
    expect(response.status).toBe(400);
    expect(prisma.attachment.findUnique).not.toHaveBeenCalled();
  });

  it('serializes concurrent uploads and prevents exceeding the five-active limit', async () => {
    let activeFiles = 4;
    vi.mocked(prisma.attachment.count).mockImplementation(async () => activeFiles);
    vi.mocked(prisma.attachment.create).mockImplementation(async ({ data }: any) => {
      activeFiles++;
      return { id: 30 + activeFiles, ...data, createdAt: new Date() };
    });

    const upload1 = request(app)
      .post('/api/tickets/8/attachments')
      .field('requesterId', '7')
      .attach('file', Buffer.from('file-1'), { filename: 'file1.png', contentType: 'image/png' });

    const upload2 = request(app)
      .post('/api/tickets/8/attachments')
      .field('requesterId', '7')
      .attach('file', Buffer.from('file-2'), { filename: 'file2.png', contentType: 'image/png' });

    const [res1, res2] = await Promise.all([upload1, upload2]);
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 400]);

    const rejected = res1.status === 400 ? res1 : res2;
    expect(rejected.body.details[0].message).toContain('5 active attachments');
  });

  it('verifies ownership with minimal projection and does not load full metadata on 403', async () => {
    vi.mocked(prisma.attachment.findUnique).mockResolvedValueOnce({
      id: 11,
      ticket: { requesterId: 99 },
    } as never);

    const response = await request(app).get('/api/attachments/11?requesterId=7');
    expect(response.status).toBe(403);
    expect(prisma.attachment.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.attachment.findUnique).toHaveBeenCalledWith({
      where: { id: 11 },
      select: {
        id: true,
        ticket: { select: { requesterId: true } },
      },
    });
  });
});

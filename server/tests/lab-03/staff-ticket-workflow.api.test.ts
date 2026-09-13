import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    userSession: { findUnique: vi.fn() },
    ticket: { findFirst: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
    internalNote: { findMany: vi.fn(), create: vi.fn() },
  },
}));

const cookie = 'tt_session=test-session-token';
const origin = 'http://localhost:5173';
function session(role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR' = 'IT_STAFF', id = role === 'IT_STAFF' ? 20 : 30) {
  return { id: 10, tokenHash: 'hash', expiresAt: new Date(Date.now() + 60_000), revokedAt: null, user: { id, name: 'Support', email: 'support@example.com', role, isActive: true, mustChangePassword: false } };
}
function detail(status: string = 'OPEN') {
  return { id: 8, ticketNumber: 'TK-0008', currentStatus: status, requestedPriority: 'HIGH', itPriority: 'MEDIUM', owner: null, comments: [], internalNotes: [], problemAppearsResolvedAt: null };
}

describe('Issue #41 Staff ticket workflow API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session() as never);
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 8, currentStatus: 'OPEN' } as never);
    vi.mocked(prisma.ticket.update).mockResolvedValue(detail() as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 21, isActive: true, role: 'IT_STAFF' } as never);
    vi.mocked(prisma.internalNote.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.internalNote.create).mockResolvedValue({ id: 1, ticketId: 8, content: 'Investigating', createdAt: new Date(), author: { id: 20, name: 'Support', role: 'IT_STAFF' } } as never);
  });

  it('returns the staff detail projection, including notes, while Requesters cannot see it', async () => {
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue(detail() as never);
    const staffResponse = await request(app).get('/api/tickets/8').set('Cookie', cookie);
    expect(staffResponse.status).toBe(200);
    expect(staffResponse.body.data).toEqual(detail());
    expect(JSON.stringify(vi.mocked(prisma.ticket.findFirst).mock.calls[0]?.[0])).toContain('internalNotes');

    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('REQUESTER') as never);
    const requesterResponse = await request(app).get('/api/tickets/8/internal-notes').set('Cookie', cookie);
    expect(requesterResponse.status).toBe(403);
    expect(prisma.internalNote.findMany).not.toHaveBeenCalled();
  });

  it('does not include Internal Notes in the Requester ticket detail projection', async () => {
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('REQUESTER', 7) as never);
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ ...detail(), internalNotes: undefined } as never);
    const response = await request(app).get('/api/tickets/8').set('Cookie', cookie);
    expect(response.status).toBe(200);
    expect(response.body.data).not.toHaveProperty('internalNotes');
    expect(JSON.stringify(vi.mocked(prisma.ticket.findFirst).mock.calls[0]?.[0])).not.toContain('internalNotes');
  });

  it('allows Staff to claim/reassign/unassign only active Staff/Admin targets', async () => {
    const assigned = await request(app).patch('/api/tickets/8/owner').set('Cookie', cookie).set('Origin', origin).send({ ownerId: 21, requesterId: 999 });
    expect(assigned.status).toBe(200);
    expect(prisma.ticket.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 8 }, data: { ownerId: 21 } }));

    const unassigned = await request(app).patch('/api/tickets/8/owner').set('Cookie', cookie).set('Origin', origin).send({ ownerId: null });
    expect(unassigned.status).toBe(200);
    expect(prisma.ticket.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: { ownerId: null } }));

    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 21, isActive: false, role: 'IT_STAFF' } as never);
    const inactive = await request(app).patch('/api/tickets/8/owner').set('Cookie', cookie).set('Origin', origin).send({ ownerId: 21 });
    expect(inactive.status).toBe(400);
    expect(prisma.ticket.update).toHaveBeenCalledTimes(2);
  });

  it('updates IT Priority without changing Requested Priority', async () => {
    const response = await request(app).patch('/api/tickets/8/it-priority').set('Cookie', cookie).set('Origin', origin).send({ itPriority: 'CRITICAL', requestedPriority: 'LOW' });
    expect(response.status).toBe(200);
    expect(prisma.ticket.update).toHaveBeenCalledWith(expect.objectContaining({ data: { itPriority: 'CRITICAL' } }));
  });

  it.each([
    ['NEW', 'OPEN'], ['NEW', 'CANCELLED'], ['OPEN', 'IN_PROGRESS'], ['OPEN', 'WAITING_FOR_REQUESTER'], ['OPEN', 'CANCELLED'],
    ['IN_PROGRESS', 'WAITING_FOR_REQUESTER'], ['IN_PROGRESS', 'RESOLVED'], ['IN_PROGRESS', 'CANCELLED'], ['WAITING_FOR_REQUESTER', 'IN_PROGRESS'],
    ['WAITING_FOR_REQUESTER', 'CANCELLED'], ['RESOLVED', 'CLOSED'], ['RESOLVED', 'REOPENED'], ['CLOSED', 'REOPENED'], ['REOPENED', 'IN_PROGRESS'],
    ['REOPENED', 'CANCELLED'], ['CANCELLED', 'REOPENED'],
  ])('permits status transition %s -> %s', async (from, to) => {
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 8, currentStatus: from } as never);
    const response = await request(app).patch('/api/tickets/8/status').set('Cookie', cookie).set('Origin', origin).send({ status: to, confirmed: ['CANCELLED', 'RESOLVED', 'CLOSED', 'REOPENED'].includes(to) });
    expect(response.status).toBe(200);
  });

  it('rejects invalid transitions and missing confirmation, and reopening clears resolution indication', async () => {
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 8, currentStatus: 'NEW' } as never);
    const invalid = await request(app).patch('/api/tickets/8/status').set('Cookie', cookie).set('Origin', origin).send({ status: 'CLOSED', confirmed: true });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    expect(prisma.ticket.update).not.toHaveBeenCalled();

    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 8, currentStatus: 'OPEN' } as never);
    const unconfirmed = await request(app).patch('/api/tickets/8/status').set('Cookie', cookie).set('Origin', origin).send({ status: 'CANCELLED', confirmed: false });
    expect(unconfirmed.status).toBe(400);
    expect(unconfirmed.body.error.code).toBe('INVALID_STATUS_TRANSITION');

    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 8, currentStatus: 'RESOLVED' } as never);
    await request(app).patch('/api/tickets/8/status').set('Cookie', cookie).set('Origin', origin).send({ status: 'REOPENED', confirmed: true });
    expect(prisma.ticket.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: { currentStatus: 'REOPENED', problemAppearsResolvedAt: null } }));
  });

  it('keeps Administrator read-only for every Staff mutation', async () => {
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('ADMINISTRATOR') as never);
    const owner = await request(app).patch('/api/tickets/8/owner').set('Cookie', cookie).set('Origin', origin).send({ ownerId: null });
    const priority = await request(app).patch('/api/tickets/8/it-priority').set('Cookie', cookie).set('Origin', origin).send({ itPriority: 'LOW' });
    const status = await request(app).patch('/api/tickets/8/status').set('Cookie', cookie).set('Origin', origin).send({ status: 'CANCELLED', confirmed: true });
    const note = await request(app).post('/api/tickets/8/internal-notes').set('Cookie', cookie).set('Origin', origin).send({ content: 'No write' });
    expect([owner.status, priority.status, status.status, note.status]).toEqual([403, 403, 403, 403]);
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });

  it('lists and creates normalized, server-attributed Internal Notes for Staff/Admin', async () => {
    const list = await request(app).get('/api/tickets/8/internal-notes').set('Cookie', cookie);
    expect(list.status).toBe(200);
    expect(prisma.internalNote.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ticketId: 8 }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }));

    const create = await request(app).post('/api/tickets/8/internal-notes').set('Cookie', cookie).set('Origin', origin).send({ content: '  first\r\nsecond  ', authorId: 999, createdAt: '2000-01-01' });
    expect(create.status).toBe(201);
    expect(prisma.internalNote.create).toHaveBeenCalledWith(expect.objectContaining({ data: { ticketId: 8, content: 'first\nsecond', authorId: 20 } }));
    expect(JSON.stringify(vi.mocked(prisma.internalNote.create).mock.calls[0]?.[0])).not.toContain('2000-01-01');
  });

  it('uses explicit content error codes and CSRF/role guards before writes', async () => {
    const empty = await request(app).post('/api/tickets/8/internal-notes').set('Cookie', cookie).set('Origin', origin).send({ content: '   ' });
    const long = await request(app).post('/api/tickets/8/internal-notes').set('Cookie', cookie).set('Origin', origin).send({ content: 'x'.repeat(2001) });
    const csrf = await request(app).post('/api/tickets/8/internal-notes').set('Cookie', cookie).send({ content: 'valid' });
    expect(empty.body.error.code).toBe('CONTENT_REQUIRED');
    expect(long.body.error.code).toBe('CONTENT_TOO_LONG');
    expect(csrf.status).toBe(403);
    expect(prisma.internalNote.create).not.toHaveBeenCalled();
  });
});

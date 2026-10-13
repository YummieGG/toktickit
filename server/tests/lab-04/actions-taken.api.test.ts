import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { Prisma } from '../../generated/prisma';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';
import { computeActionFingerprint } from '../../src/lib/action-rules';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    userSession: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    ticket: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    actionTaken: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    actionTakenEvent: { create: vi.fn() },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

const COOKIE = 'tt_session=test-token';
const ORIGIN = 'http://localhost:5173';

function session(
  role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR' = 'IT_STAFF',
  id = role === 'REQUESTER' ? 7 : role === 'IT_STAFF' ? 20 : 30,
) {
  return {
    id: 10,
    tokenHash: 'hash',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: {
      id,
      name: `${role}_User`,
      email: `${role.toLowerCase()}@example.com`,
      role,
      isActive: true,
      mustChangePassword: false,
    },
  };
}

describe('API-01, API-02, API-03: Actions Taken API (FR-04-03..FR-04-05, BR-03..BR-11, AC-04, AC-05)', () => {
  const sampleTicket = {
    id: 8,
    ticketNumber: 'TK-0008',
    requesterId: 7,
    currentStatus: 'IN_PROGRESS',
    version: 3,
    updatedAt: new Date('2026-10-13T10:00:00Z'),
  };

  const sampleAction = {
    id: 101,
    ticketId: 8,
    description: 'Investigated network latency on switch port 3',
    result: null,
    status: 'PENDING',
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
    cancelReason: null,
    createdAt: new Date('2026-10-13T10:05:00Z'),
    updatedAt: new Date('2026-10-13T10:05:00Z'),
    version: 1,
    creationKey: 'idem-key-001',
    creationFingerprint: 'dummy-fp',
    performedBy: { id: 20, name: 'IT_STAFF_User', role: 'IT_STAFF' },
    assignee: { id: 20, name: 'IT_STAFF_User', role: 'IT_STAFF', isActive: true },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('IT_STAFF') as never);
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue(sampleTicket as never);
    vi.mocked(prisma.ticket.update).mockResolvedValue({ version: 4 } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 20, role: 'IT_STAFF', isActive: true } as never);
    vi.mocked(prisma.actionTaken.count).mockResolvedValue(1 as never);
    vi.mocked(prisma.actionTaken.findMany).mockResolvedValue([sampleAction] as never);
    vi.mocked(prisma.actionTaken.findUnique).mockResolvedValue(sampleAction as never);
    vi.mocked(prisma.actionTaken.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.actionTaken.create).mockResolvedValue(sampleAction as never);
    vi.mocked(prisma.actionTaken.update).mockResolvedValue(sampleAction as never);
    vi.mocked(prisma.actionTakenEvent.create).mockResolvedValue({ id: 1 } as never);
  });

  describe('API-00: Service Health & Error Envelopes (Issue #57 Scope)', () => {
    it('returns 200 with service health status on GET /api/health', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: 'ok',
        service: 'TokTickIT API',
      });
    });

    it('returns 500 with standard INTERNAL_ERROR envelope on unexpected error', async () => {
      vi.mocked(prisma.actionTaken.count).mockRejectedValue(new Error('Unexpected DB breakdown') as never);

      const res = await request(app)
        .get('/api/tickets/8/actions-taken')
        .set('Cookie', COOKIE);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unable to process the request',
        },
      });
    });
  });

  describe('API-01: Action List (GET /api/tickets/:ticketId/actions-taken)', () => {
    it('allows IT Staff and Administrator to list actions with pagination', async () => {
      const res = await request(app)
        .get('/api/tickets/8/actions-taken?page=1&pageSize=10')
        .set('Cookie', COOKIE);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.ticketVersion).toBe(3);
      expect(res.body.pagination).toEqual({
        page: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
      expect(res.body.data[0].id).toBe(101);
      expect(res.body.data[0]).not.toHaveProperty('creationKey');
    });

    it('allows Requester to read actions on an owned ticket', async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('REQUESTER', 7) as never);
      const res = await request(app)
        .get('/api/tickets/8/actions-taken')
        .set('Cookie', COOKIE);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('returns safe 404 when Requester accesses an unowned ticket (BR-03, BR-20)', async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('REQUESTER', 999) as never);
      const res = await request(app)
        .get('/api/tickets/8/actions-taken')
        .set('Cookie', COOKIE);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns safe 404 when parent ticket does not exist', async () => {
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue(null as never);
      const res = await request(app)
        .get('/api/tickets/999/actions-taken')
        .set('Cookie', COOKIE);

      expect(res.status).toBe(404);
    });
  });

  describe('API-01: Action Create (POST /api/tickets/:ticketId/actions-taken)', () => {
    const validCreatePayload = {
      description: 'Inspected switch port and rebooted PoE interface',
      assigneeId: 20,
      followUpRequired: false,
      expectedTicketVersion: 3,
    };

    it('allows IT Staff and Administrator to create an action (201)', async () => {
      const res = await request(app)
        .post('/api/tickets/8/actions-taken')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .set('Idempotency-Key', 'idem-create-key-01')
        .send(validCreatePayload);

      expect(res.status).toBe(201);
      expect(res.body.data.action.id).toBe(101);
      expect(res.body.data.ticketVersion).toBe(4);
      expect(prisma.actionTaken.create).toHaveBeenCalled();
      expect(prisma.actionTakenEvent.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ type: 'CREATED' }),
      }));
      expect(prisma.ticket.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 8 },
        data: expect.objectContaining({ version: { increment: 1 } }),
      }));
    });

    it('forbids Requester from creating actions with 403', async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('REQUESTER', 7) as never);
      const res = await request(app)
        .post('/api/tickets/8/actions-taken')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .set('Idempotency-Key', 'idem-create-key-01')
        .send(validCreatePayload);

      expect(res.status).toBe(403);
      expect(prisma.actionTaken.create).not.toHaveBeenCalled();
    });

    it('rejects request without valid Idempotency-Key header with 400', async () => {
      const res = await request(app)
        .post('/api/tickets/8/actions-taken')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send(validCreatePayload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects followUpRequired=true without followUpNote with 400 FOLLOW_UP_NOTE_REQUIRED', async () => {
      const res = await request(app)
        .post('/api/tickets/8/actions-taken')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .set('Idempotency-Key', 'idem-create-key-02')
        .send({
          ...validCreatePayload,
          followUpRequired: true,
          followUpNote: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FOLLOW_UP_NOTE_REQUIRED');
    });

    it('rejects ineligible assignee (inactive or non-staff) with 400 ASSIGNEE_INELIGIBLE', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 9, role: 'REQUESTER', isActive: true } as never);
      const res = await request(app)
        .post('/api/tickets/8/actions-taken')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .set('Idempotency-Key', 'idem-create-key-03')
        .send({
          ...validCreatePayload,
          assigneeId: 9,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ASSIGNEE_INELIGIBLE');
    });

    it('rejects creation on terminal parent ticket with 400 ACTION_PARENT_READ_ONLY', async () => {
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
        ...sampleTicket,
        currentStatus: 'RESOLVED',
      } as never);

      const res = await request(app)
        .post('/api/tickets/8/actions-taken')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .set('Idempotency-Key', 'idem-create-key-04')
        .send(validCreatePayload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ACTION_PARENT_READ_ONLY');
    });

    it('rejects stale expectedTicketVersion with 409 CONFLICT', async () => {
      const res = await request(app)
        .post('/api/tickets/8/actions-taken')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .set('Idempotency-Key', 'idem-create-key-05')
        .send({
          ...validCreatePayload,
          expectedTicketVersion: 2, // Ticket version is 3
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('replays identical request with 200 without creating new action', async () => {
      const fp = computeActionFingerprint({
        description: validCreatePayload.description,
        assigneeId: 20,
        followUpRequired: false,
      });

      vi.mocked(prisma.actionTaken.findFirst).mockResolvedValue({
        ...sampleAction,
        creationFingerprint: fp,
      } as never);

      const res = await request(app)
        .post('/api/tickets/8/actions-taken')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .set('Idempotency-Key', 'idem-replay-key')
        .send(validCreatePayload);

      expect(res.status).toBe(200);
      expect(res.body.data.action.id).toBe(101);
      expect(prisma.actionTaken.create).not.toHaveBeenCalled();
    });

    it('returns 409 IDEMPOTENCY_CONFLICT when key is reused with different payload', async () => {
      vi.mocked(prisma.actionTaken.findFirst).mockResolvedValue({
        ...sampleAction,
        creationFingerprint: 'different-fingerprint-hash',
      } as never);

      const res = await request(app)
        .post('/api/tickets/8/actions-taken')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .set('Idempotency-Key', 'idem-conflict-key')
        .send(validCreatePayload);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
    });

    it('rejects malformed non-integer assigneeId on creation with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/tickets/8/actions-taken')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .set('Idempotency-Key', 'idem-malformed-assignee')
        .send({
          ...validCreatePayload,
          assigneeId: 'not-a-number',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields).toHaveProperty('assigneeId');
    });

    it('handles concurrent creation P2002 race gracefully by replaying matching creation (200)', async () => {
      const fp = computeActionFingerprint({
        description: validCreatePayload.description,
        assigneeId: 20,
        followUpRequired: false,
      });

      // Simulate $transaction failing with P2002 unique constraint violation
      const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.9.1',
      });
      vi.mocked(prisma.$transaction).mockRejectedValueOnce(p2002Error as never);

      // Subsequent lookup outside transaction finds the matching committed record
      vi.mocked(prisma.actionTaken.findFirst).mockResolvedValueOnce({
        ...sampleAction,
        creationFingerprint: fp,
      } as never);

      const res = await request(app)
        .post('/api/tickets/8/actions-taken')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .set('Idempotency-Key', 'idem-p2002-replay-key')
        .send(validCreatePayload);

      expect(res.status).toBe(200);
      expect(res.body.data.action.id).toBe(101);
    });

    it('handles concurrent creation P2002 race by returning 409 CONFLICT if content differs', async () => {
      const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.9.1',
      });
      vi.mocked(prisma.$transaction).mockRejectedValueOnce(p2002Error as never);

      // Subsequent lookup finds record with different fingerprint
      vi.mocked(prisma.actionTaken.findFirst).mockResolvedValueOnce({
        ...sampleAction,
        creationFingerprint: 'different-fp',
      } as never);

      const res = await request(app)
        .post('/api/tickets/8/actions-taken')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .set('Idempotency-Key', 'idem-p2002-conflict-key')
        .send(validCreatePayload);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('API-02: Action Edit (PATCH /api/tickets/:ticketId/actions-taken/:actionId)', () => {
    it('allows IT Staff and Administrator to edit shared fields (200)', async () => {
      const res = await request(app)
        .patch('/api/tickets/8/actions-taken/101')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({
          description: 'Updated diagnostic notes after firmware verification',
          expectedTicketVersion: 3,
          expectedActionVersion: 1,
        });

      expect(res.status).toBe(200);
      expect(prisma.actionTaken.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 101 },
        data: expect.objectContaining({
          description: 'Updated diagnostic notes after firmware verification',
          version: { increment: 1 },
        }),
      }));
      expect(prisma.actionTakenEvent.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ type: 'EDITED' }),
      }));
    });

    it('rejects edit on cancelled action with 400 ACTION_CANCELLED_READ_ONLY', async () => {
      vi.mocked(prisma.actionTaken.findUnique).mockResolvedValue({
        ...sampleAction,
        status: 'CANCELLED',
      } as never);

      const res = await request(app)
        .patch('/api/tickets/8/actions-taken/101')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({
          description: 'Try to edit cancelled',
          expectedTicketVersion: 3,
          expectedActionVersion: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ACTION_CANCELLED_READ_ONLY');
    });

    it('rejects clearing result on completed action with 400 RESULT_REQUIRED', async () => {
      vi.mocked(prisma.actionTaken.findUnique).mockResolvedValue({
        ...sampleAction,
        status: 'COMPLETED',
        result: 'Fixed the port issue',
      } as never);

      const res = await request(app)
        .patch('/api/tickets/8/actions-taken/101')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({
          result: '   ',
          expectedTicketVersion: 3,
          expectedActionVersion: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('RESULT_REQUIRED');
    });

    it('returns 409 CONFLICT on stale expectedActionVersion', async () => {
      const res = await request(app)
        .patch('/api/tickets/8/actions-taken/101')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({
          description: 'Stale write test',
          expectedTicketVersion: 3,
          expectedActionVersion: 99,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('API-02: Action Reassignment (PATCH /api/tickets/:ticketId/actions-taken/:actionId/assignee)', () => {
    it('reassigns action to an eligible IT Staff member (200)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 21,
        name: 'Chaiwat Support',
        role: 'IT_STAFF',
        isActive: true,
      } as never);

      const res = await request(app)
        .patch('/api/tickets/8/actions-taken/101/assignee')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({
          assigneeId: 21,
          expectedTicketVersion: 3,
          expectedActionVersion: 1,
        });

      expect(res.status).toBe(200);
      expect(prisma.actionTaken.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 101 },
        data: expect.objectContaining({ assigneeId: 21, version: { increment: 1 } }),
      }));
      expect(prisma.actionTakenEvent.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ type: 'ASSIGNED' }),
      }));
    });

    it('rejects reassignment to an inactive user with 400 ASSIGNEE_INELIGIBLE', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 22,
        name: 'Inactive Staff',
        role: 'IT_STAFF',
        isActive: false,
      } as never);

      const res = await request(app)
        .patch('/api/tickets/8/actions-taken/101/assignee')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({
          assigneeId: 22,
          expectedTicketVersion: 3,
          expectedActionVersion: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ASSIGNEE_INELIGIBLE');
    });

    it('rejects reassignment on COMPLETED action with 400 ACTION_COMPLETED_REASSIGNMENT_NOT_ALLOWED (BR-09)', async () => {
      vi.mocked(prisma.actionTaken.findUnique).mockResolvedValue({
        ...sampleAction,
        status: 'COMPLETED',
      } as never);

      const res = await request(app)
        .patch('/api/tickets/8/actions-taken/101/assignee')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({
          assigneeId: 21,
          expectedTicketVersion: 3,
          expectedActionVersion: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ACTION_COMPLETED_REASSIGNMENT_NOT_ALLOWED');
    });

    it('rejects reassignment on CANCELLED action with 400 ACTION_CANCELLED_READ_ONLY (BR-09)', async () => {
      vi.mocked(prisma.actionTaken.findUnique).mockResolvedValue({
        ...sampleAction,
        status: 'CANCELLED',
      } as never);

      const res = await request(app)
        .patch('/api/tickets/8/actions-taken/101/assignee')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({
          assigneeId: 21,
          expectedTicketVersion: 3,
          expectedActionVersion: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ACTION_CANCELLED_READ_ONLY');
    });
  });

  describe('API-02: Action Status Transitions (PATCH /api/tickets/:ticketId/actions-taken/:actionId/status)', () => {
    it('transitions PENDING to IN_PROGRESS with STARTED event (200)', async () => {
      const res = await request(app)
        .patch('/api/tickets/8/actions-taken/101/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({
          status: 'IN_PROGRESS',
          expectedTicketVersion: 3,
          expectedActionVersion: 1,
        });

      expect(res.status).toBe(200);
      expect(prisma.actionTaken.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'IN_PROGRESS', version: { increment: 1 } }),
      }));
      expect(prisma.actionTakenEvent.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ type: 'STARTED' }),
      }));
    });

    it('transitions IN_PROGRESS to COMPLETED with non-empty result (200)', async () => {
      vi.mocked(prisma.actionTaken.findUnique).mockResolvedValue({
        ...sampleAction,
        status: 'IN_PROGRESS',
      } as never);

      const res = await request(app)
        .patch('/api/tickets/8/actions-taken/101/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({
          status: 'COMPLETED',
          result: 'Cleaned optics and confirmed ping reply with 0% loss',
          expectedTicketVersion: 3,
          expectedActionVersion: 1,
        });

      expect(res.status).toBe(200);
      expect(prisma.actionTaken.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'COMPLETED', result: 'Cleaned optics and confirmed ping reply with 0% loss' }),
      }));
      expect(prisma.actionTakenEvent.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ type: 'COMPLETED' }),
      }));
    });

    it('rejects transition to COMPLETED without result with 400 RESULT_REQUIRED', async () => {
      vi.mocked(prisma.actionTaken.findUnique).mockResolvedValue({
        ...sampleAction,
        status: 'IN_PROGRESS',
        result: null,
      } as never);

      const res = await request(app)
        .patch('/api/tickets/8/actions-taken/101/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({
          status: 'COMPLETED',
          expectedTicketVersion: 3,
          expectedActionVersion: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('RESULT_REQUIRED');
    });

    it('transitions to CANCELLED with cancelReason (200)', async () => {
      const res = await request(app)
        .patch('/api/tickets/8/actions-taken/101/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({
          status: 'CANCELLED',
          cancelReason: 'Device already inspected by on-site tech',
          expectedTicketVersion: 3,
          expectedActionVersion: 1,
        });

      expect(res.status).toBe(200);
      expect(prisma.actionTakenEvent.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ type: 'CANCELLED' }),
      }));
    });

    it('rejects transition to CANCELLED without cancelReason with 400 CANCEL_REASON_REQUIRED', async () => {
      const res = await request(app)
        .patch('/api/tickets/8/actions-taken/101/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({
          status: 'CANCELLED',
          expectedTicketVersion: 3,
          expectedActionVersion: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANCEL_REASON_REQUIRED');
    });

    it('rejects invalid transitions from COMPLETED or CANCELLED with 400 INVALID_ACTION_TRANSITION', async () => {
      vi.mocked(prisma.actionTaken.findUnique).mockResolvedValue({
        ...sampleAction,
        status: 'COMPLETED',
        result: 'Done',
      } as never);

      const res = await request(app)
        .patch('/api/tickets/8/actions-taken/101/status')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({
          status: 'IN_PROGRESS',
          expectedTicketVersion: 3,
          expectedActionVersion: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_ACTION_TRANSITION');
    });
  });

  describe('API-03: Authorization Boundaries, Concurrency & Resource Isolation (AUTHZ-04, VALIDATION-01, BR-06, BR-20)', () => {
    it('rejects unknown fields on action create with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/tickets/8/actions-taken')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .set('Idempotency-Key', 'test-key-unknown-fields')
        .send({
          description: 'Valid description',
          expectedTicketVersion: 3,
          forgedField: 'malicious-data',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields).toHaveProperty('forgedField');
    });

    it('rejects unknown fields on action edit with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .patch('/api/tickets/8/actions-taken/101')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({
          description: 'Valid update',
          expectedTicketVersion: 3,
          expectedActionVersion: 1,
          unknownParam: 'not-allowed',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields).toHaveProperty('unknownParam');
    });

    it('returns standard 404 Resource not found when actionId belongs to a different ticket', async () => {
      vi.mocked(prisma.actionTaken.findUnique).mockResolvedValue({
        ...sampleAction,
        ticketId: 99, // Mismatched parent ticket
      } as never);

      const res = await request(app)
        .patch('/api/tickets/8/actions-taken/101')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({
          description: 'Attempted cross-ticket mutation',
          expectedTicketVersion: 3,
          expectedActionVersion: 1,
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.message).toBe('Resource not found');
    });

    it('preserves historical follow-up note when setting followUpRequired to false (BR-06)', async () => {
      vi.mocked(prisma.actionTaken.findUnique).mockResolvedValue({
        ...sampleAction,
        followUpRequired: true,
        followUpNote: 'Historical follow-up instruction',
      } as never);

      const res = await request(app)
        .patch('/api/tickets/8/actions-taken/101')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({
          followUpRequired: false,
          followUpNote: null,
          expectedTicketVersion: 3,
          expectedActionVersion: 1,
        });

      expect(res.status).toBe(200);
      expect(prisma.actionTaken.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 101 },
        data: expect.objectContaining({
          followUpRequired: false,
        }),
      }));
      // Verify followUpNote was NOT set to null
      const updateCallData = vi.mocked(prisma.actionTaken.update).mock.calls[0]?.[0]?.data;
      expect(updateCallData).not.toHaveProperty('followUpNote', null);
    });

    it('forbids Administrator from modifying Ticket owner and IT Priority (AUTHZ-04)', async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('ADMINISTRATOR') as never);

      const ownerRes = await request(app)
        .patch('/api/tickets/8/owner')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ ownerId: 20, expectedTicketVersion: 1 });
      expect(ownerRes.status).toBe(403);

      const itPriorityRes = await request(app)
        .patch('/api/tickets/8/it-priority')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ itPriority: 'CRITICAL', expectedTicketVersion: 1 });
      expect(itPriorityRes.status).toBe(403);
    });

    it('requires expectedTicketVersion on Ticket owner and IT Priority mutations and detects stale writes', async () => {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('IT_STAFF') as never);

      // Missing expectedTicketVersion
      const missingVersion = await request(app)
        .patch('/api/tickets/8/owner')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ ownerId: 20 });
      expect(missingVersion.status).toBe(400);
      expect(missingVersion.body.error.code).toBe('VALIDATION_ERROR');

      // Stale expectedTicketVersion
      vi.mocked(prisma.ticket.findUnique).mockResolvedValue({ id: 8, version: 5 } as never);
      const staleVersion = await request(app)
        .patch('/api/tickets/8/owner')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ ownerId: 20, expectedTicketVersion: 4 });
      expect(staleVersion.status).toBe(409);
      expect(staleVersion.body.error.code).toBe('CONFLICT');
    });
  });
});

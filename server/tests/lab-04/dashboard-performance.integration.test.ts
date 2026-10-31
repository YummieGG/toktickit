import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    userSession: { findUnique: vi.fn() },
    ticket: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    actionTaken: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

const COOKIE = 'tt_session=test-perf-token';

function session(role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR' = 'IT_STAFF', id = 20) {
  return {
    id: 10,
    tokenHash: 'hash',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: {
      id,
      name: 'Perf_User',
      email: `${role.toLowerCase()}@example.com`,
      role,
      isActive: true,
      mustChangePassword: false,
    },
  };
}

describe('PERF-01: Dashboard Performance & Body Boundary (TEST-04, AC-13)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation((callback) => (callback as (tx: unknown) => unknown)(prisma) as never);
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('IT_STAFF', 20) as never);
    vi.mocked(prisma.ticket.count).mockResolvedValue(1000 as never);
    vi.mocked(prisma.actionTaken.count).mockResolvedValue(5000 as never);
    vi.mocked(prisma.ticket.groupBy).mockResolvedValue([
      { currentStatus: 'NEW', _count: { _all: 100 } },
      { currentStatus: 'OPEN', _count: { _all: 300 } },
      { currentStatus: 'IN_PROGRESS', _count: { _all: 200 } },
      { currentStatus: 'WAITING_FOR_REQUESTER', _count: { _all: 150 } },
      { currentStatus: 'RESOLVED', _count: { _all: 150 } },
      { currentStatus: 'CLOSED', _count: { _all: 50 } },
      { currentStatus: 'REOPENED', _count: { _all: 30 } },
      { currentStatus: 'CANCELLED', _count: { _all: 20 } },
    ] as never);

    const fiveTickets = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      ticketNumber: `TK-${String(i + 1).padStart(4, '0')}`,
      summary: `Performance ticket test ${i + 1} with long title explaining system status and issues`,
      currentStatus: 'IN_PROGRESS',
      itPriority: 'HIGH',
      updatedAt: new Date('2026-10-18T12:00:00.000Z'),
      resolvedAt: null,
    }));

    const fiveActions = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      ticketId: i + 1,
      description: `Performance action taken description ${i + 1} verifying standard bounded payload size`,
      result: null,
      status: 'IN_PROGRESS',
      performedBy: { id: 20, name: 'Perf_Staff', role: 'IT_STAFF' },
      assignee: { id: 20, name: 'Perf_Staff', role: 'IT_STAFF', isActive: true },
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: null,
      cancelReason: null,
      createdAt: new Date('2026-10-18T12:00:00.000Z'),
      updatedAt: new Date('2026-10-18T12:00:00.000Z'),
      version: 1,
      ticket: {
        id: i + 1,
        ticketNumber: `TK-${String(i + 1).padStart(4, '0')}`,
        summary: `Performance ticket test ${i + 1}`,
        currentStatus: 'IN_PROGRESS',
      },
    }));

    vi.mocked(prisma.ticket.findMany).mockResolvedValue(fiveTickets as never);
    vi.mocked(prisma.actionTaken.findMany).mockResolvedValue(fiveActions as never);
  });

  it('guarantees Staff dashboard response body size is <= 64 KiB', async () => {
    const res = await request(app).get('/api/dashboards/staff').set('Cookie', COOKIE);

    expect(res.status).toBe(200);
    const bodySize = Buffer.byteLength(JSON.stringify(res.body), 'utf8');
    // AC-13: Response body <= 64 KiB (65,536 bytes)
    expect(bodySize).toBeLessThanOrEqual(64 * 1024);
  });

  it('guarantees Requester dashboard response body size is <= 64 KiB', async () => {
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('REQUESTER', 7) as never);

    const res = await request(app).get('/api/dashboards/requester').set('Cookie', COOKIE);

    expect(res.status).toBe(200);
    const bodySize = Buffer.byteLength(JSON.stringify(res.body), 'utf8');
    expect(bodySize).toBeLessThanOrEqual(64 * 1024);
  });

  it('meets warm p95 response time <= 1,000 ms over repeated invocations', async () => {
    const durations: number[] = [];

    // Warm up
    await request(app).get('/api/dashboards/staff').set('Cookie', COOKIE);

    // Run 10 iterations
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      const res = await request(app).get('/api/dashboards/staff').set('Cookie', COOKIE);
      const elapsed = performance.now() - start;
      expect(res.status).toBe(200);
      durations.push(elapsed);
    }

    durations.sort((a, b) => a - b);
    const p95Index = Math.floor(durations.length * 0.95);
    const p95Duration = durations[p95Index] ?? durations[durations.length - 1];

    // TEST-04, AC-13: warm p95 response <= 1,000 ms
    expect(p95Duration).toBeLessThanOrEqual(1000);
  });
});

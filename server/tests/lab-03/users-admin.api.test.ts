import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    userSession: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    ticket: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

const ORIGIN = 'http://localhost:5173';
const COOKIE = 'tt_session=admin-session';
const validPassword = 'ValidPass#12';

function session(
  role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR' = 'ADMINISTRATOR',
  id = 1,
  mustChangePassword = false,
) {
  return {
    id: 10,
    tokenHash: 'server-only-hash',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: {
      id,
      name: role === 'ADMINISTRATOR' ? 'Admin One' : 'User One',
      email: role === 'ADMINISTRATOR' ? 'admin@example.com' : 'user@example.com',
      role,
      isActive: true,
      mustChangePassword,
    },
  };
}

function projectedUser(overrides: Partial<ReturnType<typeof session>['user']> = {}) {
  return {
    id: 20,
    name: 'Case One',
    email: 'case@example.com',
    role: 'IT_STAFF' as const,
    isActive: true,
    mustChangePassword: false,
    ...overrides,
  };
}

describe('Issue #42 Administrator user-management API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.$executeRaw).mockResolvedValue(0 as never);
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session() as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(prisma));
    vi.mocked(prisma.userSession.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.ticket.updateMany).mockResolvedValue({ count: 1 } as never);
  });

  it('allows only an active Administrator session to access every admin endpoint', async () => {
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(null as never);
    const unauthenticated = await request(app).get('/api/admin/users');
    expect(unauthenticated.status).toBe(401);

    for (const role of ['REQUESTER', 'IT_STAFF'] as const) {
      vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session(role, 7) as never);
      const list = await request(app).get('/api/admin/users').set('Cookie', COOKIE);
      const create = await request(app)
        .post('/api/admin/users')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ name: 'Blocked', email: 'blocked@example.com', role: 'REQUESTER', isActive: true, initialPassword: validPassword });
      const edit = await request(app)
        .patch('/api/admin/users/20')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ name: 'Blocked' });
      const reset = await request(app)
        .post('/api/admin/users/20/initial-password')
        .set('Cookie', COOKIE)
        .set('Origin', ORIGIN)
        .send({ initialPassword: validPassword });

      expect(list.status).toBe(403);
      expect(create.status).toBe(403);
      expect(edit.status).toBe(403);
      expect(reset.status).toBe(403);
    }
  });

  it('rejects a mandatory-password-change Administrator and state-changing requests without Origin', async () => {
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session('ADMINISTRATOR', 1, true) as never);
    const passwordChangeRequired = await request(app).get('/api/admin/users').set('Cookie', COOKIE);
    expect(passwordChangeRequired.status).toBe(403);
    expect(passwordChangeRequired.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');

    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session() as never);
    const missingOrigin = await request(app)
      .post('/api/admin/users')
      .set('Cookie', COOKIE)
      .send({ name: 'No Origin', email: 'no-origin@example.com', role: 'REQUESTER', isActive: true, initialPassword: validPassword });
    expect(missingOrigin.status).toBe(403);
    expect(missingOrigin.body.error.code).toBe('CSRF_ORIGIN_INVALID');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('lists safe projections and passes trimmed search and role filters to Prisma', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([projectedUser({ passwordHash: 'must-not-exist' } as never)] as never);

    const response = await request(app)
      .get('/api/admin/users?search=%20Case%20&role=IT_STAFF')
      .set('Cookie', COOKIE);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [projectedUser()] });
    expect(response.body.data[0]).not.toHaveProperty('passwordHash');
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { name: { contains: 'Case', mode: 'insensitive' } },
          { email: { contains: 'Case', mode: 'insensitive' } },
        ],
        role: 'IT_STAFF',
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
      },
    });
  });

  it('rejects invalid role/repeated query values before reading users', async () => {
    const invalidRole = await request(app).get('/api/admin/users?role=OWNER').set('Cookie', COOKIE);
    const repeatedSearch = await request(app).get('/api/admin/users?search=one&search=two').set('Cookie', COOKIE);

    expect(invalidRole.status).toBe(400);
    expect(invalidRole.body.error.code).toBe('INVALID_QUERY');
    expect(repeatedSearch.status).toBe(400);
    expect(repeatedSearch.body.error.code).toBe('INVALID_QUERY');
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('creates a user with trimmed canonical fields, a shared password hash, and no credential projection', async () => {
    vi.mocked(prisma.user.create).mockResolvedValue(projectedUser({ mustChangePassword: true }) as never);

    const response = await request(app)
      .post('/api/admin/users')
      .set('Cookie', COOKIE)
      .set('Origin', ORIGIN)
      .send({
        name: '  New User  ',
        email: '  NEW@EXAMPLE.COM  ',
        role: 'REQUESTER',
        isActive: false,
        initialPassword: validPassword,
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(projectedUser({ mustChangePassword: true }));
    expect(response.body.data).not.toHaveProperty('passwordHash');
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        name: 'New User',
        email: 'new@example.com',
        role: 'REQUESTER',
        isActive: false,
        mustChangePassword: true,
      }),
    }));
    const createCall = vi.mocked(prisma.user.create).mock.calls[0]?.[0] as { data: { passwordHash: string } };
    expect(createCall.data.passwordHash).not.toBe(validPassword);
    expect(createCall.data.passwordHash).toMatch(/^scrypt\$32768\$8\$1\$/);
  });

  it('blocks invalid create fields and turns a unique-email race into a safe conflict', async () => {
    const invalid = await request(app)
      .post('/api/admin/users')
      .set('Cookie', COOKIE)
      .set('Origin', ORIGIN)
      .send({ name: ' ', email: 'bad', role: 'OWNER', isActive: 'yes', initialPassword: 'weak' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('INVALID_USER_CREATE');
    expect(prisma.user.create).not.toHaveBeenCalled();

    vi.mocked(prisma.user.create).mockRejectedValue({ code: 'P2002' } as never);
    const duplicate = await request(app)
      .post('/api/admin/users')
      .set('Cookie', COOKIE)
      .set('Origin', ORIGIN)
      .send({ name: 'Duplicate', email: 'case@example.com', role: 'REQUESTER', isActive: true, initialPassword: validPassword });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('DUPLICATE_EMAIL');
  });

  it('edits fields transactionally and unassigns an owner made ineligible while revoking sessions on deactivation', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 20, role: 'IT_STAFF', isActive: true } as never);
    vi.mocked(prisma.user.update).mockResolvedValue(projectedUser({ role: 'REQUESTER', isActive: false }) as never);

    const response = await request(app)
      .patch('/api/admin/users/20')
      .set('Cookie', COOKIE)
      .set('Origin', ORIGIN)
      .send({ name: '  Renamed  ', email: ' RENAMED@EXAMPLE.COM ', role: 'REQUESTER', isActive: false });

    expect(response.status).toBe(200);
    expect(prisma.ticket.updateMany).toHaveBeenCalledWith({ where: { ownerId: 20 }, data: { ownerId: null } });
    expect(prisma.userSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 20, revokedAt: null },
    }));
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 20 },
      data: { name: 'Renamed', email: 'renamed@example.com', role: 'REQUESTER', isActive: false },
    }));
    expect(JSON.stringify(prisma.user.update.mock.calls[0]?.[0])).not.toContain('password');
  });

  it('can reactivate an inactive eligible Staff account through the same edit operation', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 20, role: 'IT_STAFF', isActive: false } as never);
    vi.mocked(prisma.user.update).mockResolvedValue(projectedUser({ isActive: true }) as never);

    const response = await request(app)
      .patch('/api/admin/users/20')
      .set('Cookie', COOKIE)
      .set('Origin', ORIGIN)
      .send({ isActive: true });

    expect(response.status).toBe(200);
    expect(response.body.data.isActive).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { isActive: true } }));
    expect(prisma.ticket.updateMany).not.toHaveBeenCalled();
    expect(prisma.userSession.updateMany).not.toHaveBeenCalled();
  });

  it('returns explicit errors for invalid edits, duplicate email, self-deactivation, and the last active Administrator', async () => {
    const invalidRole = await request(app)
      .patch('/api/admin/users/20')
      .set('Cookie', COOKIE)
      .set('Origin', ORIGIN)
      .send({ role: 'OWNER' });
    expect(invalidRole.status).toBe(400);
    expect(invalidRole.body.error.code).toBe('INVALID_USER_UPDATE');

    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 20, role: 'IT_STAFF', isActive: true } as never);
    vi.mocked(prisma.user.update).mockRejectedValue({ code: 'P2002' } as never);
    const duplicate = await request(app)
      .patch('/api/admin/users/20')
      .set('Cookie', COOKIE)
      .set('Origin', ORIGIN)
      .send({ email: 'duplicate@example.com' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('DUPLICATE_EMAIL');

    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, role: 'ADMINISTRATOR', isActive: true } as never);
    const self = await request(app)
      .patch('/api/admin/users/1')
      .set('Cookie', COOKIE)
      .set('Origin', ORIGIN)
      .send({ isActive: false });
    expect(self.status).toBe(409);
    expect(self.body.error.code).toBe('SELF_DEACTIVATION');

    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 20, role: 'ADMINISTRATOR', isActive: true } as never);
    vi.mocked(prisma.user.count).mockResolvedValue(0 as never);
    const lastAdministrator = await request(app)
      .patch('/api/admin/users/20')
      .set('Cookie', COOKIE)
      .set('Origin', ORIGIN)
      .send({ role: 'REQUESTER' });
    expect(lastAdministrator.status).toBe(409);
    expect(lastAdministrator.body.error.code).toBe('LAST_ADMIN_PROTECTION');
    expect(prisma.user.update).toHaveBeenCalledTimes(1);

    const lastAdministratorDeactivation = await request(app)
      .patch('/api/admin/users/20')
      .set('Cookie', COOKIE)
      .set('Origin', ORIGIN)
      .send({ isActive: false });
    expect(lastAdministratorDeactivation.status).toBe(409);
    expect(lastAdministratorDeactivation.body.error.code).toBe('LAST_ADMIN_PROTECTION');
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
  });

  it('sets an initial password, forces the next login to change it, and revokes all sessions', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 20 } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    const response = await request(app)
      .post('/api/admin/users/20/initial-password')
      .set('Cookie', COOKIE)
      .set('Origin', ORIGIN)
      .send({ initialPassword: 'NewInitial#34' });

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 20 },
      data: { passwordHash: expect.stringMatching(/^scrypt\$32768\$8\$1\$/), mustChangePassword: true },
    }));
    expect(prisma.userSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 20, revokedAt: null },
    }));
    expect(JSON.stringify(prisma.user.update.mock.calls[0]?.[0])).not.toContain('NewInitial#34');
  });

  it('rejects invalid reset passwords and hides a missing target', async () => {
    const invalid = await request(app)
      .post('/api/admin/users/20/initial-password')
      .set('Cookie', COOKIE)
      .set('Origin', ORIGIN)
      .send({ initialPassword: 'weak' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('INVALID_PASSWORD');
    expect(prisma.$transaction).not.toHaveBeenCalled();

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
    const missing = await request(app)
      .post('/api/admin/users/999/initial-password')
      .set('Cookie', COOKIE)
      .set('Origin', ORIGIN)
      .send({ initialPassword: validPassword });
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

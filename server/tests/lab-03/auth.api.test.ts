import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { hashPassword } from '../../src/lib/password';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    loginAttempt: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const ORIGIN = 'http://localhost:5173';
const password = 'ValidPass#12';

function activeUser(passwordHash: string | null = null) {
  return {
    id: 1,
    name: 'Somchai Prasert',
    email: 'somchai.p@example.com',
    role: 'REQUESTER',
    isActive: true,
    mustChangePassword: false,
    passwordHash,
  };
}

describe('Authentication API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.loginAttempt.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.loginAttempt.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.userSession.create).mockResolvedValue({ id: 10 } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(prisma));
  });

  it('requires the configured Origin on state-changing auth requests', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'user@example.com', password });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('CSRF_ORIGIN_INVALID');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('logs in with a canonical email and an opaque HttpOnly eight-hour cookie', async () => {
    const passwordHash = await hashPassword(password);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(activeUser(passwordHash) as never);

    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', ORIGIN)
      .send({ email: '  SOMCHAI.P@EXAMPLE.COM  ', password });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      id: 1,
      name: 'Somchai Prasert',
      email: 'somchai.p@example.com',
      role: 'REQUESTER',
      isActive: true,
      mustChangePassword: false,
    });
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(response.headers['set-cookie'][0]).toMatch(/tt_session=[^;]+; Max-Age=28800; Path=\/; HttpOnly; SameSite=Lax/);
    expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: 'somchai.p@example.com' } }));
    expect(prisma.userSession.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 1 }) }));
  });

  it('uses the same safe response for unknown and inactive users', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
    const unknown = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'unknown@example.com', password });

    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...activeUser(), isActive: false } as never);
    const inactive = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'somchai.p@example.com', password });

    expect(unknown.status).toBe(401);
    expect(inactive.status).toBe(401);
    expect(unknown.body).toEqual(inactive.body);
    expect(unknown.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('starts a cooldown after five failures and does not enumerate the account', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'unknown@example.com', password });
    }

    vi.mocked(prisma.loginAttempt.findUnique).mockResolvedValue({ cooldownUntil: new Date(Date.now() + 60_000) } as never);
    const response = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'unknown@example.com', password });

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('LOGIN_COOLDOWN');
    expect(response.body.error.message).not.toContain('unknown@example.com');
  });

  it('returns only the current-user projection from /me and revokes the current session on logout', async () => {
    const session = {
      id: 10,
      tokenHash: 'ignored',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: activeUser(null),
    };
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue(session as never);

    const me = await request(app).get('/api/auth/me').set('Cookie', 'tt_session=test-session-token');
    expect(me.status).toBe(200);
    expect(me.body.data).toEqual(expect.objectContaining({ id: 1, role: 'REQUESTER' }));
    expect(me.body.data).not.toHaveProperty('passwordHash');

    const logout = await request(app)
      .post('/api/auth/logout')
      .set('Origin', ORIGIN)
      .set('Cookie', 'tt_session=test-session-token');
    expect(logout.status).toBe(204);
    expect(prisma.userSession.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 10 } }));
    expect(logout.headers['set-cookie'][0]).toMatch(/tt_session=; Max-Age=0/);
  });

  it('changes the password and revokes every existing session', async () => {
    const currentHash = await hashPassword(password);
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue({
      id: 10,
      tokenHash: 'ignored',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: activeUser(currentHash),
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(activeUser(currentHash) as never);

    const response = await request(app)
      .post('/api/auth/change-password')
      .set('Origin', ORIGIN)
      .set('Cookie', 'tt_session=test-session-token')
      .send({ currentPassword: password, newPassword: 'NewValid#1234' });

    expect(response.status).toBe(200);
    expect(response.body.data.mustChangePassword).toBe(false);
    expect(response.body.data).not.toHaveProperty('passwordHash');
    expect(prisma.userSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 1, revokedAt: null },
    }));
    expect(response.headers['set-cookie'][0]).toMatch(/tt_session=; Max-Age=0/);
  });
});

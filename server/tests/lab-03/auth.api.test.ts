import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { hashPassword } from '../../src/lib/password';
import { prisma } from '../../src/lib/prisma';
import {
  clearLoginFailures,
  getLoginCooldownSeconds,
  privacyPreservingIpKey,
  recordFailedLogin,
} from '../../src/lib/auth';

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
      updateMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
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
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ failureCount: 1, cooldownUntil: null }] as never);
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
    let failureCount = 0;
    vi.mocked(prisma.$queryRaw).mockImplementation(async () => [{
      failureCount: ++failureCount,
      cooldownUntil: failureCount >= 5 ? new Date(Date.now() + 60_000) : null,
    }] as never);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const failed = await request(app)
        .post('/api/auth/login')
        .set('Origin', ORIGIN)
        .send({ email: 'unknown@example.com', password });
      if (attempt < 4) expect(failed.status).toBe(401);
      else expect(failed.status).toBe(429);
    }

    vi.mocked(prisma.loginAttempt.findUnique).mockResolvedValue({ cooldownUntil: new Date(Date.now() + 60_000) } as never);
    const response = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'unknown@example.com', password });

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('LOGIN_COOLDOWN');
    expect(response.body.error.message).not.toContain('unknown@example.com');
  });

  it.each([
    ['expired', new Date(Date.now() - 1_000), null],
    ['revoked', new Date(Date.now() + 60_000), new Date()],
  ])('rejects an %s session with the safe unauthenticated response', async (_label, expiresAt, revokedAt) => {
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue({
      id: 10,
      tokenHash: 'server-only-token-hash',
      expiresAt,
      revokedAt,
      user: activeUser(null),
    } as never);

    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', 'tt_session=test-session-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { code: 'UNAUTHENTICATED', message: 'Authentication is required' },
    });
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
    expect(prisma.userSession.update).not.toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 1 } }));
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
      .send({ currentPassword: password, newPassword: 'NewValid#1234', confirmPassword: 'NewValid#1234' });

    expect(response.status).toBe(200);
    expect(response.body.data.mustChangePassword).toBe(false);
    expect(response.body.data).not.toHaveProperty('passwordHash');
    expect(prisma.userSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 1, revokedAt: null },
    }));
    expect(response.headers['set-cookie'][0]).toMatch(/tt_session=; Max-Age=0/);
  });

  it('requires confirmation and rejects reuse of the current password at the API boundary', async () => {
    const currentHash = await hashPassword(password);
    vi.mocked(prisma.userSession.findUnique).mockResolvedValue({
      id: 10,
      tokenHash: 'ignored',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: activeUser(currentHash),
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(activeUser(currentHash) as never);

    const missingConfirmation = await request(app)
      .post('/api/auth/change-password')
      .set('Origin', ORIGIN)
      .set('Cookie', 'tt_session=test-session-token')
      .send({ currentPassword: password, newPassword: 'NewValid#1234' });
    expect(missingConfirmation.status).toBe(400);
    expect(missingConfirmation.body.error.fields.confirmPassword).toBeDefined();

    const reused = await request(app)
      .post('/api/auth/change-password')
      .set('Origin', ORIGIN)
      .set('Cookie', 'tt_session=test-session-token')
      .send({ currentPassword: password, newPassword: password, confirmPassword: password });
    expect(reused.status).toBe(400);
    expect(reused.body.error.fields.newPassword).toBe('Choose a different password');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('uses an atomic PostgreSQL upsert and resets only the requested login-attempt key', async () => {
    const cooldownUntil = new Date(Date.now() + 60_000);
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ failureCount: 5, cooldownUntil }] as never);

    const state = await recordFailedLogin('user@example.com', 'hmac-ip-key');
    expect(state).toEqual({ failureCount: 5, cooldownUntil });
    const sqlTemplate = vi.mocked(prisma.$queryRaw).mock.calls[0]?.[0] as unknown as string[];
    expect(sqlTemplate.join('')).toContain('ON CONFLICT ("normalizedEmail", "ipHash") DO UPDATE');
    expect(sqlTemplate.join('')).toContain('RETURNING "failureCount", "cooldownUntil"');

    await clearLoginFailures('user@example.com', 'hmac-ip-key');
    expect(prisma.loginAttempt.updateMany).toHaveBeenCalledWith({
      where: { normalizedEmail: 'user@example.com', ipHash: 'hmac-ip-key' },
      data: expect.objectContaining({ failureCount: 0, cooldownUntil: null }),
    });
  });

  it('distinguishes expired cooldowns and keeps different rate-limit keys independent', async () => {
    vi.mocked(prisma.loginAttempt.findUnique)
      .mockResolvedValueOnce({ cooldownUntil: new Date(Date.now() - 1_000) } as never)
      .mockResolvedValueOnce({ cooldownUntil: new Date(Date.now() + 60_000) } as never);

    expect(await getLoginCooldownSeconds('user@example.com', 'ip-one')).toBe(0);
    expect(await getLoginCooldownSeconds('user@example.com', 'ip-two')).toBeGreaterThan(0);
    expect(prisma.loginAttempt.findUnique).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { normalizedEmail_ipHash: { normalizedEmail: 'user@example.com', ipHash: 'ip-one' } },
    }));
    expect(prisma.loginAttempt.findUnique).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { normalizedEmail_ipHash: { normalizedEmail: 'user@example.com', ipHash: 'ip-two' } },
    }));
  });

  it('requires the SEC-01 environment pepper instead of using a runtime fallback', () => {
    const configured = process.env.AUTH_IP_PEPPER;
    delete process.env.AUTH_IP_PEPPER;
    expect(() => privacyPreservingIpKey('127.0.0.1')).toThrow('AUTH_IP_PEPPER must be configured');
    process.env.AUTH_IP_PEPPER = configured;
  });
});

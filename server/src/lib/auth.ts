import { createHash, createHmac, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { prisma } from './prisma';

export const SESSION_COOKIE_NAME = 'tt_session';
export const SESSION_TTL_SECONDS = 8 * 60 * 60;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_COOLDOWN_MS = 15 * 60 * 1000;
export const LOGIN_FAILURE_LIMIT = 5;

export const AUTH_ERROR_MESSAGES = {
  invalidCredentials: 'Email or password is incorrect',
  invalidSession: 'Authentication is required',
  invalidOrigin: 'Request origin is not allowed',
} as const;

export function canonicalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function userProjection(user: {
  id: number;
  name: string;
  email: string;
  role: unknown;
  isActive: boolean;
  mustChangePassword: boolean;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
  };
}

export function sessionTokenHash(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function getIpHmacSecret(): string {
  const configured = process.env.AUTH_IP_HMAC_SECRET ?? process.env.AUTH_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_IP_HMAC_SECRET or AUTH_SECRET must be configured in production');
  }
  return 'toktickit-local-ip-hmac-secret';
}

export function privacyPreservingIpKey(ip: string): string {
  return createHmac('sha256', getIpHmacSecret()).update(ip, 'utf8').digest('hex');
}

export function clientIp(request: Request): string {
  return request.ip || request.socket.remoteAddress || 'unknown';
}

export function getCookie(request: Request, name: string): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;

  for (const pair of header.split(';')) {
    const separator = pair.indexOf('=');
    if (separator < 0) continue;
    if (pair.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(pair.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function serializeSessionCookie(value: string, maxAge: number): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function setSessionCookie(response: Response, token: string): void {
  response.setHeader('Set-Cookie', serializeSessionCookie(token, SESSION_TTL_SECONDS));
}

export function clearSessionCookie(response: Response): void {
  response.setHeader('Set-Cookie', serializeSessionCookie('', 0));
}

export async function createSession(userId: number): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await prisma.userSession.create({
    data: { tokenHash: sessionTokenHash(token), userId, expiresAt },
  });
  return { token, expiresAt };
}

export async function findSession(request: Request) {
  const token = getCookie(request, SESSION_COOKIE_NAME);
  if (!token) return null;

  const tokenHash = sessionTokenHash(token);
  const session = await prisma.userSession.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      tokenHash: true,
      expiresAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          passwordHash: true,
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now() || !session.user.isActive) {
    return null;
  }
  return { ...session, tokenHash };
}

function loginAttemptWhere(normalizedEmail: string, ipHash: string) {
  return { normalizedEmail_ipHash: { normalizedEmail, ipHash } };
}

export async function getLoginCooldownSeconds(normalizedEmail: string, ipHash: string): Promise<number> {
  const attempt = await prisma.loginAttempt.findUnique({
    where: loginAttemptWhere(normalizedEmail, ipHash),
    select: { cooldownUntil: true },
  });
  if (!attempt?.cooldownUntil) return 0;
  return Math.max(0, Math.ceil((attempt.cooldownUntil.getTime() - Date.now()) / 1000));
}

export async function recordFailedLogin(normalizedEmail: string, ipHash: string): Promise<void> {
  const now = new Date();
  const existing = await prisma.loginAttempt.findUnique({
    where: loginAttemptWhere(normalizedEmail, ipHash),
    select: { failureCount: true, windowStartedAt: true },
  });
  const currentWindow = existing !== null
    && now.getTime() - existing.windowStartedAt.getTime() < LOGIN_WINDOW_MS;
  const failureCount = currentWindow ? existing.failureCount + 1 : 1;
  const cooldownUntil = failureCount >= LOGIN_FAILURE_LIMIT
    ? new Date(now.getTime() + LOGIN_COOLDOWN_MS)
    : null;

  await prisma.loginAttempt.upsert({
    where: loginAttemptWhere(normalizedEmail, ipHash),
    create: {
      normalizedEmail,
      ipHash,
      failureCount,
      windowStartedAt: currentWindow ? existing.windowStartedAt : now,
      cooldownUntil,
    },
    update: {
      failureCount,
      windowStartedAt: currentWindow ? existing.windowStartedAt : now,
      cooldownUntil,
    },
  });
}

export async function clearLoginFailures(normalizedEmail: string, ipHash: string): Promise<void> {
  const existing = await prisma.loginAttempt.findUnique({
    where: loginAttemptWhere(normalizedEmail, ipHash),
    select: { id: true },
  });
  if (!existing) return;
  await prisma.loginAttempt.update({
    where: { id: existing.id },
    data: { failureCount: 0, windowStartedAt: new Date(), cooldownUntil: null },
  });
}

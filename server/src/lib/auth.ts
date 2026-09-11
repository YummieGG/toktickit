import { createHash, createHmac, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { prisma } from './prisma';

export const SESSION_COOKIE_NAME = 'tt_session';
export const SESSION_TTL_SECONDS = 8 * 60 * 60;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_COOLDOWN_MS = 15 * 60 * 1000;
export const LOGIN_FAILURE_LIMIT = 5;
export const AUTH_CLEANUP_BATCH_SIZE = 100;

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
    email: canonicalizeEmail(user.email),
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
  };
}

export const AUTH_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  passwordHash: true,
} as const;

export interface LoginAttemptKey {
  normalizedEmail: string;
  ipHash: string;
}

export function sessionTokenHash(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function getIpHmacSecret(): string {
  const configured = process.env.AUTH_IP_PEPPER;
  if (configured) return configured;
  throw new Error('AUTH_IP_PEPPER must be configured');
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

let cleanupPromise: Promise<void> | undefined;

async function cleanupExpiredAuthData(): Promise<void> {
  const now = new Date();
  await prisma.$executeRaw`
    WITH stale_sessions AS (
      SELECT "id"
      FROM "UserSession"
      WHERE "expiresAt" <= ${now} OR "revokedAt" IS NOT NULL
      ORDER BY "id"
      LIMIT ${AUTH_CLEANUP_BATCH_SIZE}
    )
    DELETE FROM "UserSession"
    WHERE "id" IN (SELECT "id" FROM stale_sessions)
  `;

  await prisma.$executeRaw`
    WITH stale_attempts AS (
      SELECT "id"
      FROM "LoginAttempt"
      WHERE "cooldownUntil" <= ${now}
         OR ("cooldownUntil" IS NULL AND "windowStartedAt" <= ${new Date(now.getTime() - LOGIN_WINDOW_MS)})
      ORDER BY "id"
      LIMIT ${AUTH_CLEANUP_BATCH_SIZE}
    )
    DELETE FROM "LoginAttempt"
    WHERE "id" IN (SELECT "id" FROM stale_attempts)
  `;
}

/** Cleanup is best effort and never blocks authentication. */
export function scheduleAuthCleanup(): void {
  if (cleanupPromise) return;

  cleanupPromise = cleanupExpiredAuthData()
    .catch(() => undefined)
    .finally(() => {
      cleanupPromise = undefined;
    });
}

export async function findSession(request: Request) {
  scheduleAuthCleanup();
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
        select: AUTH_USER_SELECT,
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
  scheduleAuthCleanup();
  const attempt = await prisma.loginAttempt.findUnique({
    where: loginAttemptWhere(normalizedEmail, ipHash),
    select: { cooldownUntil: true },
  });
  if (!attempt?.cooldownUntil) return 0;
  return Math.max(0, Math.ceil((attempt.cooldownUntil.getTime() - Date.now()) / 1000));
}

export interface FailedLoginState {
  failureCount: number;
  cooldownUntil: Date | null;
}

export async function recordFailedLogin(normalizedEmail: string, ipHash: string): Promise<FailedLoginState> {
  const now = new Date();
  const rows = await prisma.$queryRaw<FailedLoginState[]>`
    INSERT INTO "LoginAttempt" (
      "normalizedEmail", "ipHash", "failureCount", "windowStartedAt", "cooldownUntil", "updatedAt"
    )
    VALUES (${normalizedEmail}, ${ipHash}, 1, ${now}, NULL, ${now})
    ON CONFLICT ("normalizedEmail", "ipHash") DO UPDATE
    SET
      "failureCount" = CASE
        WHEN "LoginAttempt"."cooldownUntil" IS NOT NULL
          AND "LoginAttempt"."cooldownUntil" > EXCLUDED."updatedAt"
          THEN "LoginAttempt"."failureCount"
        WHEN EXCLUDED."updatedAt" - "LoginAttempt"."windowStartedAt"
          < (${LOGIN_WINDOW_MS} * INTERVAL '1 millisecond')
          THEN "LoginAttempt"."failureCount" + 1
        ELSE 1
      END,
      "windowStartedAt" = CASE
        WHEN "LoginAttempt"."cooldownUntil" IS NOT NULL
          AND "LoginAttempt"."cooldownUntil" > EXCLUDED."updatedAt"
          THEN "LoginAttempt"."windowStartedAt"
        WHEN EXCLUDED."updatedAt" - "LoginAttempt"."windowStartedAt"
          < (${LOGIN_WINDOW_MS} * INTERVAL '1 millisecond')
          THEN "LoginAttempt"."windowStartedAt"
        ELSE EXCLUDED."windowStartedAt"
      END,
      "cooldownUntil" = CASE
        WHEN "LoginAttempt"."cooldownUntil" IS NOT NULL
          AND "LoginAttempt"."cooldownUntil" > EXCLUDED."updatedAt"
          THEN "LoginAttempt"."cooldownUntil"
        WHEN (
          CASE
            WHEN EXCLUDED."updatedAt" - "LoginAttempt"."windowStartedAt"
              < (${LOGIN_WINDOW_MS} * INTERVAL '1 millisecond')
              THEN "LoginAttempt"."failureCount" + 1
            ELSE 1
          END
        ) >= ${LOGIN_FAILURE_LIMIT}
          THEN EXCLUDED."updatedAt" + (${LOGIN_COOLDOWN_MS} * INTERVAL '1 millisecond')
        ELSE NULL
      END,
      "updatedAt" = EXCLUDED."updatedAt"
    RETURNING "failureCount", "cooldownUntil"
  `;

  return rows[0] ?? { failureCount: 1, cooldownUntil: null };
}

export async function clearLoginFailures(normalizedEmail: string, ipHash: string): Promise<void> {
  await prisma.loginAttempt.updateMany({
    where: { normalizedEmail, ipHash },
    data: { failureCount: 0, windowStartedAt: new Date(), cooldownUntil: null },
  });
}

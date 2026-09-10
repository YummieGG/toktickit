import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  AUTH_ERROR_MESSAGES,
  canonicalizeEmail,
  clearLoginFailures,
  clearSessionCookie,
  clientIp,
  createSession,
  getLoginCooldownSeconds,
  isValidEmail,
  privacyPreservingIpKey,
  recordFailedLogin,
  setSessionCookie,
  userProjection,
} from '../lib/auth';
import { hashPassword, validatePassword, verifyPassword } from '../lib/password';
import { requireAuth } from '../middleware/auth';
import { requireTrustedOrigin } from '../middleware/csrf';

export const authRouter = Router();

function apiError(
  response: Response,
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
) {
  return response.status(status).json({ error: { code, message, ...(fields ? { fields } : {}) } });
}

function loginInputError(request: Request): Record<string, string> {
  const fields: Record<string, string> = {};
  const email = canonicalizeEmail(request.body?.email);
  if (!email) fields.email = 'Enter your email address';
  else if (!isValidEmail(email)) fields.email = 'Enter a valid email address';

  const passwordError = validatePassword(request.body?.password);
  if (passwordError) fields.password = passwordError.message;
  return fields;
}

authRouter.post('/login', requireTrustedOrigin, async (request: Request, response: Response) => {
  const fields = loginInputError(request);
  if (Object.keys(fields).length > 0) {
    return apiError(response, 400, 'VALIDATION_ERROR', 'Request is invalid', fields);
  }

  const email = canonicalizeEmail(request.body.email);
  const password = request.body.password as string;

  try {
    const ipHash = privacyPreservingIpKey(clientIp(request));
    const cooldownSeconds = await getLoginCooldownSeconds(email, ipHash);
    if (cooldownSeconds > 0) {
      response.setHeader('Retry-After', String(cooldownSeconds));
      return apiError(response, 429, 'LOGIN_COOLDOWN', 'Too many attempts. Try again later', {
        retryAfterSeconds: String(cooldownSeconds),
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        passwordHash: true,
      },
    });

    const valid = Boolean(
      user?.isActive
      && user.passwordHash
      && await verifyPassword(password, user.passwordHash),
    );
    if (!valid || !user) {
      await recordFailedLogin(email, ipHash);
      return apiError(response, 401, 'INVALID_CREDENTIALS', AUTH_ERROR_MESSAGES.invalidCredentials);
    }

    await clearLoginFailures(email, ipHash);
    const session = await createSession(user.id);
    setSessionCookie(response, session.token);
    return response.status(200).json({ data: userProjection(user) });
  } catch (error) {
    console.error('Error during login:', error);
    return apiError(response, 500, 'INTERNAL_ERROR', 'Unable to process the request');
  }
});

authRouter.post('/logout', requireTrustedOrigin, requireAuth, async (request: Request, response: Response) => {
  try {
    await prisma.userSession.update({
      where: { id: request.auth!.sessionId },
      data: { revokedAt: new Date() },
    });
    clearSessionCookie(response);
    return response.status(204).send();
  } catch (error) {
    console.error('Error during logout:', error);
    return apiError(response, 500, 'INTERNAL_ERROR', 'Unable to process the request');
  }
});

authRouter.get('/me', requireAuth, async (request: Request, response: Response) => {
  return response.status(200).json({ data: userProjection(request.auth!.user) });
});

authRouter.post('/change-password', requireTrustedOrigin, requireAuth, async (request: Request, response: Response) => {
  const currentPassword = request.body?.currentPassword;
  const newPassword = request.body?.newPassword;
  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return apiError(response, 400, 'INVALID_PASSWORD', passwordError.message, {
      newPassword: passwordError.message,
    });
  }
  if (typeof currentPassword !== 'string' || currentPassword.length === 0) {
    return apiError(response, 400, 'INVALID_PASSWORD', 'Current password is required', {
      currentPassword: 'Enter your current password',
    });
  }

  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: request.auth!.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        passwordHash: true,
      },
    });
    if (!currentUser || !await verifyPassword(currentPassword, currentUser.passwordHash)) {
      return apiError(response, 401, 'CURRENT_PASSWORD_INVALID', 'Current password is incorrect');
    }

    const newHash = await hashPassword(newPassword as string);
    const now = new Date();
    await prisma.$transaction(async (transaction: any) => {
      await transaction.user.update({
        where: { id: currentUser.id },
        data: { passwordHash: newHash, mustChangePassword: false },
      });
      await transaction.userSession.updateMany({
        where: { userId: currentUser.id, revokedAt: null },
        data: { revokedAt: now },
      });
    });

    clearSessionCookie(response);
    return response.status(200).json({
      data: userProjection({ ...currentUser, mustChangePassword: false }),
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return apiError(response, 500, 'INTERNAL_ERROR', 'Unable to process the request');
  }
});

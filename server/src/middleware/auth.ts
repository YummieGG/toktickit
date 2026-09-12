import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { AUTH_ERROR_MESSAGES, findSession } from '../lib/auth';
import type { UserRole } from '../../generated/prisma';

export async function requireAuth(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const session = await findSession(request);
    if (!session) {
      response.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: AUTH_ERROR_MESSAGES.invalidSession },
      });
      return;
    }

    request.auth = {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        isActive: session.user.isActive,
        mustChangePassword: session.user.mustChangePassword,
      },
      tokenHash: session.tokenHash,
      sessionId: session.id,
    };
    next();
  } catch (error) {
    console.error('Error validating session:', error);
    response.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Unable to process the request' },
    });
  }
}

/**
 * Enforce role authorization after requireAuth. Keeping this as middleware
 * makes the backend the security boundary even when a client route guard is
 * bypassed or a request is sent directly to the API.
 */
export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  return (request: Request, response: Response, next: NextFunction): void => {
    const user = request.auth?.user;
    if (!user) {
      response.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: AUTH_ERROR_MESSAGES.invalidSession },
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      response.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You do not have permission to perform this action' },
      });
      return;
    }

    next();
  };
}

/** Block normal application APIs until an initial password is replaced. */
export const requirePasswordChanged: RequestHandler = (request, response, next): void => {
  const user = request.auth?.user;
  if (!user) {
    response.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: AUTH_ERROR_MESSAGES.invalidSession },
    });
    return;
  }

  if (user.mustChangePassword) {
    response.status(403).json({
      error: {
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Change your password before continuing',
      },
    });
    return;
  }

  next();
};

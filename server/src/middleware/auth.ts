import type { NextFunction, Request, Response } from 'express';
import { AUTH_ERROR_MESSAGES, findSession } from '../lib/auth';

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

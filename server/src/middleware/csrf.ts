import type { NextFunction, Request, Response } from 'express';
import { AUTH_ERROR_MESSAGES } from '../lib/auth';

export function requireTrustedOrigin(request: Request, response: Response, next: NextFunction): void {
  const origin = request.get('origin');
  const configuredOrigin = process.env.APP_ORIGIN ?? 'http://localhost:5173';
  if (!origin || origin !== configuredOrigin) {
    response.status(403).json({
      error: { code: 'CSRF_ORIGIN_INVALID', message: AUTH_ERROR_MESSAGES.invalidOrigin },
    });
    return;
  }
  next();
}

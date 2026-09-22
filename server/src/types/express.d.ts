import type { UserRole } from '../../generated/prisma';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        user: {
          id: number;
          name: string;
          email: string;
          role: UserRole;
          isActive: boolean;
          mustChangePassword: boolean;
        };
        tokenHash: string;
        sessionId: number;
      };
    }
  }
}

export {};

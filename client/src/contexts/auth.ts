import { createContext, useContext } from 'react';

export type UserRole = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';

export const ROLE_LABELS: Record<UserRole, string> = {
  REQUESTER: 'Requester',
  IT_STAFF: 'IT Staff',
  ADMINISTRATOR: 'Administrator',
};

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fields: Record<string, string>;

  constructor(code: string, message: string, status: number, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  refresh: () => Promise<AuthUser | null>;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<AuthUser>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

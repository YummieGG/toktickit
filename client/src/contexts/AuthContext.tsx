import { createContext, useCallback, useContext, useEffect, useMemo, useState, type FC, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export type UserRole = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';

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

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  refresh: () => Promise<AuthUser | null>;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function readApiError(response: Response): Promise<never> {
  let payload: { error?: { code?: string; message?: string; fields?: Record<string, string> } } = {};
  try {
    payload = await response.json() as typeof payload;
  } catch {
    // Preserve a safe generic error for an empty or non-JSON response.
  }
  throw new ApiError(
    payload.error?.code ?? 'REQUEST_FAILED',
    payload.error?.message ?? 'Unable to process the request',
    response.status,
    payload.error?.fields ?? {},
  );
}

async function readUser(response: Response): Promise<AuthUser> {
  if (!response.ok) return readApiError(response);
  const payload = await response.json() as { data: AuthUser };
  return payload.data;
}

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (!response.ok) {
        setUser(null);
        return null;
      }
      const nextUser = await readUser(response);
      setUser(nextUser);
      return nextUser;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    void refresh().then((nextUser) => {
      if (cancelled) return;
      setIsLoading(false);
      if (!nextUser) navigate('/login', { replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [navigate, refresh]);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    let response: Response;
    try {
      response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
    } catch {
      throw new ApiError('NETWORK_ERROR', 'Unable to connect to the server', 0);
    }
    const nextUser = await readUser(response);
    setUser(nextUser);
    return nextUser;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) await readApiError(response);
    } finally {
      setUser(null);
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string, confirmPassword: string): Promise<AuthUser> => {
    let response: Response;
    try {
      response = await fetch('/api/auth/change-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
    } catch {
      throw new ApiError('NETWORK_ERROR', 'Unable to connect to the server', 0);
    }
    const nextUser = await readUser(response);
    setUser(null);
    return nextUser;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    refresh,
    login,
    logout,
    changePassword,
  }), [changePassword, isLoading, login, logout, refresh, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

import { useCallback, useEffect, useMemo, useState, type FC, type ReactNode } from 'react';
import { ApiError, AuthContext, type AuthContextValue, type AuthUser } from './auth';

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
    let mounted = true;
    void refresh().finally(() => {
      if (mounted) setIsLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [refresh]);

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
    }
  }, []);

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

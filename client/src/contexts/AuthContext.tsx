import { useCallback, useEffect, useMemo, useRef, useState, type FC, type ReactNode } from 'react';
import { ApiError, AuthContext, type AuthContextValue, type AuthUser } from './auth';

const AUTHENTICATED_SESSION_MARKER = 'toktickit.authenticated-session';

function readAuthenticatedSessionMarker(): boolean {
  try {
    return sessionStorage.getItem(AUTHENTICATED_SESSION_MARKER) === '1';
  } catch {
    return false;
  }
}

function writeAuthenticatedSessionMarker(isAuthenticated: boolean): void {
  try {
    if (isAuthenticated) sessionStorage.setItem(AUTHENTICATED_SESSION_MARKER, '1');
    else sessionStorage.removeItem(AUTHENTICATED_SESSION_MARKER);
  } catch {
    // Session storage is only a non-secret UX hint; auth remains server-authoritative.
  }
}

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
  const [sessionExpired, setSessionExpired] = useState(false);
  const hadAuthenticatedSession = useRef(readAuthenticatedSessionMarker());

  const refresh = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (!response.ok) {
        const expired = response.status === 401 && hadAuthenticatedSession.current;
        setSessionExpired(expired);
        if (response.status === 401) {
          hadAuthenticatedSession.current = false;
          writeAuthenticatedSessionMarker(false);
        }
        setUser(null);
        return null;
      }
      const nextUser = await readUser(response);
      setUser(nextUser);
      setSessionExpired(false);
      hadAuthenticatedSession.current = true;
      writeAuthenticatedSessionMarker(true);
      return nextUser;
    } catch {
      setUser(null);
      setSessionExpired(false);
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
    setSessionExpired(false);
    hadAuthenticatedSession.current = true;
    writeAuthenticatedSessionMarker(true);
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
      setSessionExpired(false);
      hadAuthenticatedSession.current = false;
      writeAuthenticatedSessionMarker(false);
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
    sessionExpired,
    refresh,
    login,
    logout,
    changePassword,
  }), [changePassword, isLoading, login, logout, refresh, sessionExpired, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

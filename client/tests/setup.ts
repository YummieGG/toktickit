import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});

export const authenticatedTestUser = {
  id: 1,
  name: 'Somchai Prasert',
  email: 'somchai.p@example.com',
  role: 'REQUESTER',
  isActive: true,
  mustChangePassword: false,
};

function isAuthBootstrapRequest(input: RequestInfo | URL): boolean {
  return String(input) === '/api/auth/me';
}

function authBootstrapResponse() {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({ data: authenticatedTestUser }),
  });
}

function isActionsTakenBootstrapRequest(input: RequestInfo | URL, init?: RequestInit): boolean {
  const url = String(input);
  return url.includes('/actions-taken') && (!init || !init.method || init.method.toUpperCase() === 'GET');
}

function actionsTakenBootstrapResponse() {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({
      data: [],
      ticketVersion: 1,
      pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
    }),
  });
}

export function authenticatedFetchMock<T extends (...args: any[]) => any>(
  implementation?: T,
  options?: { autoMockActionsTaken?: boolean },
) {
  type FetchImplementation = (input: RequestInfo | URL, ...args: any[]) => any;
  let defaultImplementation: FetchImplementation | undefined = implementation;
  const queuedImplementations: FetchImplementation[] = [];
  const autoMockActionsTaken = options?.autoMockActionsTaken ?? true;

  const mock = vi.fn((input: RequestInfo | URL, ...args: any[]) => {
    if (isAuthBootstrapRequest(input)) return authBootstrapResponse();
    if (autoMockActionsTaken && isActionsTakenBootstrapRequest(input, args[0])) {
      mock.mock.calls.pop();
      mock.mock.results.pop();
      return actionsTakenBootstrapResponse();
    }
    const nextImplementation = queuedImplementations.shift() ?? defaultImplementation;
    return nextImplementation?.(input, ...args);
  });

  mock.mockImplementation = ((nextImplementation: FetchImplementation) => {
    defaultImplementation = nextImplementation;
    return mock;
  }) as typeof mock.mockImplementation;

  mock.mockImplementationOnce = ((nextImplementation: FetchImplementation) => {
    queuedImplementations.push(nextImplementation);
    return mock;
  }) as typeof mock.mockImplementationOnce;

  mock.mockResolvedValueOnce = ((value: any) => {
    queuedImplementations.push(() => Promise.resolve(value));
    return mock;
  }) as typeof mock.mockResolvedValueOnce;

  mock.mockRejectedValueOnce = ((error: any) => {
    queuedImplementations.push(() => Promise.reject(error));
    return mock;
  }) as typeof mock.mockRejectedValueOnce;

  return mock;
}

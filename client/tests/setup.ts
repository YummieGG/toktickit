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

export function authenticatedFetchMock<T extends (...args: any[]) => any>(implementation?: T) {
  type FetchImplementation = (input: RequestInfo | URL, ...args: any[]) => any;
  let defaultImplementation: FetchImplementation | undefined = implementation;
  const queuedImplementations: FetchImplementation[] = [];

  const mock = vi.fn((input: RequestInfo | URL, ...args: any[]) => {
    if (isAuthBootstrapRequest(input)) return authBootstrapResponse();
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

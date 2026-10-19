import type { UserRole } from '../contexts/auth';

export function getHomePath(role: UserRole): string {
  if (role === 'IT_STAFF' || role === 'ADMINISTRATOR') return '/staff/dashboard';
  return '/dashboard';
}

import type { UserRole } from '../contexts/auth';

export function getHomePath(role: UserRole): string {
  if (role === 'IT_STAFF') return '/staff/tickets';
  if (role === 'ADMINISTRATOR') return '/admin/users';
  return '/tickets';
}

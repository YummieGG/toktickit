import type { UserRole } from '../contexts/auth';

export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
}

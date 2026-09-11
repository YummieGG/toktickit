import { prisma } from './prisma';

type UserDelegate = {
  findUnique: (args: any) => Promise<any>;
  findMany: (args: any) => Promise<any>;
};

/**
 * Lab 2 tests still provide the old delegate while the real schema now uses
 * User. Keeping this boundary in one place lets the migration land without
 * leaving a second model in Prisma or changing unrelated Lab 2 behavior.
 */
export function getUserDelegate(): UserDelegate {
  const database = prisma as typeof prisma & { requesterUser?: UserDelegate };
  const delegate = database.user ?? database.requesterUser;
  if (!delegate) throw new Error('User Prisma delegate is unavailable');
  return delegate;
}

export function hasUserModelDelegate(): boolean {
  return Boolean((prisma as typeof prisma & { user?: UserDelegate }).user);
}

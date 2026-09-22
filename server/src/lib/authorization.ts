import type { Request, Response } from 'express';
import type { Prisma, UserRole } from '../../generated/prisma';
import { prisma } from './prisma';

export type AuthenticatedUser = NonNullable<Request['auth']>['user'];

export const NOT_FOUND_ERROR = {
  error: { code: 'NOT_FOUND', message: 'Resource not found' },
} as const;

export const FORBIDDEN_ERROR = {
  error: { code: 'FORBIDDEN', message: 'You do not have permission to perform this action' },
} as const;

export function getAuthenticatedUser(request: Request): AuthenticatedUser {
  if (!request.auth) {
    throw new Error('Authenticated user is required');
  }
  return request.auth.user;
}

export function sendNotFound(response: Response): void {
  response.status(404).json(NOT_FOUND_ERROR);
}

export function sendForbidden(response: Response): void {
  response.status(403).json(FORBIDDEN_ERROR);
}

/**
 * Build a ticket predicate which hides ownership differences from Requesters.
 * Staff/Admin are intentionally allowed to resolve any ticket for read-only
 * operations in this slice; their mutation workflow belongs to Issue #41.
 */
export function ticketAccessWhere(user: AuthenticatedUser, ticketId: number): Prisma.TicketWhereInput {
  if (user.role === 'REQUESTER') {
    return { id: ticketId, requesterId: user.id };
  }
  if (user.role === 'IT_STAFF' || user.role === 'ADMINISTRATOR') {
    return { id: ticketId };
  }
  return { id: -1 };
}

export async function findTicketForUser<T extends Prisma.TicketSelect>(
  user: AuthenticatedUser,
  ticketId: number,
  select: T,
): Promise<Prisma.TicketGetPayload<{ select: T }> | null> {
  return prisma.ticket.findFirst({
    where: ticketAccessWhere(user, ticketId),
    select,
  }) as Promise<Prisma.TicketGetPayload<{ select: T }> | null>;
}

export async function ensureTicketAccessible(
  user: AuthenticatedUser,
  ticketId: number,
  response: Response,
): Promise<boolean> {
  const ticket = await findTicketForUser(user, ticketId, { id: true });
  if (!ticket) {
    sendNotFound(response);
    return false;
  }
  return true;
}

export function attachmentAccessWhere(user: AuthenticatedUser, attachmentId: number): Prisma.AttachmentWhereInput {
  if (user.role === 'REQUESTER') {
    return { id: attachmentId, ticket: { requesterId: user.id } };
  }
  if (user.role === 'IT_STAFF' || user.role === 'ADMINISTRATOR') {
    return { id: attachmentId };
  }
  return { id: -1 };
}

export async function findAttachmentForUser<T extends Prisma.AttachmentSelect>(
  user: AuthenticatedUser,
  attachmentId: number,
  select: T,
): Promise<Prisma.AttachmentGetPayload<{ select: T }> | null> {
  return prisma.attachment.findFirst({
    where: attachmentAccessWhere(user, attachmentId),
    select,
  }) as Promise<Prisma.AttachmentGetPayload<{ select: T }> | null>;
}

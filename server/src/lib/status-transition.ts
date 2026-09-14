import type { TicketStatus } from '../../generated/prisma';

export const ALL_STATUSES = [
  'NEW',
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_REQUESTER',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
  'CANCELLED',
] as const satisfies readonly TicketStatus[];

export const STATUS_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  NEW: ['OPEN', 'CANCELLED'],
  OPEN: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['IN_PROGRESS', 'CANCELLED'],
  CANCELLED: ['REOPENED'],
};

export const CONFIRMATION_REQUIRED_STATUSES = new Set<TicketStatus>([
  'CANCELLED',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
]);

export function isAllowedTransition(from: TicketStatus, to: TicketStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function requiresConfirmation(status: TicketStatus): boolean {
  return CONFIRMATION_REQUIRED_STATUSES.has(status);
}

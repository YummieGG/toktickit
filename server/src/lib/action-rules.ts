import crypto from 'crypto';
import type { ActionStatus, TicketStatus, UserRole } from '../../generated/prisma';

export const TERMINAL_ACTION_STATUSES: readonly ActionStatus[] = ['COMPLETED', 'CANCELLED'];
export const ACTIVE_ACTION_STATUSES: readonly ActionStatus[] = ['PENDING', 'IN_PROGRESS'];
export const ALL_ACTION_STATUSES: readonly ActionStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export const TERMINAL_TICKET_STATUSES: readonly TicketStatus[] = ['RESOLVED', 'CLOSED', 'CANCELLED'];
export const ACTIVE_TICKET_STATUSES: readonly TicketStatus[] = [
  'NEW',
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_REQUESTER',
  'REOPENED',
];

export interface UserSummary {
  id: number;
  name: string;
  role: UserRole;
}

export interface AssigneeSummary {
  id: number;
  name: string;
  role: UserRole;
  isActive: boolean;
}

export interface ActionProjection {
  id: number;
  ticketId: number;
  description: string;
  result: string | null;
  status: ActionStatus;
  performedBy: UserSummary;
  assignee: AssigneeSummary | null;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export function normalizeActionText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.replace(/\r\n|\r/g, '\n');
}

export function isValidIdempotencyKey(key: unknown): boolean {
  if (typeof key !== 'string') return false;
  return /^[A-Za-z0-9_-]{8,128}$/.test(key);
}

export function isAllowedActionTransition(current: ActionStatus, next: ActionStatus): boolean {
  if (current === next) return false;
  switch (current) {
    case 'PENDING':
      return next === 'IN_PROGRESS' || next === 'COMPLETED' || next === 'CANCELLED';
    case 'IN_PROGRESS':
      return next === 'COMPLETED' || next === 'CANCELLED';
    case 'COMPLETED':
    case 'CANCELLED':
      return false;
    default:
      return false;
  }
}

export function isActionParentReadOnly(status: TicketStatus): boolean {
  return TERMINAL_TICKET_STATUSES.includes(status);
}

export function computeActionFingerprint(payload: {
  description: string;
  result?: string | null;
  assigneeId?: number | null;
  followUpRequired?: boolean;
  followUpNote?: string | null;
  attachmentNotes?: string | null;
}): string {
  const normalized = {
    description: normalizeActionText(payload.description) ?? '',
    result: normalizeActionText(payload.result) ?? null,
    assigneeId: payload.assigneeId ?? null,
    followUpRequired: Boolean(payload.followUpRequired),
    followUpNote: payload.followUpRequired ? normalizeActionText(payload.followUpNote) ?? null : null,
    attachmentNotes: normalizeActionText(payload.attachmentNotes) ?? null,
  };
  const canonical = JSON.stringify(normalized, Object.keys(normalized).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export function projectAction(action: {
  id: number;
  ticketId: number;
  description: string;
  result: string | null;
  status: ActionStatus;
  performedBy: { id: number; name: string; role: UserRole };
  assignee: { id: number; name: string; role: UserRole; isActive: boolean } | null;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  cancelReason: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  version: number;
}): ActionProjection {
  return {
    id: action.id,
    ticketId: action.ticketId,
    description: action.description,
    result: action.result,
    status: action.status,
    performedBy: {
      id: action.performedBy.id,
      name: action.performedBy.name,
      role: action.performedBy.role,
    },
    assignee: action.assignee
      ? {
          id: action.assignee.id,
          name: action.assignee.name,
          role: action.assignee.role,
          isActive: action.assignee.isActive,
        }
      : null,
    followUpRequired: action.followUpRequired,
    followUpNote: action.followUpNote,
    attachmentNotes: action.attachmentNotes,
    cancelReason: action.cancelReason,
    createdAt: action.createdAt instanceof Date ? action.createdAt.toISOString() : action.createdAt,
    updatedAt: action.updatedAt instanceof Date ? action.updatedAt.toISOString() : action.updatedAt,
    version: action.version,
  };
}

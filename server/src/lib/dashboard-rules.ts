import type { ActionStatus, RequestedPriority, TicketStatus, UserRole } from '../../generated/prisma';
import { projectAction, type ActionProjection } from './action-rules';

export interface DashboardDateWindow {
  from: string;
  to: string;
  start: Date;
  end: Date;
}

export interface TicketDashboardRow {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: TicketStatus;
  itPriority: RequestedPriority;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface StaffActionRow extends ActionProjection {
  ticket: {
    id: number;
    ticketNumber: string;
    summary: string;
    currentStatus: TicketStatus;
  };
}

export interface RequesterDashboardMetrics {
  openTickets: number;
  waitingForYou: number;
  recentlyUpdated: number;
  recentlyResolved: number;
}

export interface RequesterDashboardResponse {
  metrics: RequesterDashboardMetrics;
  recentTickets: TicketDashboardRow[];
  attentionTickets: TicketDashboardRow[];
  resolvedTickets: TicketDashboardRow[];
  generatedAt: string;
  timezone: 'Asia/Bangkok';
  window: { from: string; to: string };
  listLimit: 5;
}

export interface StaffDashboardMetrics {
  unassignedTickets: number;
  myTickets: number;
  myActionsTaken: number;
  ticketsByStatus: Record<TicketStatus, number>;
  activeTicketsByItPriority: Record<RequestedPriority, number>;
}

export interface StaffDashboardResponse {
  metrics: StaffDashboardMetrics;
  recentTickets: TicketDashboardRow[];
  urgentTickets: TicketDashboardRow[];
  myActions: StaffActionRow[];
  generatedAt: string;
  timezone: 'Asia/Bangkok';
  window: { from: string; to: string };
  listLimit: 5;
}

export const BANGKOK_TIMEZONE = 'Asia/Bangkok' as const;
export const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

export function getBangkokSevenDayWindow(now: Date = new Date()): DashboardDateWindow {
  const bangkokNow = new Date(now.getTime() + BANGKOK_OFFSET_MS);
  const year = bangkokNow.getUTCFullYear();
  const month = bangkokNow.getUTCMonth();
  const day = bangkokNow.getUTCDate();

  // 6 calendar days ago at 00:00:00.000 in Asia/Bangkok
  const startUtcMs = Date.UTC(year, month, day - 6, 0, 0, 0, 0) - BANGKOK_OFFSET_MS;
  const start = new Date(startUtcMs);
  const end = now;

  return {
    from: start.toISOString(),
    to: end.toISOString(),
    start,
    end,
  };
}

export function mapTicketDashboardRow(ticket: {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: TicketStatus;
  itPriority: RequestedPriority;
  updatedAt: Date | string;
  resolvedAt?: Date | string | null;
}): TicketDashboardRow {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    summary: ticket.summary,
    currentStatus: ticket.currentStatus,
    itPriority: ticket.itPriority,
    updatedAt: ticket.updatedAt instanceof Date ? ticket.updatedAt.toISOString() : String(ticket.updatedAt),
    resolvedAt: ticket.resolvedAt
      ? ticket.resolvedAt instanceof Date
        ? ticket.resolvedAt.toISOString()
        : String(ticket.resolvedAt)
      : null,
  };
}

export function mapStaffActionRow(action: {
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
  ticket: {
    id: number;
    ticketNumber: string;
    summary: string;
    currentStatus: TicketStatus;
  };
}): StaffActionRow {
  const baseProjection = projectAction(action);
  return {
    ...baseProjection,
    ticket: {
      id: action.ticket.id,
      ticketNumber: action.ticket.ticketNumber,
      summary: action.ticket.summary,
      currentStatus: action.ticket.currentStatus,
    },
  };
}

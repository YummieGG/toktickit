import type { ActionProjection } from './action';
import type { TicketPriority, TicketStatus } from './ticket';

export interface TicketDashboardRow {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: TicketStatus;
  itPriority: TicketPriority;
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
  timezone: string;
  window: { from: string; to: string };
  listLimit: number;
}

export interface StaffDashboardMetrics {
  unassignedTickets: number;
  myTickets: number;
  myActionsTaken: number;
  ticketsByStatus: Record<TicketStatus, number>;
  activeTicketsByItPriority: Record<TicketPriority, number>;
}

export interface StaffDashboardResponse {
  metrics: StaffDashboardMetrics;
  recentTickets: TicketDashboardRow[];
  urgentTickets: TicketDashboardRow[];
  myActions: StaffActionRow[];
  generatedAt: string;
  timezone: string;
  window: { from: string; to: string };
  listLimit: number;
}

export interface StaffActionListResponse {
  data: StaffActionRow[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

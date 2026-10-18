import { Router, type Request, type Response } from 'express';
import type { RequestedPriority, TicketStatus } from '../../generated/prisma';
import { prisma } from '../lib/prisma';
import {
  BANGKOK_TIMEZONE,
  getBangkokSevenDayWindow,
  mapStaffActionRow,
  mapTicketDashboardRow,
  type RequesterDashboardResponse,
  type StaffDashboardResponse,
} from '../lib/dashboard-rules';
import { ACTIVE_TICKET_STATUSES } from '../lib/action-rules';
import { ALL_STATUSES } from '../lib/status-transition';
import { internalError } from '../lib/validation';
import { getAuthenticatedUser } from '../lib/authorization';
import { requireAuth, requirePasswordChanged, requireRole } from '../middleware/auth';

export const dashboardsRouter = Router();

dashboardsRouter.use(requireAuth, requirePasswordChanged);

const ALL_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const satisfies readonly RequestedPriority[];

// GET /api/dashboards/requester — Requester only.
dashboardsRouter.get('/requester', requireRole('REQUESTER'), async (request: Request, response: Response) => {
  const user = getAuthenticatedUser(request);
  const now = new Date();
  const window = getBangkokSevenDayWindow(now);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const [
          openTickets,
          waitingForYou,
          recentlyUpdated,
          recentlyResolved,
          recentTickets,
          attentionTickets,
          resolvedTickets,
        ] = await Promise.all([
          tx.ticket.count({
            where: {
              requesterId: user.id,
              currentStatus: { in: [...ACTIVE_TICKET_STATUSES] },
            },
          }),
          tx.ticket.count({
            where: {
              requesterId: user.id,
              currentStatus: 'WAITING_FOR_REQUESTER',
            },
          }),
          tx.ticket.count({
            where: {
              requesterId: user.id,
              updatedAt: { gte: window.start, lte: window.end },
            },
          }),
          tx.ticket.count({
            where: {
              requesterId: user.id,
              currentStatus: { in: ['RESOLVED', 'CLOSED'] },
              resolvedAt: { gte: window.start, lte: window.end },
            },
          }),
          tx.ticket.findMany({
            where: { requesterId: user.id },
            orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
            take: 5,
            select: {
              id: true,
              ticketNumber: true,
              summary: true,
              currentStatus: true,
              itPriority: true,
              updatedAt: true,
              resolvedAt: true,
            },
          }),
          tx.ticket.findMany({
            where: {
              requesterId: user.id,
              currentStatus: 'WAITING_FOR_REQUESTER',
            },
            orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
            take: 5,
            select: {
              id: true,
              ticketNumber: true,
              summary: true,
              currentStatus: true,
              itPriority: true,
              updatedAt: true,
              resolvedAt: true,
            },
          }),
          tx.ticket.findMany({
            where: {
              requesterId: user.id,
              currentStatus: { in: ['RESOLVED', 'CLOSED'] },
              resolvedAt: { gte: window.start, lte: window.end },
            },
            orderBy: [{ resolvedAt: 'desc' }, { id: 'desc' }],
            take: 5,
            select: {
              id: true,
              ticketNumber: true,
              summary: true,
              currentStatus: true,
              itPriority: true,
              updatedAt: true,
              resolvedAt: true,
            },
          }),
        ]);

        const dashboardResponse: RequesterDashboardResponse = {
          metrics: {
            openTickets,
            waitingForYou,
            recentlyUpdated,
            recentlyResolved,
          },
          recentTickets: recentTickets.map(mapTicketDashboardRow),
          attentionTickets: attentionTickets.map(mapTicketDashboardRow),
          resolvedTickets: resolvedTickets.map(mapTicketDashboardRow),
          generatedAt: now.toISOString(),
          timezone: BANGKOK_TIMEZONE,
          window: { from: window.from, to: window.to },
          listLimit: 5,
        };

        return dashboardResponse;
      },
      { isolationLevel: 'RepeatableRead' },
    );

    return response.status(200).json(result);
  } catch (error) {
    console.error('Error calculating requester dashboard:', error);
    return internalError(response);
  }
});

// GET /api/dashboards/staff — IT Staff and Administrator only.
dashboardsRouter.get('/staff', requireRole('IT_STAFF', 'ADMINISTRATOR'), async (request: Request, response: Response) => {
  const user = getAuthenticatedUser(request);
  const now = new Date();
  const window = getBangkokSevenDayWindow(now);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const [
          unassignedTickets,
          myTickets,
          myActionsTaken,
          statusGroups,
          priorityGroups,
          recentTickets,
          urgentTickets,
          myActions,
        ] = await Promise.all([
          tx.ticket.count({
            where: {
              ownerId: null,
              currentStatus: { in: [...ACTIVE_TICKET_STATUSES] },
            },
          }),
          tx.ticket.count({
            where: {
              ownerId: user.id,
              currentStatus: { in: [...ACTIVE_TICKET_STATUSES] },
            },
          }),
          tx.actionTaken.count({
            where: {
              assigneeId: user.id,
              status: { in: ['PENDING', 'IN_PROGRESS'] },
            },
          }),
          tx.ticket.groupBy({
            by: ['currentStatus'],
            _count: { _all: true },
          }),
          tx.ticket.groupBy({
            by: ['itPriority'],
            where: {
              currentStatus: { in: [...ACTIVE_TICKET_STATUSES] },
            },
            _count: { _all: true },
          }),
          tx.ticket.findMany({
            orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
            take: 5,
            select: {
              id: true,
              ticketNumber: true,
              summary: true,
              currentStatus: true,
              itPriority: true,
              updatedAt: true,
              resolvedAt: true,
            },
          }),
          tx.ticket.findMany({
            where: {
              currentStatus: { in: [...ACTIVE_TICKET_STATUSES] },
              itPriority: { in: ['CRITICAL', 'HIGH'] },
            },
            orderBy: [{ itPriority: 'desc' }, { updatedAt: 'desc' }, { id: 'desc' }],
            take: 5,
            select: {
              id: true,
              ticketNumber: true,
              summary: true,
              currentStatus: true,
              itPriority: true,
              updatedAt: true,
              resolvedAt: true,
            },
          }),
          tx.actionTaken.findMany({
            where: {
              assigneeId: user.id,
              status: { in: ['PENDING', 'IN_PROGRESS'] },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 5,
            include: {
              performedBy: { select: { id: true, name: true, role: true } },
              assignee: { select: { id: true, name: true, role: true, isActive: true } },
              ticket: {
                select: {
                  id: true,
                  ticketNumber: true,
                  summary: true,
                  currentStatus: true,
                },
              },
            },
          }),
        ]);

        const ticketsByStatus: Record<TicketStatus, number> = {
          NEW: 0,
          OPEN: 0,
          IN_PROGRESS: 0,
          WAITING_FOR_REQUESTER: 0,
          RESOLVED: 0,
          CLOSED: 0,
          REOPENED: 0,
          CANCELLED: 0,
        };
        for (const group of statusGroups) {
          ticketsByStatus[group.currentStatus] = group._count._all;
        }

        const activeTicketsByItPriority: Record<RequestedPriority, number> = {
          LOW: 0,
          MEDIUM: 0,
          HIGH: 0,
          CRITICAL: 0,
        };
        for (const group of priorityGroups) {
          activeTicketsByItPriority[group.itPriority] = group._count._all;
        }

        const dashboardResponse: StaffDashboardResponse = {
          metrics: {
            unassignedTickets,
            myTickets,
            myActionsTaken,
            ticketsByStatus,
            activeTicketsByItPriority,
          },
          recentTickets: recentTickets.map(mapTicketDashboardRow),
          urgentTickets: urgentTickets.map(mapTicketDashboardRow),
          myActions: myActions.map(mapStaffActionRow),
          generatedAt: now.toISOString(),
          timezone: BANGKOK_TIMEZONE,
          window: { from: window.from, to: window.to },
          listLimit: 5,
        };

        return dashboardResponse;
      },
      { isolationLevel: 'RepeatableRead' },
    );

    return response.status(200).json(result);
  } catch (error) {
    console.error('Error calculating staff dashboard:', error);
    return internalError(response);
  }
});

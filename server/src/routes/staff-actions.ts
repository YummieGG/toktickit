import { Router, type Request, type Response } from 'express';
import type { ActionStatus } from '../../generated/prisma';
import { prisma } from '../lib/prisma';
import { ALL_ACTION_STATUSES } from '../lib/action-rules';
import { mapStaffActionRow } from '../lib/dashboard-rules';
import { getAuthenticatedUser } from '../lib/authorization';
import {
  getSingleStringParam,
  internalError,
  isPositiveIntegerString,
  validationError,
  type ValidationErrorDetail,
} from '../lib/validation';
import { requireAuth, requirePasswordChanged, requireRole } from '../middleware/auth';

export const staffActionsRouter = Router();

staffActionsRouter.use(requireAuth, requirePasswordChanged, requireRole('IT_STAFF', 'ADMINISTRATOR'));

const ALLOWED_PAGE_SIZES = [5, 10, 20] as const;

interface ValidatedStaffActionsQuery {
  assignee: 'me';
  statuses?: ActionStatus[];
  page: number;
  pageSize: (typeof ALLOWED_PAGE_SIZES)[number];
}

function parseStaffActionsQuery(query: Request['query']): { success: true; data: ValidatedStaffActionsQuery } | { success: false; details: ValidationErrorDetail[] } {
  const details: ValidationErrorDetail[] = [];

  const rawAssignee = getSingleStringParam(query.assignee);
  if (rawAssignee === undefined || rawAssignee !== 'me') {
    details.push({ field: 'assignee', message: "assignee must be 'me'" });
  }

  let statuses: ActionStatus[] | undefined;
  if (query.statuses !== undefined) {
    const rawStatuses = getSingleStringParam(query.statuses);
    if (!rawStatuses) {
      details.push({ field: 'statuses', message: 'statuses must be a non-empty string' });
    } else {
      const parts = rawStatuses.split(',').map((s) => s.trim());
      const invalid = parts.filter((s) => !ALL_ACTION_STATUSES.includes(s as ActionStatus) || s.length === 0);
      if (invalid.length > 0 || parts.length === 0) {
        details.push({ field: 'statuses', message: `statuses must be comma-separated list of: ${ALL_ACTION_STATUSES.join(', ')}` });
      } else {
        statuses = parts as ActionStatus[];
      }
    }
  }

  const pageRaw = query.page === undefined ? '1' : getSingleStringParam(query.page);
  const pageSizeRaw = query.pageSize === undefined ? '10' : getSingleStringParam(query.pageSize);

  if (pageRaw === undefined || !isPositiveIntegerString(pageRaw.trim())) {
    details.push({ field: 'page', message: 'page must be an integer greater than or equal to 1' });
  }

  const pageSizeNum = Number(pageSizeRaw?.trim());
  if (pageSizeRaw === undefined || !isPositiveIntegerString(pageSizeRaw.trim()) || !ALLOWED_PAGE_SIZES.includes(pageSizeNum as (typeof ALLOWED_PAGE_SIZES)[number])) {
    details.push({ field: 'pageSize', message: `pageSize must be one of ${ALLOWED_PAGE_SIZES.join(', ')}` });
  }

  if (details.length > 0) {
    return { success: false, details };
  }

  return {
    success: true,
    data: {
      assignee: 'me',
      ...(statuses ? { statuses } : {}),
      page: Number(pageRaw?.trim()),
      pageSize: pageSizeNum as (typeof ALLOWED_PAGE_SIZES)[number],
    },
  };
}

// GET /api/staff/actions-taken — IT Staff and Administrator only.
staffActionsRouter.get('/', async (request: Request, response: Response) => {
  const parsed = parseStaffActionsQuery(request.query);
  if (!parsed.success) {
    return validationError(response, parsed.details, 'INVALID_QUERY');
  }

  const user = getAuthenticatedUser(request);
  const { statuses, page, pageSize } = parsed.data;

  const where = {
    assigneeId: user.id,
    ...(statuses ? { status: { in: statuses } } : {}),
  };

  try {
    const [actions, totalItems] = await Promise.all([
      prisma.actionTaken.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
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
      prisma.actionTaken.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    return response.status(200).json({
      data: actions.map(mapStaffActionRow),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1 && totalItems > 0,
      },
    });
  } catch (error) {
    console.error('Error fetching staff actions-taken:', error);
    return internalError(response);
  }
});

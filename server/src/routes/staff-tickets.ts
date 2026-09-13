import { Router, type Request, type Response } from 'express';
import { Prisma } from '../../generated/prisma';
import { prisma } from '../lib/prisma';
import { ticketSummarySelect } from '../lib/ticket-selects';
import { buildStaffQueueOrderBy, buildStaffQueueWhere, parseStaffQueueQuery } from '../lib/staff-queue';
import { internalError, validationError } from '../lib/validation';
import { requireAuth, requirePasswordChanged, requireRole } from '../middleware/auth';

export const staffTicketsRouter = Router();
staffTicketsRouter.use(requireAuth, requirePasswordChanged, requireRole('IT_STAFF', 'ADMINISTRATOR'));

staffTicketsRouter.get('/', async (request: Request, response: Response) => {
  const parsed = parseStaffQueueQuery(request.query as Record<string, unknown>);
  if (!parsed.success) return validationError(response, parsed.details, 'INVALID_QUERY');

  const where = buildStaffQueueWhere(parsed.data);
  const { page, pageSize } = parsed.data;
  try {
    const [tickets, totalItems] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: buildStaffQueueOrderBy(parsed.data),
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: ticketSummarySelect,
      }),
      prisma.ticket.count({ where }),
    ]);
    const totalPages = Math.ceil(totalItems / pageSize);
    return response.status(200).json({
      data: tickets,
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
    if (error instanceof Prisma.PrismaClientKnownRequestError) console.error('Staff queue database error:', error.code);
    else console.error('Error fetching staff queue:', error);
    return internalError(response);
  }
});

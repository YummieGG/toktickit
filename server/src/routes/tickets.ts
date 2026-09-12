import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { Prisma } from '../../generated/prisma';
import { prisma } from '../lib/prisma';
import { generateTicketNumber } from '../lib/ticket-number';
import {
  findTicketForUser,
  getAuthenticatedUser,
  sendNotFound,
  type AuthenticatedUser,
} from '../lib/authorization';
import {
  getUploadsDirectory,
  MAX_ACTIVE_ATTACHMENTS,
  MAX_ATTACHMENT_SIZE_BYTES,
  prepareAttachment,
  removeStoredFiles,
  storePreparedAttachment,
  validateAttachmentFile,
  type PreparedAttachment,
} from '../lib/attachment-policy';
import { requireAuth, requirePasswordChanged, requireRole } from '../middleware/auth';
import { requireTrustedOrigin } from '../middleware/csrf';
import {
  getSingleStringParam,
  internalError,
  isPositiveIntegerString,
  type ValidationErrorDetail,
  validationError,
} from '../lib/validation';

export const ticketsRouter = Router();

ticketsRouter.use(requireAuth, requirePasswordChanged);

const TICKET_STATUSES = ['NEW'] as const;
const REQUESTED_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const TICKET_SORT_FIELDS = [
  'ticketDate',
  'ticketNumber',
  'summary',
  'requestedPriority',
  'currentStatus',
] as const;
const SORT_ORDERS = ['asc', 'desc'] as const;
const PAGE_SIZES = [5, 10, 20] as const;

const ticketSummarySelect = {
  id: true,
  ticketNumber: true,
  ticketDate: true,
  summary: true,
  requestedPriority: true,
  itPriority: true,
  currentStatus: true,
  owner: { select: { id: true, name: true, email: true, role: true } },
  requester: { select: { id: true, name: true, email: true, role: true } },
  updatedAt: true,
  problemAppearsResolvedAt: true,
  category: { select: { id: true, name: true } },
} satisfies Prisma.TicketSelect;

const ticketDetailSelect = {
  ...ticketSummarySelect,
  description: true,
  relatedSystem: { select: { id: true, name: true } },
  attachments: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      originalName: true,
      storedName: true,
      mimeType: true,
      sizeBytes: true,
      isRemoved: true,
      removalReason: true,
      removedAt: true,
      createdAt: true,
      ticketId: true,
    },
  },
  comments: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      ticketId: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, name: true, role: true } },
    },
  },
  createdAt: true,
} satisfies Prisma.TicketSelect;

function parsePositiveIntegerField(
  value: unknown,
  field: string,
  details: ValidationErrorDetail[],
  required: boolean,
): number | null | undefined {
  const normalized = typeof value === 'string' ? value.trim() : value;
  if (normalized === undefined || normalized === null || normalized === '') {
    if (required) details.push({ field, message: `${field} is required` });
    return required ? undefined : null;
  }
  if ((typeof normalized !== 'string' && typeof normalized !== 'number') || !isPositiveIntegerString(String(normalized))) {
    details.push({ field, message: `${field} must be a valid integer` });
    return undefined;
  }
  return Number(normalized);
}

async function storePreparedAttachments(
  uploadsDirectory: string,
  attachments: PreparedAttachment[],
): Promise<string[]> {
  const storedPaths: string[] = [];
  try {
    for (const attachment of attachments) {
      storedPaths.push(await storePreparedAttachment(uploadsDirectory, attachment));
    }
    return storedPaths;
  } catch (error) {
    await removeStoredFiles(storedPaths);
    throw error;
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES, files: 10 },
});

/** Authentication and role checks intentionally run before multer. */
const handleMultipartUpload = (request: Request, response: Response, next: NextFunction): void => {
  if (!(request.headers['content-type'] || '').includes('multipart/form-data')) {
    next();
    return;
  }

  upload.array('attachments', 10)(request, response, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'File exceeds the 5 MB limit'
        : error.code === 'LIMIT_UNEXPECTED_FILE'
          ? (error.field === 'attachments'
            ? 'Maximum 5 attachments allowed per ticket'
            : 'Files must use the attachments field')
          : error.message;
      validationError(response, [{ field: 'attachments', message }]);
      return;
    }
    if (error) {
      validationError(response, [{ field: 'attachments', message: 'Failed to process file upload' }]);
      return;
    }
    next();
  });
};

interface ValidatedTicketsQuery {
  search?: string;
  categoryId?: number;
  status?: (typeof TICKET_STATUSES)[number];
  priority?: (typeof REQUESTED_PRIORITIES)[number];
  sortBy: (typeof TICKET_SORT_FIELDS)[number];
  sortOrder: (typeof SORT_ORDERS)[number];
  page: number;
  pageSize: (typeof PAGE_SIZES)[number];
}

type TicketsQueryParseResult =
  | { success: true; data: ValidatedTicketsQuery }
  | { success: false; details: ValidationErrorDetail[] };

function parseTicketsQuery(query: Request['query']): TicketsQueryParseResult {
  const details: ValidationErrorDetail[] = [];
  const categoryId = parsePositiveIntegerField(query.category, 'category', details, false);
  const search = getSingleStringParam(query.search);
  const status = getSingleStringParam(query.status);
  const priority = getSingleStringParam(query.priority);
  const sortBy = getSingleStringParam(query.sortBy) ?? 'ticketDate';
  const sortOrder = getSingleStringParam(query.sortOrder) ?? 'desc';
  const pageValue = getSingleStringParam(query.page) ?? '1';
  const pageSizeValue = getSingleStringParam(query.pageSize) ?? '10';

  if (query.search !== undefined && search === undefined) {
    details.push({ field: 'search', message: 'search must be a string' });
  }
  if (query.status !== undefined && (!status || !TICKET_STATUSES.includes(status as (typeof TICKET_STATUSES)[number]))) {
    details.push({ field: 'status', message: `status must be one of ${TICKET_STATUSES.join(', ')}` });
  }
  if (query.priority !== undefined && (!priority || !REQUESTED_PRIORITIES.includes(priority as (typeof REQUESTED_PRIORITIES)[number]))) {
    details.push({ field: 'priority', message: `priority must be one of ${REQUESTED_PRIORITIES.join(', ')}` });
  }
  if (query.sortBy !== undefined && getSingleStringParam(query.sortBy) === undefined) {
    details.push({ field: 'sortBy', message: 'sortBy must be a string' });
  }
  if (!TICKET_SORT_FIELDS.includes(sortBy as (typeof TICKET_SORT_FIELDS)[number])) {
    details.push({ field: 'sortBy', message: `sortBy must be one of ${TICKET_SORT_FIELDS.join(', ')}` });
  }
  if (query.sortOrder !== undefined && getSingleStringParam(query.sortOrder) === undefined) {
    details.push({ field: 'sortOrder', message: 'sortOrder must be a string' });
  }
  if (!SORT_ORDERS.includes(sortOrder as (typeof SORT_ORDERS)[number])) {
    details.push({ field: 'sortOrder', message: 'sortOrder must be asc or desc' });
  }
  if (query.page !== undefined && getSingleStringParam(query.page) === undefined) {
    details.push({ field: 'page', message: 'page must be a string integer' });
  }
  if (!isPositiveIntegerString(pageValue)) {
    details.push({ field: 'page', message: 'page must be an integer greater than or equal to 1' });
  }
  if (query.pageSize !== undefined && getSingleStringParam(query.pageSize) === undefined) {
    details.push({ field: 'pageSize', message: 'pageSize must be a string integer' });
  }
  const pageSizeNumber = Number(pageSizeValue);
  if (!isPositiveIntegerString(pageSizeValue) || !PAGE_SIZES.includes(pageSizeNumber as (typeof PAGE_SIZES)[number])) {
    details.push({ field: 'pageSize', message: `pageSize must be one of ${PAGE_SIZES.join(', ')}` });
  }
  if (details.length > 0) return { success: false, details };

  return {
    success: true,
    data: {
      ...(categoryId !== null && categoryId !== undefined ? { categoryId } : {}),
      ...(status ? { status: status as (typeof TICKET_STATUSES)[number] } : {}),
      ...(priority ? { priority: priority as (typeof REQUESTED_PRIORITIES)[number] } : {}),
      ...(search?.trim() ? { search: search.trim() } : {}),
      sortBy: sortBy as (typeof TICKET_SORT_FIELDS)[number],
      sortOrder: sortOrder as (typeof SORT_ORDERS)[number],
      page: Number(pageValue),
      pageSize: pageSizeNumber as (typeof PAGE_SIZES)[number],
    },
  };
}

// GET /api/tickets — Requester-only, always scoped to req.auth.user.id.
ticketsRouter.get('/', requireRole('REQUESTER'), async (request: Request, response: Response) => {
  const parsed = parseTicketsQuery(request.query);
  if (!parsed.success) return validationError(response, parsed.details, 'INVALID_QUERY');

  const { categoryId, status, priority, sortBy, sortOrder, page, pageSize, search } = parsed.data;
  const user = getAuthenticatedUser(request);
  const where: Prisma.TicketWhereInput = {
    requesterId: user.id,
    ...(categoryId !== undefined ? { categoryId } : {}),
    ...(status ? { currentStatus: status } : {}),
    ...(priority ? { requestedPriority: priority } : {}),
    ...(search
      ? {
          OR: [
            { ticketNumber: { contains: search, mode: 'insensitive' } },
            { summary: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  try {
    const prismaSortOrder = sortOrder as Prisma.SortOrder;
    const orderBy: Prisma.TicketOrderByWithRelationInput = { [sortBy]: prismaSortOrder };
    const [tickets, totalItems] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: [orderBy, { id: 'desc' }],
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
    console.error('Error fetching requester tickets:', error);
    return internalError(response);
  }
});

// GET /api/tickets/:id — Requester owner, IT Staff, and Administrator read.
ticketsRouter.get('/:id', async (request: Request, response: Response) => {
  const details: ValidationErrorDetail[] = [];
  const ticketId = parsePositiveIntegerField(request.params.id, 'id', details, true);
  if (details.length > 0 || ticketId === undefined || ticketId === null) return validationError(response, details);

  try {
    const ticket = await findTicketForUser(getAuthenticatedUser(request), ticketId, ticketDetailSelect);
    if (!ticket) {
      sendNotFound(response);
      return;
    }
    return response.status(200).json({ data: ticket });
  } catch (error) {
    console.error('Error fetching ticket detail:', error);
    return internalError(response);
  }
});

// POST /api/tickets — Requester identity comes only from the session.
ticketsRouter.post(
  '/',
  requireRole('REQUESTER'),
  requireTrustedOrigin,
  handleMultipartUpload,
  async (request: Request, response: Response) => {
    const details: ValidationErrorDetail[] = [];
    const categoryId = parsePositiveIntegerField(request.body?.categoryId, 'categoryId', details, true);
    const relatedSystemId = parsePositiveIntegerField(request.body?.relatedSystemId, 'relatedSystemId', details, false);
    const summary = typeof request.body?.summary === 'string' ? request.body.summary.trim() : '';
    const description = typeof request.body?.description === 'string' ? request.body.description.trim() : '';
    const requestedPriority = request.body?.requestedPriority;

    if (summary.length < 5 || summary.length > 200) {
      details.push({ field: 'summary', message: 'Summary must be between 5 and 200 characters' });
    }
    if (description.length < 10 || description.length > 2000) {
      details.push({ field: 'description', message: 'Description must be between 10 and 2000 characters' });
    }
    if (!REQUESTED_PRIORITIES.includes(requestedPriority)) {
      details.push({
        field: 'requestedPriority',
        message: 'Invalid requested priority. Must be one of LOW, MEDIUM, HIGH, CRITICAL',
      });
    }

    const rawFiles = Array.isArray(request.files) ? request.files as Express.Multer.File[] : [];
    if (rawFiles.length > MAX_ACTIVE_ATTACHMENTS) {
      details.push({ field: 'attachments', message: 'Maximum 5 attachments allowed per ticket' });
    }
    for (const file of rawFiles) {
      const fileError = validateAttachmentFile(file);
      if (fileError) details.push({ field: 'attachments', message: fileError });
    }
    if (
      details.length > 0 ||
      categoryId === undefined ||
      categoryId === null ||
      relatedSystemId === undefined
    ) {
      return validationError(response, details);
    }

    try {
      const [category, relatedSystem] = await Promise.all([
        prisma.category.findUnique({ where: { id: categoryId }, select: { id: true, name: true, isActive: true } }),
        relatedSystemId === null
          ? null
          : prisma.relatedSystem.findUnique({ where: { id: relatedSystemId }, select: { id: true, name: true, isActive: true } }),
      ]);
      if (!category || !category.isActive) {
        details.push({ field: 'categoryId', message: 'Category not found or is inactive' });
      }
      if (relatedSystemId !== null && (!relatedSystem || !relatedSystem.isActive)) {
        details.push({ field: 'relatedSystemId', message: 'Related system not found or is inactive' });
      }
      if (details.length > 0) return validationError(response, details);

      const preparedAttachments = rawFiles.map(prepareAttachment);
      let storedFilePaths: string[] = [];
      try {
        storedFilePaths = await storePreparedAttachments(getUploadsDirectory(), preparedAttachments);
      } catch (error) {
        console.error('Error storing ticket attachments:', error);
        return internalError(response);
      }

      try {
        const user = getAuthenticatedUser(request);
        const newTicket = await prisma.$transaction(async transaction => {
          const ticketNumber = await generateTicketNumber(transaction);
          return transaction.ticket.create({
            data: {
              ticketNumber,
              summary,
              description,
              requestedPriority,
              itPriority: requestedPriority,
              currentStatus: 'NEW',
              ticketDate: new Date(),
              requesterId: user.id,
              categoryId,
              relatedSystemId,
              ...(preparedAttachments.length > 0
                ? {
                    attachments: {
                      create: preparedAttachments.map(attachment => ({
                        originalName: attachment.originalName,
                        storedName: attachment.storedName,
                        mimeType: attachment.mimeType,
                        sizeBytes: attachment.sizeBytes,
                        isRemoved: false,
                      })),
                    },
                  }
                : {}),
            },
            select: ticketDetailSelect,
          });
        });
        return response.status(201).json({ data: newTicket });
      } catch (error) {
        await removeStoredFiles(storedFilePaths);
        console.error('Error creating ticket:', error);
        return internalError(response);
      }
    } catch (error) {
      console.error('Error validating ticket references:', error);
      return internalError(response);
    }
  },
);

async function findAccessibleTicket(user: AuthenticatedUser, ticketId: number, response: Response): Promise<boolean> {
  const ticket = await findTicketForUser(user, ticketId, { id: true });
  if (!ticket) {
    sendNotFound(response);
    return false;
  }
  return true;
}

function normalizeCommentContent(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/\r\n?/g, '\n');
  return normalized.length >= 1 && normalized.length <= 2000 ? normalized : null;
}

// Public comments are part of the shared ticket surface in Issue #40.
ticketsRouter.get('/:ticketId/comments', async (request: Request, response: Response) => {
  const details: ValidationErrorDetail[] = [];
  const ticketId = parsePositiveIntegerField(request.params.ticketId, 'ticketId', details, true);
  if (details.length > 0 || ticketId === undefined || ticketId === null) return validationError(response, details);

  try {
    const user = getAuthenticatedUser(request);
    if (!(await findAccessibleTicket(user, ticketId, response))) return;
    const comments = await prisma.publicComment.findMany({
      where: { ticketId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        ticketId: true,
        content: true,
        createdAt: true,
        author: { select: { id: true, name: true, role: true } },
      },
    });
    return response.status(200).json({ data: comments });
  } catch (error) {
    console.error('Error fetching public comments:', error);
    return internalError(response);
  }
});

ticketsRouter.post(
  '/:ticketId/comments',
  requireRole('REQUESTER', 'IT_STAFF'),
  requireTrustedOrigin,
  async (request: Request, response: Response) => {
    const details: ValidationErrorDetail[] = [];
    const ticketId = parsePositiveIntegerField(request.params.ticketId, 'ticketId', details, true);
    const content = normalizeCommentContent(request.body?.content);
    if (content === null) details.push({ field: 'content', message: 'Content must be between 1 and 2000 characters' });
    if (details.length > 0 || ticketId === undefined || ticketId === null || content === null) {
      return validationError(response, details);
    }

    try {
      const user = getAuthenticatedUser(request);
      if (!(await findAccessibleTicket(user, ticketId, response))) return;
      const comment = await prisma.publicComment.create({
        data: { ticketId, content, authorId: user.id },
        select: {
          id: true,
          ticketId: true,
          content: true,
          createdAt: true,
          author: { select: { id: true, name: true, role: true } },
        },
      });
      return response.status(201).json({ data: comment });
    } catch (error) {
      console.error('Error creating public comment:', error);
      return internalError(response);
    }
  },
);

// Requester owner only. updateMany + the null predicate makes retries and
// concurrent clicks idempotent without changing currentStatus.
ticketsRouter.post(
  '/:id/problem-appears-resolved',
  requireRole('REQUESTER'),
  requireTrustedOrigin,
  async (request: Request, response: Response) => {
    const details: ValidationErrorDetail[] = [];
    const ticketId = parsePositiveIntegerField(request.params.id, 'id', details, true);
    if (details.length > 0 || ticketId === undefined || ticketId === null) return validationError(response, details);

    try {
      const user = getAuthenticatedUser(request);
      const ticket = await findTicketForUser(user, ticketId, {
        id: true,
        problemAppearsResolvedAt: true,
      });
      if (!ticket) {
        sendNotFound(response);
        return;
      }
      if (ticket.problemAppearsResolvedAt) {
        return response.status(200).json({
          data: { ticketId, problemAppearsResolvedAt: ticket.problemAppearsResolvedAt },
        });
      }

      const serverTimestamp = new Date();
      const updated = await prisma.ticket.updateMany({
        where: { id: ticketId, requesterId: user.id, problemAppearsResolvedAt: null },
        data: { problemAppearsResolvedAt: serverTimestamp },
      });
      if (updated.count === 1) {
        return response.status(200).json({
          data: { ticketId, problemAppearsResolvedAt: serverTimestamp },
        });
      }

      const existing = await findTicketForUser(user, ticketId, { problemAppearsResolvedAt: true });
      if (!existing?.problemAppearsResolvedAt) {
        sendNotFound(response);
        return;
      }
      return response.status(200).json({
        data: { ticketId, problemAppearsResolvedAt: existing.problemAppearsResolvedAt },
      });
    } catch (error) {
      console.error('Error setting problem-appears-resolved indication:', error);
      return internalError(response);
    }
  },
);

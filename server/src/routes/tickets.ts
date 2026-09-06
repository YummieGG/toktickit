import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { Prisma } from '../../generated/prisma';
import { generateTicketNumber } from '../lib/ticket-number';
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

import {
  getSingleStringParam,
  isPositiveIntegerString,
  validateActiveRequester,
  validatePositiveIntegerParam,
  type ValidationErrorDetail,
} from '../lib/validation';

export const ticketsRouter = Router();

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

async function storePreparedAttachments(
  uploadsDir: string,
  attachments: PreparedAttachment[]
): Promise<string[]> {
  if (attachments.length === 0) return [];

  const storedPaths: string[] = [];

  try {
    for (const attachment of attachments) {
      const filePath = await storePreparedAttachment(uploadsDir, attachment);
      storedPaths.push(filePath);
    }
    return storedPaths;
  } catch (error) {
    await removeStoredFiles(storedPaths);
    throw error;
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_ATTACHMENT_SIZE_BYTES,
    files: 10, // catch > 5 to return friendly validation error
  },
});

const handleMultipartUpload = (req: Request, res: Response, next: NextFunction) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    upload.array('attachments', 10)(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'Validation failed',
            details: [{ field: 'attachments', message: 'File exceeds the 5 MB limit' }],
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          const message = err.field === 'attachments'
            ? 'Maximum 5 attachments allowed per ticket'
            : 'Files must use the attachments field';
          return res.status(400).json({
            error: 'Validation failed',
            details: [{ field: 'attachments', message }],
          });
        }
        return res.status(400).json({
          error: 'Validation failed',
          details: [{ field: 'attachments', message: err.message }],
        });
      } else if (err) {
        return res.status(400).json({
          error: 'Validation failed',
          details: [{ field: 'attachments', message: 'Failed to process file upload' }],
        });
      }
      next();
    });
  } else {
    next();
  }
};

interface ValidatedTicketsQuery {
  requesterId: number;
  search?: string | undefined;
  categoryId?: number | undefined;
  status?: (typeof TICKET_STATUSES)[number] | undefined;
  priority?: (typeof REQUESTED_PRIORITIES)[number] | undefined;
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

  const requesterId = validatePositiveIntegerParam(query.requesterId, 'requesterId', details);
  const categoryId = validatePositiveIntegerParam(query.category, 'category', details, { required: false });
  const searchValue = getSingleStringParam(query.search);
  const statusValue = getSingleStringParam(query.status);
  const priorityValue = getSingleStringParam(query.priority);
  const sortByValue = getSingleStringParam(query.sortBy) ?? 'ticketDate';
  const sortOrderValue = getSingleStringParam(query.sortOrder) ?? 'desc';
  const pageValue = getSingleStringParam(query.page) ?? '1';
  const pageSizeValue = getSingleStringParam(query.pageSize) ?? '10';

  if (query.search !== undefined && searchValue === undefined) {
    details.push({ field: 'search', message: 'search must be a string' });
  }
  if (
    query.status !== undefined &&
    (!statusValue || !TICKET_STATUSES.includes(statusValue as (typeof TICKET_STATUSES)[number]))
  ) {
    details.push({ field: 'status', message: `status must be one of ${TICKET_STATUSES.join(', ')}` });
  }
  if (
    query.priority !== undefined &&
    (!priorityValue || !REQUESTED_PRIORITIES.includes(priorityValue as (typeof REQUESTED_PRIORITIES)[number]))
  ) {
    details.push({
      field: 'priority',
      message: `priority must be one of ${REQUESTED_PRIORITIES.join(', ')}`,
    });
  }
  if (query.sortBy !== undefined && getSingleStringParam(query.sortBy) === undefined) {
    details.push({ field: 'sortBy', message: 'sortBy must be a string' });
  }
  if (!TICKET_SORT_FIELDS.includes(sortByValue as (typeof TICKET_SORT_FIELDS)[number])) {
    details.push({ field: 'sortBy', message: `sortBy must be one of ${TICKET_SORT_FIELDS.join(', ')}` });
  }
  if (query.sortOrder !== undefined && getSingleStringParam(query.sortOrder) === undefined) {
    details.push({ field: 'sortOrder', message: 'sortOrder must be a string' });
  }
  if (!SORT_ORDERS.includes(sortOrderValue as (typeof SORT_ORDERS)[number])) {
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
  if (
    !isPositiveIntegerString(pageSizeValue) ||
    !PAGE_SIZES.includes(pageSizeNumber as (typeof PAGE_SIZES)[number])
  ) {
    details.push({ field: 'pageSize', message: `pageSize must be one of ${PAGE_SIZES.join(', ')}` });
  }

  if (details.length > 0) {
    return { success: false, details };
  }

  return {
    success: true,
    data: {
      requesterId: requesterId!,
      categoryId,
      status: statusValue as (typeof TICKET_STATUSES)[number] | undefined,
      priority: priorityValue as (typeof REQUESTED_PRIORITIES)[number] | undefined,
      sortBy: sortByValue as (typeof TICKET_SORT_FIELDS)[number],
      sortOrder: sortOrderValue as (typeof SORT_ORDERS)[number],
      page: Number(pageValue),
      pageSize: pageSizeNumber as (typeof PAGE_SIZES)[number],
      search: searchValue?.trim() || undefined,
    },
  };
}

// GET /api/tickets
ticketsRouter.get('/', async (req: Request, res: Response) => {
  const parseResult = parseTicketsQuery(req.query);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Validation failed', details: parseResult.details });
  }

  const {
    requesterId,
    categoryId,
    status,
    priority,
    sortBy,
    sortOrder,
    page,
    pageSize,
    search,
  } = parseResult.data;

  try {
    if (!(await validateActiveRequester(requesterId, res))) {
      return;
    }

    const where: Prisma.TicketWhereInput = {
      requesterId,
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
    const prismaSortOrder = sortOrder as Prisma.SortOrder;
    const orderBy: Prisma.TicketOrderByWithRelationInput = {
      [sortBy]: prismaSortOrder,
    };

    const [tickets, totalItems] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: [orderBy, { id: prismaSortOrder }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          requestedPriority: true,
          currentStatus: true,
          ticketDate: true,
          category: { select: { id: true, name: true } },
          updatedAt: true,
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    return res.status(200).json({
      data: tickets,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tickets/:id
ticketsRouter.get('/:id', async (req: Request, res: Response) => {
  const details: ValidationErrorDetail[] = [];
  const ticketId = validatePositiveIntegerParam(req.params.id, 'id', details);
  const requesterId = validatePositiveIntegerParam(req.query.requesterId, 'requesterId', details);

  if (details.length > 0 || ticketId === undefined || requesterId === undefined) {
    return res.status(400).json({ error: 'Validation failed', details });
  }

  try {
    if (!(await validateActiveRequester(requesterId, res))) {
      return;
    }

    const ticketOwnership = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true },
    });

    if (!ticketOwnership) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (ticketOwnership.requesterId !== requesterId) {
      return res.status(403).json({ error: 'You do not have access to this ticket' });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        ticketNumber: true,
        summary: true,
        description: true,
        requestedPriority: true,
        currentStatus: true,
        ticketDate: true,
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true } },
        attachments: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            isRemoved: true,
            removalReason: true,
            removedAt: true,
            createdAt: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    return res.status(200).json({ data: ticket });
  } catch (error) {
    console.error('Error fetching ticket detail:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tickets
ticketsRouter.post('/', handleMultipartUpload, async (req: Request, res: Response) => {
  try {
    const { 
      requesterId, 
      categoryId, 
      relatedSystemId, 
      summary, 
      description, 
      requestedPriority 
    } = req.body;

    const details: Array<{ field: string; message: string }> = [];

    const parseIntField = (value: unknown, fieldName: string, isRequired: boolean) => {
      const normalizedValue = typeof value === 'string' ? value.trim() : value;
      if (normalizedValue === undefined || normalizedValue === null || normalizedValue === '') {
        if (isRequired) {
          details.push({ field: fieldName, message: `${fieldName} is required` });
        }
        return isRequired ? undefined : null;
      }
      if (
        (typeof normalizedValue !== 'string' && typeof normalizedValue !== 'number') ||
        !isPositiveIntegerString(String(normalizedValue))
      ) {
        details.push({ field: fieldName, message: `${fieldName} must be a valid integer` });
        return isRequired ? undefined : null;
      }
      return Number(normalizedValue);
    };

    const requesterIdInt = parseIntField(requesterId, 'requesterId', true) as number | undefined;
    const categoryIdInt = parseIntField(categoryId, 'categoryId', true) as number | undefined;
    const relatedSystemIdInt = parseIntField(relatedSystemId, 'relatedSystemId', false) as number | null;

    if (!summary || typeof summary !== 'string' || summary.trim().length < 5 || summary.trim().length > 200) {
      details.push({ field: 'summary', message: 'Summary must be between 5 and 200 characters' });
    }
    
    if (!description || typeof description !== 'string' || description.trim().length < 10 || description.trim().length > 2000) {
      details.push({ field: 'description', message: 'Description must be between 10 and 2000 characters' });
    }

    if (!requestedPriority || !REQUESTED_PRIORITIES.includes(requestedPriority)) {
      details.push({ field: 'requestedPriority', message: 'Invalid requested priority. Must be one of LOW, MEDIUM, HIGH, CRITICAL' });
    }

    // Attachment validation (BR-08, BR-09, BR-10)
    const rawFiles = (req.files as Express.Multer.File[]) || [];
    if (rawFiles.length > MAX_ACTIVE_ATTACHMENTS) {
      details.push({ field: 'attachments', message: 'Maximum 5 attachments allowed per ticket' });
    }

    for (const file of rawFiles) {
      const validationMessage = validateAttachmentFile(file);
      if (validationMessage) {
        details.push({ field: 'attachments', message: validationMessage });
      }
    }

    // If basic validation failed, return 400 immediately
    if (details.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details });
    }

    // Foreign Key existence and isActive checks (BR-05, BR-24, BR-25)
    const [requester, category, system] = await Promise.all([
      requesterIdInt !== undefined ? prisma.requesterUser.findUnique({ where: { id: requesterIdInt } }) : null,
      categoryIdInt !== undefined ? prisma.category.findUnique({ where: { id: categoryIdInt } }) : null,
      relatedSystemIdInt !== null ? prisma.relatedSystem.findUnique({ where: { id: relatedSystemIdInt } }) : null
    ]);

    if (!requester || !requester.isActive) {
      details.push({ field: 'requesterId', message: 'Requester not found or is inactive' });
    }

    if (!category || !category.isActive) {
      details.push({ field: 'categoryId', message: 'Category not found or is inactive' });
    }

    if (relatedSystemIdInt !== null && (!system || !system.isActive)) {
      details.push({ field: 'relatedSystemId', message: 'Related system not found or is inactive' });
    }

    if (details.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details });
    }

    // Prepare files with UUID stored names
    const uploadsDir = getUploadsDirectory();
    const preparedAttachments = rawFiles.map(prepareAttachment);

    // Persist files before creating database metadata so a successful ticket never points to a missing file.
    // Any database failure below removes these files again.
    let storedFilePaths: string[] = [];
    try {
      storedFilePaths = await storePreparedAttachments(uploadsDir, preparedAttachments);
    } catch (error) {
      console.error('Error storing ticket attachments:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // Atomic transaction for ticket number generation, attachment metadata, and ticket creation (BR-01 concurrency safety)
    // Retry up to 3 times on unique constraint violation (P2002) as a safety net
    const MAX_RETRIES = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const newTicket = await prisma.$transaction(async (tx) => {
          const ticketNumber = await generateTicketNumber(tx);

          return tx.ticket.create({
            data: {
              ticketNumber,
              summary: summary.trim(),
              description: description.trim(),
              requestedPriority,
              currentStatus: 'NEW',
              ticketDate: new Date(), // Set server-side (BR-23)
              requesterId: requesterIdInt!,
              categoryId: categoryIdInt!,
              relatedSystemId: relatedSystemIdInt,
              ...(preparedAttachments.length > 0 && {
                attachments: {
                  create: preparedAttachments.map(a => ({
                    originalName: a.originalName,
                    storedName: a.storedName,
                    mimeType: a.mimeType,
                    sizeBytes: a.sizeBytes,
                    isRemoved: false
                  }))
                }
              })
            },
            include: {
              category: { select: { id: true, name: true } },
              relatedSystem: { select: { id: true, name: true } },
              requester: { select: { id: true, name: true } },
              attachments: {
                select: {
                  id: true,
                  originalName: true,
                  storedName: true,
                  mimeType: true,
                  sizeBytes: true,
                  isRemoved: true,
                  createdAt: true
                }
              }
            }
          });
        });

        return res.status(201).json({ 
          data: newTicket 
        });
      } catch (error) {
        // If it's a unique constraint violation on ticketNumber, retry
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          attempt < MAX_RETRIES
        ) {
          lastError = error;
          continue;
        }
        // Non-retryable error or max retries exhausted
        lastError = error;
        break;
      }
    }

    await removeStoredFiles(storedFilePaths);
    console.error('Error creating ticket:', lastError);
    res.status(500).json({ error: 'Internal server error' });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

import { Router, type Request, type Response } from 'express';
import { Prisma, type ActionStatus } from '../../generated/prisma';
import { prisma } from '../lib/prisma';
import {
  apiError,
  conflictError,
  internalError,
  validationError,
  validatePositiveIntegerParam,
  type ValidationErrorDetail,
} from '../lib/validation';
import {
  computeActionFingerprint,
  isActionParentReadOnly,
  isAllowedActionTransition,
  isEligibleActionAssignee,
  isValidIdempotencyKey,
  mapActionStatusToEventType,
  normalizeActionText,
  projectAction,
  ALL_ACTION_STATUSES,
} from '../lib/action-rules';
import { requireAuth, requirePasswordChanged, requireRole } from '../middleware/auth';
import { requireTrustedOrigin } from '../middleware/csrf';
import { sendNotFound } from '../lib/authorization';

export const ticketActionsTakenRouter = Router({ mergeParams: true });

ticketActionsTakenRouter.use(requireAuth, requirePasswordChanged);

export class ActionError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ActionError';
  }
}

function isKnownPrismaError(error: unknown, code: string): boolean {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === code) ||
    (typeof error === 'object' && error !== null && 'code' in error && error.code === code)
  );
}

function handleActionError(error: unknown, response: Response): void {
  if (error instanceof ActionError) {
    if (error.status === 404) {
      sendNotFound(response);
      return;
    }
    if (error.fields) {
      validationError(
        response,
        Object.entries(error.fields).map(([field, message]) => ({ field, message })),
        error.code,
      );
      return;
    }
    apiError(response, error.status, error.code, error.message);
    return;
  }
  if (isKnownPrismaError(error, 'P2034') || isKnownPrismaError(error, 'P2002')) {
    conflictError(response, 'The resource was modified by another user. Reload and try again.', 'CONFLICT');
    return;
  }
  console.error('Unexpected error in action handler:', error);
  internalError(response);
}

const ACTION_CREATE_KEYS = [
  'description',
  'result',
  'assigneeId',
  'followUpRequired',
  'followUpNote',
  'attachmentNotes',
  'expectedTicketVersion',
] as const;

const ACTION_EDIT_KEYS = [
  'description',
  'result',
  'followUpRequired',
  'followUpNote',
  'attachmentNotes',
  'expectedTicketVersion',
  'expectedActionVersion',
] as const;

const ACTION_ASSIGNEE_KEYS = [
  'assigneeId',
  'expectedTicketVersion',
  'expectedActionVersion',
] as const;

const ACTION_STATUS_KEYS = [
  'status',
  'cancelReason',
  'result',
  'expectedTicketVersion',
  'expectedActionVersion',
] as const;

function validateUnknownFields(
  body: Record<string, unknown>,
  allowedKeys: readonly string[],
  details: ValidationErrorDetail[],
): void {
  for (const key of Object.keys(body)) {
    if (!allowedKeys.includes(key)) {
      details.push({ field: key, message: `Unknown field '${key}' is not allowed` });
    }
  }
}

function validateActionVersions(
  body: Record<string, unknown>,
  details: ValidationErrorDetail[],
  options: { requireActionVersion?: boolean } = {},
): void {
  if (
    body.expectedTicketVersion === undefined ||
    typeof body.expectedTicketVersion !== 'number' ||
    !Number.isSafeInteger(body.expectedTicketVersion) ||
    body.expectedTicketVersion < 1
  ) {
    details.push({ field: 'expectedTicketVersion', message: 'expectedTicketVersion must be a positive integer' });
  }

  if (options.requireActionVersion) {
    if (
      body.expectedActionVersion === undefined ||
      typeof body.expectedActionVersion !== 'number' ||
      !Number.isSafeInteger(body.expectedActionVersion) ||
      body.expectedActionVersion < 1
    ) {
      details.push({ field: 'expectedActionVersion', message: 'expectedActionVersion must be a positive integer' });
    }
  }
}

async function assertParentTicketActive(tx: Prisma.TransactionClient, ticketId: number) {
  const parentTicket = await tx.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, currentStatus: true, version: true },
  });

  if (!parentTicket) {
    throw new ActionError(404, 'NOT_FOUND', 'Resource not found');
  }

  if (isActionParentReadOnly(parentTicket.currentStatus)) {
    throw new ActionError(
      400,
      'ACTION_PARENT_READ_ONLY',
      'Actions cannot be modified on a resolved, closed, or cancelled ticket',
    );
  }

  return parentTicket;
}

async function assertActionOnTicket(tx: Prisma.TransactionClient, ticketId: number, actionId: number) {
  const existingAction = await tx.actionTaken.findUnique({
    where: { id: actionId },
    select: ACTION_SELECT,
  });

  if (!existingAction || existingAction.ticketId !== ticketId) {
    throw new ActionError(404, 'NOT_FOUND', 'Resource not found');
  }

  return existingAction;
}


function parseTicketIdParam(request: Request, response: Response): number | undefined {
  const details: ValidationErrorDetail[] = [];
  const ticketId = validatePositiveIntegerParam(request.params.ticketId, 'ticketId', details);
  if (details.length > 0 || ticketId === undefined) {
    validationError(response, details, 'VALIDATION_ERROR');
    return undefined;
  }
  return ticketId;
}

function parseActionIdParam(request: Request, response: Response): number | undefined {
  const details: ValidationErrorDetail[] = [];
  const actionId = validatePositiveIntegerParam(request.params.actionId, 'actionId', details);
  if (details.length > 0 || actionId === undefined) {
    validationError(response, details, 'VALIDATION_ERROR');
    return undefined;
  }
  return actionId;
}

const ACTION_SELECT = {
  id: true,
  ticketId: true,
  description: true,
  result: true,
  status: true,
  followUpRequired: true,
  followUpNote: true,
  attachmentNotes: true,
  cancelReason: true,
  createdAt: true,
  updatedAt: true,
  version: true,
  creationKey: true,
  creationFingerprint: true,
  performedBy: {
    select: { id: true, name: true, role: true },
  },
  assignee: {
    select: { id: true, name: true, role: true, isActive: true },
  },
} as const satisfies Prisma.ActionTakenSelect;

// GET /api/tickets/:ticketId/actions-taken
ticketActionsTakenRouter.get('/', async (request: Request, response: Response) => {
  const ticketId = parseTicketIdParam(request, response);
  if (ticketId === undefined) return;

  const user = request.auth!.user;

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true, version: true },
    });

    if (!ticket) {
      sendNotFound(response);
      return;
    }

    if (user.role === 'REQUESTER' && ticket.requesterId !== user.id) {
      sendNotFound(response);
      return;
    }

    const pageQuery = request.query.page;
    const pageSizeQuery = request.query.pageSize;

    let page = 1;
    if (pageQuery !== undefined) {
      const pageNum = Number(pageQuery);
      if (!Number.isSafeInteger(pageNum) || pageNum < 1) {
        validationError(response, [{ field: 'page', message: 'Page must be a positive integer' }], 'INVALID_QUERY');
        return;
      }
      page = pageNum;
    }

    let pageSize = 10;
    if (pageSizeQuery !== undefined) {
      const sizeNum = Number(pageSizeQuery);
      if (![5, 10, 20].includes(sizeNum)) {
        validationError(response, [{ field: 'pageSize', message: 'Page size must be 5, 10, or 20' }], 'INVALID_QUERY');
        return;
      }
      pageSize = sizeNum;
    }

    const totalItems = await prisma.actionTaken.count({
      where: { ticketId },
    });

    const totalPages = Math.ceil(totalItems / pageSize);
    const skip = (page - 1) * pageSize;

    const actions = await prisma.actionTaken.findMany({
      where: { ticketId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      skip,
      take: pageSize,
      select: ACTION_SELECT,
    });

    return response.status(200).json({
      data: actions.map(projectAction),
      ticketVersion: ticket.version,
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
    handleActionError(error, response);
  }
});

// POST /api/tickets/:ticketId/actions-taken
ticketActionsTakenRouter.post(
  '/',
  requireRole('IT_STAFF', 'ADMINISTRATOR'),
  requireTrustedOrigin,
  async (request: Request, response: Response) => {
    const ticketId = parseTicketIdParam(request, response);
    if (ticketId === undefined) return;

    const rawIdempotencyKey = request.headers['idempotency-key'];
    if (!isValidIdempotencyKey(rawIdempotencyKey)) {
      validationError(
        response,
        [{ field: 'Idempotency-Key', message: 'Valid Idempotency-Key header is required (8-128 ASCII characters)' }],
        'VALIDATION_ERROR',
      );
      return;
    }
    const idempotencyKey = String(rawIdempotencyKey);

    const body = request.body ?? {};
    const details: ValidationErrorDetail[] = [];

    validateUnknownFields(body, ACTION_CREATE_KEYS, details);

    const description = normalizeActionText(body.description);
    if (!description || description.length < 1 || description.length > 2000) {
      details.push({ field: 'description', message: 'Action description is required (1-2,000 characters)' });
    }

    const result = normalizeActionText(body.result);
    if (body.result !== undefined && body.result !== null && result !== null && result.length > 2000) {
      details.push({ field: 'result', message: 'Result must not exceed 2,000 characters' });
    }

    const followUpRequired = Boolean(body.followUpRequired);
    const followUpNote = normalizeActionText(body.followUpNote);
    if (followUpRequired && (!followUpNote || followUpNote.length < 1 || followUpNote.length > 2000)) {
      details.push({ field: 'followUpNote', message: 'Follow-up note is required when follow-up is required' });
    }

    const attachmentNotes = normalizeActionText(body.attachmentNotes);
    if (body.attachmentNotes !== undefined && body.attachmentNotes !== null && attachmentNotes !== null && attachmentNotes.length > 2000) {
      details.push({ field: 'attachmentNotes', message: 'Attachment notes must not exceed 2,000 characters' });
    }

    if (
      body.assigneeId !== undefined &&
      body.assigneeId !== null &&
      (typeof body.assigneeId !== 'number' ||
        !Number.isSafeInteger(body.assigneeId) ||
        body.assigneeId < 1)
    ) {
      details.push({ field: 'assigneeId', message: 'Assignee must be an active IT Staff or Administrator' });
    }

    validateActionVersions(body, details);

    if (details.length > 0) {
      const code = details.some((d) => d.field === 'assigneeId')
        ? 'ASSIGNEE_INELIGIBLE'
        : details.some((d) => d.field === 'followUpNote')
        ? 'FOLLOW_UP_NOTE_REQUIRED'
        : 'VALIDATION_ERROR';
      validationError(response, details, code);
      return;
    }

    const user = request.auth!.user;
    const assigneeId = body.assigneeId !== undefined && body.assigneeId !== null ? Number(body.assigneeId) : user.id;

    const payloadFingerprint = computeActionFingerprint({
      description: description!,
      result,
      assigneeId,
      followUpRequired,
      followUpNote,
      attachmentNotes,
    });

    try {
      const txResult = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const parentTicket = await assertParentTicketActive(tx, ticketId);

          // Assignee eligibility check
          const assignee = await tx.user.findUnique({
            where: { id: assigneeId },
            select: { id: true, role: true, isActive: true },
          });
          if (!isEligibleActionAssignee(assignee)) {
            throw new ActionError(400, 'ASSIGNEE_INELIGIBLE', 'Assignee must be an active IT Staff or Administrator', {
              assigneeId: 'Assignee must be an active IT Staff or Administrator',
            });
          }

          // Idempotency replay or conflict check
          const existingAction = await tx.actionTaken.findFirst({
            where: {
              ticketId,
              performedById: user.id,
              creationKey: idempotencyKey,
            },
            select: ACTION_SELECT,
          });

          if (existingAction) {
            if (existingAction.creationFingerprint === payloadFingerprint) {
              return { isReplay: true, action: existingAction, ticketVersion: parentTicket.version };
            }
            throw new ActionError(
              409,
              'IDEMPOTENCY_CONFLICT',
              'Idempotency key was previously used with a different request payload',
            );
          }

          // Ticket version check
          if (parentTicket.version !== body.expectedTicketVersion) {
            throw new ActionError(
              409,
              'CONFLICT',
              'The resource was modified by another user. Reload and try again.',
            );
          }

          // Create Action Taken
          const createdAction = await tx.actionTaken.create({
            data: {
              ticketId,
              description: description!,
              result,
              performedById: user.id,
              assigneeId,
              status: 'PENDING',
              followUpRequired,
              followUpNote: followUpRequired ? followUpNote : null,
              attachmentNotes,
              version: 1,
              creationKey: idempotencyKey,
              creationFingerprint: payloadFingerprint,
            },
            select: ACTION_SELECT,
          });

          // Append CREATED event
          await tx.actionTakenEvent.create({
            data: {
              actionId: createdAction.id,
              actorId: user.id,
              type: 'CREATED',
              after: {
                description: createdAction.description,
                status: 'PENDING',
                assigneeId: createdAction.assignee?.id ?? null,
                followUpRequired,
              },
            },
          });

          // Increment parent ticket version and refresh updatedAt
          const updatedTicket = await tx.ticket.update({
            where: { id: ticketId },
            data: {
              version: { increment: 1 },
              updatedAt: new Date(),
            },
            select: { version: true },
          });

          return { isReplay: false, action: createdAction, ticketVersion: updatedTicket.version };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      const status = txResult.isReplay ? 200 : 201;
      return response.status(status).json({
        data: {
          action: projectAction(txResult.action),
          ticketVersion: txResult.ticketVersion,
        },
      });
    } catch (error) {
      if (isKnownPrismaError(error, 'P2002')) {
        try {
          const replayed = await prisma.actionTaken.findFirst({
            where: {
              ticketId,
              performedById: user.id,
              creationKey: idempotencyKey,
            },
            select: ACTION_SELECT,
          });

          if (replayed) {
            if (replayed.creationFingerprint === payloadFingerprint) {
              const currentTicket = await prisma.ticket.findUnique({
                where: { id: ticketId },
                select: { version: true },
              });
              return response.status(200).json({
                data: {
                  action: projectAction(replayed),
                  ticketVersion: currentTicket?.version ?? 1,
                },
              });
            }
            return conflictError(
              response,
              'An action with this idempotency key was already created with different content',
              'IDEMPOTENCY_CONFLICT',
            );
          }
        } catch {
          // Fall through to general conflict
        }
        return conflictError(
          response,
          'A concurrent creation with the same idempotency key was detected. Please reload and retry.',
          'CONFLICT',
        );
      }
      handleActionError(error, response);
    }
  },
);

// PATCH /api/tickets/:ticketId/actions-taken/:actionId
ticketActionsTakenRouter.patch(
  '/:actionId',
  requireRole('IT_STAFF', 'ADMINISTRATOR'),
  requireTrustedOrigin,
  async (request: Request, response: Response) => {
    const ticketId = parseTicketIdParam(request, response);
    if (ticketId === undefined) return;
    const actionId = parseActionIdParam(request, response);
    if (actionId === undefined) return;

    const body = request.body ?? {};
    const details: ValidationErrorDetail[] = [];

    validateUnknownFields(body, ACTION_EDIT_KEYS, details);
    validateActionVersions(body, details, { requireActionVersion: true });

    const hasDescription = Object.prototype.hasOwnProperty.call(body, 'description');
    const hasResult = Object.prototype.hasOwnProperty.call(body, 'result');
    const hasFollowUpRequired = Object.prototype.hasOwnProperty.call(body, 'followUpRequired');
    const hasFollowUpNote = Object.prototype.hasOwnProperty.call(body, 'followUpNote');
    const hasAttachmentNotes = Object.prototype.hasOwnProperty.call(body, 'attachmentNotes');

    if (!hasDescription && !hasResult && !hasFollowUpRequired && !hasFollowUpNote && !hasAttachmentNotes) {
      details.push({ field: 'body', message: 'At least one editable field must be provided' });
    }

    const description = hasDescription ? normalizeActionText(body.description) : undefined;
    if (hasDescription && (!description || description.length < 1 || description.length > 2000)) {
      details.push({ field: 'description', message: 'Description must be between 1 and 2,000 characters' });
    }

    const result = hasResult ? normalizeActionText(body.result) : undefined;
    if (hasResult && body.result !== null && result !== undefined && result !== null && result.length > 2000) {
      details.push({ field: 'result', message: 'Result must not exceed 2,000 characters' });
    }

    const attachmentNotes = hasAttachmentNotes ? normalizeActionText(body.attachmentNotes) : undefined;
    if (hasAttachmentNotes && body.attachmentNotes !== null && attachmentNotes !== undefined && attachmentNotes !== null && attachmentNotes.length > 2000) {
      details.push({ field: 'attachmentNotes', message: 'Attachment notes must not exceed 2,000 characters' });
    }

    const followUpNote = hasFollowUpNote ? normalizeActionText(body.followUpNote) : undefined;
    if (hasFollowUpNote && body.followUpNote !== null && followUpNote !== undefined && followUpNote !== null && followUpNote.length > 2000) {
      details.push({ field: 'followUpNote', message: 'Follow-up note must not exceed 2,000 characters' });
    }

    if (details.length > 0) {
      validationError(response, details, 'VALIDATION_ERROR');
      return;
    }

    const user = request.auth!.user;

    try {
      const txResult = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const parentTicket = await assertParentTicketActive(tx, ticketId);
          const existingAction = await assertActionOnTicket(tx, ticketId, actionId);

          if (existingAction.status === 'CANCELLED') {
            throw new ActionError(400, 'ACTION_CANCELLED_READ_ONLY', 'Cancelled actions cannot be modified');
          }

          // Completed actions cannot clear result
          if (existingAction.status === 'COMPLETED') {
            const nextResult = hasResult ? result : existingAction.result;
            if (!nextResult || nextResult.trim().length === 0) {
              throw new ActionError(400, 'RESULT_REQUIRED', 'Completed action must retain a non-empty result', {
                result: 'Completed action must retain a non-empty result',
              });
            }
          }

          // Follow up requirement check with note preservation (BR-06)
          const nextFollowUpRequired = hasFollowUpRequired ? Boolean(body.followUpRequired) : existingAction.followUpRequired;
          let nextFollowUpNote = existingAction.followUpNote;
          let noteModified = false;

          if (hasFollowUpRequired && !nextFollowUpRequired) {
            // Setting followUpRequired=false does not erase historical note text.
            if (hasFollowUpNote && followUpNote !== undefined && followUpNote !== null && followUpNote.trim().length > 0) {
              nextFollowUpNote = followUpNote;
              noteModified = true;
            }
          } else if (hasFollowUpNote && followUpNote !== undefined) {
            nextFollowUpNote = followUpNote;
            noteModified = true;
          }

          if (nextFollowUpRequired && (!nextFollowUpNote || nextFollowUpNote.trim().length === 0)) {
            throw new ActionError(400, 'FOLLOW_UP_NOTE_REQUIRED', 'Follow-up note is required when follow-up is required', {
              followUpNote: 'Follow-up note is required when follow-up is required',
            });
          }

          // Check versions
          if (parentTicket.version !== body.expectedTicketVersion || existingAction.version !== body.expectedActionVersion) {
            throw new ActionError(
              409,
              'CONFLICT',
              'The resource was modified by another user. Reload and try again.',
            );
          }

          const updateData: Prisma.ActionTakenUpdateInput = {
            ...(hasDescription && description ? { description } : {}),
            ...(hasResult ? { result: result ?? null } : {}),
            ...(hasFollowUpRequired ? { followUpRequired: nextFollowUpRequired } : {}),
            ...(noteModified ? { followUpNote: nextFollowUpNote ?? null } : {}),
            ...(hasAttachmentNotes ? { attachmentNotes: attachmentNotes ?? null } : {}),
            version: { increment: 1 },
          };

          const beforeSnapshot: Record<string, unknown> = {};
          const afterSnapshot: Record<string, unknown> = {};

          if (hasDescription) {
            beforeSnapshot.description = existingAction.description;
            afterSnapshot.description = description;
          }
          if (hasResult) {
            beforeSnapshot.result = existingAction.result;
            afterSnapshot.result = result;
          }
          if (hasFollowUpRequired) {
            beforeSnapshot.followUpRequired = existingAction.followUpRequired;
            afterSnapshot.followUpRequired = nextFollowUpRequired;
          }
          if (noteModified) {
            beforeSnapshot.followUpNote = existingAction.followUpNote;
            afterSnapshot.followUpNote = nextFollowUpNote;
          }
          if (hasAttachmentNotes) {
            beforeSnapshot.attachmentNotes = existingAction.attachmentNotes;
            afterSnapshot.attachmentNotes = attachmentNotes;
          }

          const updatedAction = await tx.actionTaken.update({
            where: { id: actionId },
            data: updateData,
            select: ACTION_SELECT,
          });

          await tx.actionTakenEvent.create({
            data: {
              actionId,
              actorId: user.id,
              type: 'EDITED',
              before: beforeSnapshot as Prisma.InputJsonValue,
              after: afterSnapshot as Prisma.InputJsonValue,
            },
          });

          const updatedTicket = await tx.ticket.update({
            where: { id: ticketId },
            data: {
              version: { increment: 1 },
              updatedAt: new Date(),
            },
            select: { version: true },
          });

          return { action: updatedAction, ticketVersion: updatedTicket.version };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return response.status(200).json({
        data: {
          action: projectAction(txResult.action),
          ticketVersion: txResult.ticketVersion,
        },
      });
    } catch (error) {
      handleActionError(error, response);
    }
  },
);

// PATCH /api/tickets/:ticketId/actions-taken/:actionId/assignee
ticketActionsTakenRouter.patch(
  '/:actionId/assignee',
  requireRole('IT_STAFF', 'ADMINISTRATOR'),
  requireTrustedOrigin,
  async (request: Request, response: Response) => {
    const ticketId = parseTicketIdParam(request, response);
    if (ticketId === undefined) return;
    const actionId = parseActionIdParam(request, response);
    if (actionId === undefined) return;

    const body = request.body ?? {};
    const details: ValidationErrorDetail[] = [];

    validateUnknownFields(body, ACTION_ASSIGNEE_KEYS, details);

    if (
      body.assigneeId === undefined ||
      typeof body.assigneeId !== 'number' ||
      !Number.isSafeInteger(body.assigneeId) ||
      body.assigneeId < 1
    ) {
      details.push({ field: 'assigneeId', message: 'assigneeId must be a positive integer' });
    }

    validateActionVersions(body, details, { requireActionVersion: true });

    if (details.length > 0) {
      const code = details.some((d) => d.field === 'assigneeId') ? 'ASSIGNEE_INELIGIBLE' : 'VALIDATION_ERROR';
      validationError(response, details, code);
      return;
    }

    const user = request.auth!.user;
    const assigneeId = Number(body.assigneeId);

    try {
      const txResult = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const parentTicket = await assertParentTicketActive(tx, ticketId);
          const existingAction = await assertActionOnTicket(tx, ticketId, actionId);

          if (existingAction.status === 'CANCELLED') {
            throw new ActionError(400, 'ACTION_CANCELLED_READ_ONLY', 'Cancelled actions cannot be modified');
          }
          if (existingAction.status === 'COMPLETED') {
            throw new ActionError(400, 'ACTION_COMPLETED_REASSIGNMENT_NOT_ALLOWED', 'Completed actions cannot be reassigned');
          }

          const assignee = await tx.user.findUnique({
            where: { id: assigneeId },
            select: { id: true, role: true, isActive: true },
          });

          if (!isEligibleActionAssignee(assignee)) {
            throw new ActionError(400, 'ASSIGNEE_INELIGIBLE', 'Assignee must be an active IT Staff or Administrator', {
              assigneeId: 'Assignee must be an active IT Staff or Administrator',
            });
          }

          if (parentTicket.version !== body.expectedTicketVersion || existingAction.version !== body.expectedActionVersion) {
            throw new ActionError(
              409,
              'CONFLICT',
              'The resource was modified by another user. Reload and try again.',
            );
          }

          const updatedAction = await tx.actionTaken.update({
            where: { id: actionId },
            data: {
              assigneeId,
              version: { increment: 1 },
            },
            select: ACTION_SELECT,
          });

          await tx.actionTakenEvent.create({
            data: {
              actionId,
              actorId: user.id,
              type: 'ASSIGNED',
              before: { assigneeId: existingAction.assignee?.id ?? null },
              after: { assigneeId },
            },
          });

          const updatedTicket = await tx.ticket.update({
            where: { id: ticketId },
            data: {
              version: { increment: 1 },
              updatedAt: new Date(),
            },
            select: { version: true },
          });

          return { action: updatedAction, ticketVersion: updatedTicket.version };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return response.status(200).json({
        data: {
          action: projectAction(txResult.action),
          ticketVersion: txResult.ticketVersion,
        },
      });
    } catch (error) {
      handleActionError(error, response);
    }
  },
);

// PATCH /api/tickets/:ticketId/actions-taken/:actionId/status
ticketActionsTakenRouter.patch(
  '/:actionId/status',
  requireRole('IT_STAFF', 'ADMINISTRATOR'),
  requireTrustedOrigin,
  async (request: Request, response: Response) => {
    const ticketId = parseTicketIdParam(request, response);
    if (ticketId === undefined) return;
    const actionId = parseActionIdParam(request, response);
    if (actionId === undefined) return;

    const body = request.body ?? {};
    const details: ValidationErrorDetail[] = [];

    validateUnknownFields(body, ACTION_STATUS_KEYS, details);

    const targetStatus = body.status as ActionStatus;
    if (!ALL_ACTION_STATUSES.includes(targetStatus)) {
      details.push({
        field: 'status',
        message: `status must be one of ${ALL_ACTION_STATUSES.join(', ')}`,
      });
    }

    validateActionVersions(body, details, { requireActionVersion: true });

    const cancelReason = normalizeActionText(body.cancelReason);
    if (targetStatus === 'CANCELLED') {
      if (!cancelReason || cancelReason.length < 1 || cancelReason.length > 2000) {
        details.push({ field: 'cancelReason', message: 'Cancellation reason is required when cancelling an action' });
      }
    }

    const result = normalizeActionText(body.result);
    if (body.result !== undefined && body.result !== null && result !== null && result.length > 2000) {
      details.push({ field: 'result', message: 'Result must not exceed 2,000 characters' });
    }

    if (details.length > 0) {
      const code = details.some((d) => d.field === 'cancelReason')
        ? 'CANCEL_REASON_REQUIRED'
        : 'VALIDATION_ERROR';
      validationError(response, details, code);
      return;
    }

    const user = request.auth!.user;

    try {
      const txResult = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const parentTicket = await assertParentTicketActive(tx, ticketId);
          const existingAction = await assertActionOnTicket(tx, ticketId, actionId);

          if (!isAllowedActionTransition(existingAction.status, targetStatus)) {
            throw new ActionError(
              400,
              'INVALID_ACTION_TRANSITION',
              `Cannot transition action status from ${existingAction.status} to ${targetStatus}`,
            );
          }

          let targetResult = existingAction.result;
          if (targetStatus === 'COMPLETED') {
            targetResult = result ?? existingAction.result;
            if (!targetResult || targetResult.trim().length === 0) {
              throw new ActionError(400, 'RESULT_REQUIRED', 'Result is required when completing an action', {
                result: 'Result is required when completing an action',
              });
            }
          }

          if (parentTicket.version !== body.expectedTicketVersion || existingAction.version !== body.expectedActionVersion) {
            throw new ActionError(
              409,
              'CONFLICT',
              'The resource was modified by another user. Reload and try again.',
            );
          }

          const updateData: Prisma.ActionTakenUpdateInput = {
            status: targetStatus,
            ...(targetStatus === 'COMPLETED' ? { result: targetResult } : {}),
            ...(targetStatus === 'CANCELLED' ? { cancelReason } : {}),
            version: { increment: 1 },
          };

          const updatedAction = await tx.actionTaken.update({
            where: { id: actionId },
            data: updateData,
            select: ACTION_SELECT,
          });

          const eventType = mapActionStatusToEventType(targetStatus);

          await tx.actionTakenEvent.create({
            data: {
              actionId,
              actorId: user.id,
              type: eventType,
              before: {
                status: existingAction.status,
                ...(existingAction.result ? { result: existingAction.result } : {}),
              },
              after: {
                status: targetStatus,
                ...(targetStatus === 'COMPLETED' ? { result: targetResult } : {}),
                ...(targetStatus === 'CANCELLED' ? { cancelReason } : {}),
              },
            },
          });

          const updatedTicket = await tx.ticket.update({
            where: { id: ticketId },
            data: {
              version: { increment: 1 },
              updatedAt: new Date(),
            },
            select: { version: true },
          });

          return { action: updatedAction, ticketVersion: updatedTicket.version };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return response.status(200).json({
        data: {
          action: projectAction(txResult.action),
          ticketVersion: txResult.ticketVersion,
        },
      });
    } catch (error) {
      handleActionError(error, response);
    }
  },
);

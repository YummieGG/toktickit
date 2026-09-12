import { Router, type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import {
  ensureTicketAccessible,
  findAttachmentForUser,
  getAuthenticatedUser,
  sendNotFound,
} from '../lib/authorization';
import {
  getUploadsDirectory,
  MAX_ACTIVE_ATTACHMENTS,
  MAX_ATTACHMENT_SIZE_BYTES,
  prepareAttachment,
  removeStoredFiles,
  storePreparedAttachment,
  validateAttachmentFile,
} from '../lib/attachment-policy';
import { requireAuth, requirePasswordChanged, requireRole } from '../middleware/auth';
import { requireTrustedOrigin } from '../middleware/csrf';
import {
  internalError,
  isPositiveIntegerString,
  type ValidationErrorDetail,
  validationError,
} from '../lib/validation';

export const attachmentsRouter = Router();
export const ticketAttachmentsRouter = Router({ mergeParams: true });

attachmentsRouter.use(requireAuth, requirePasswordChanged);
ticketAttachmentsRouter.use(requireAuth, requirePasswordChanged);

const singleFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES, files: 1 },
});

function parseId(value: unknown, field: string, details: ValidationErrorDetail[]): number | undefined {
  const normalized = typeof value === 'string' ? value : undefined;
  if (!normalized || !isPositiveIntegerString(normalized)) {
    details.push({ field, message: `${field} must be a positive integer` });
    return undefined;
  }
  return Number(normalized);
}

/** Authentication and role checks intentionally run before multer. */
function handleSingleFileUpload(request: Request, response: Response, next: NextFunction): void {
  if (!(request.headers['content-type'] || '').includes('multipart/form-data')) {
    validationError(response, [{ field: 'file', message: 'A multipart file is required' }]);
    return;
  }

  singleFileUpload.single('file')(request, response, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'File exceeds the 5 MB limit'
        : error.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Exactly one file using the file field is required'
          : error.message;
      validationError(response, [{ field: 'file', message }]);
      return;
    }
    if (error) {
      validationError(response, [{ field: 'file', message: 'Failed to process file upload' }]);
      return;
    }
    next();
  });
}

async function getAuthorizedAttachment(attachmentId: number, request: Request, response: Response) {
  const attachment = await findAttachmentForUser(getAuthenticatedUser(request), attachmentId, {
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
    ticket: { select: { requesterId: true } },
  });
  if (!attachment) {
    sendNotFound(response);
    return null;
  }
  return attachment;
}

const ticketUploadQueues = new Map<number, Promise<void>>();

async function withTicketUploadLock<T>(ticketId: number, callback: () => Promise<T>): Promise<T> {
  const currentLock = ticketUploadQueues.get(ticketId) ?? Promise.resolve();
  let release!: () => void;
  const nextLock = new Promise<void>(resolve => { release = resolve; });
  ticketUploadQueues.set(ticketId, nextLock);
  try {
    await currentLock;
    return await callback();
  } finally {
    release();
    if (ticketUploadQueues.get(ticketId) === nextLock) ticketUploadQueues.delete(ticketId);
  }
}

// POST /api/tickets/:ticketId/attachments — Requester owner only.
ticketAttachmentsRouter.post(
  '/',
  requireRole('REQUESTER'),
  requireTrustedOrigin,
  handleSingleFileUpload,
  async (request: Request, response: Response) => {
    const details: ValidationErrorDetail[] = [];
    const ticketId = parseId(request.params.ticketId, 'ticketId', details);
    if (details.length > 0 || ticketId === undefined) return validationError(response, details);

    try {
      if (!(await ensureTicketAccessible(getAuthenticatedUser(request), ticketId, response))) return;

      if (!request.file) return validationError(response, [{ field: 'file', message: 'File is required' }]);
      const fileError = validateAttachmentFile(request.file);
      if (fileError) return validationError(response, [{ field: 'file', message: fileError }]);

      return await withTicketUploadLock(ticketId, async () => {
        const activeCount = await prisma.attachment.count({ where: { ticketId, isRemoved: false } });
        if (activeCount >= MAX_ACTIVE_ATTACHMENTS) {
          return validationError(response, [{ field: 'file', message: 'Maximum 5 active attachments allowed per ticket' }]);
        }

        const prepared = prepareAttachment(request.file!);
        let storedPath: string;
        try {
          storedPath = await storePreparedAttachment(getUploadsDirectory(), prepared);
        } catch (error) {
          console.error('Error storing attachment:', error);
          return internalError(response);
        }

        try {
          const attachment = await prisma.$transaction(async transaction => {
            const currentCount = await transaction.attachment.count({ where: { ticketId, isRemoved: false } });
            if (currentCount >= MAX_ACTIVE_ATTACHMENTS) {
              const limitError = new Error('Maximum 5 active attachments allowed per ticket');
              (limitError as Error & { isLimitExceeded?: boolean }).isLimitExceeded = true;
              throw limitError;
            }
            return transaction.attachment.create({
              data: {
                originalName: prepared.originalName,
                storedName: prepared.storedName,
                mimeType: prepared.mimeType,
                sizeBytes: prepared.sizeBytes,
                isRemoved: false,
                ticketId,
              },
              select: {
                id: true,
                originalName: true,
                storedName: true,
                mimeType: true,
                sizeBytes: true,
                isRemoved: true,
                createdAt: true,
                ticketId: true,
              },
            });
          });
          return response.status(201).json({ data: attachment });
        } catch (error) {
          await removeStoredFiles([storedPath]);
          if ((error as { isLimitExceeded?: boolean }).isLimitExceeded) {
            return validationError(response, [{ field: 'file', message: 'Maximum 5 active attachments allowed per ticket' }]);
          }
          throw error;
        }
      });
    } catch (error) {
      console.error('Error uploading attachment:', error);
      return internalError(response);
    }
  },
);

// GET /api/attachments/:id — Requester owner, IT Staff, and Administrator.
attachmentsRouter.get('/:id', async (request: Request, response: Response) => {
  const details: ValidationErrorDetail[] = [];
  const attachmentId = parseId(request.params.id, 'id', details);
  if (details.length > 0 || attachmentId === undefined) return validationError(response, details);

  try {
    const attachment = await getAuthorizedAttachment(attachmentId, request, response);
    if (!attachment) return;
    return response.status(200).json({
      data: {
        id: attachment.id,
        originalName: attachment.originalName,
        storedName: attachment.storedName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        isRemoved: attachment.isRemoved,
        createdAt: attachment.createdAt,
        ticketId: attachment.ticketId,
      },
    });
  } catch (error) {
    console.error('Error fetching attachment metadata:', error);
    return internalError(response);
  }
});

// GET /api/attachments/:id/download — Requester owner or IT Staff.
attachmentsRouter.get(
  '/:id/download',
  requireRole('REQUESTER', 'IT_STAFF'),
  async (request: Request, response: Response) => {
    const details: ValidationErrorDetail[] = [];
    const attachmentId = parseId(request.params.id, 'id', details);
    if (details.length > 0 || attachmentId === undefined) return validationError(response, details);

    try {
      const attachment = await getAuthorizedAttachment(attachmentId, request, response);
      if (!attachment) return;
      if (attachment.isRemoved) {
        return validationError(response, [{ field: 'attachment', message: 'Removed attachments cannot be downloaded' }]);
      }
      if (path.basename(attachment.storedName) !== attachment.storedName) {
        sendNotFound(response);
        return;
      }
      const filePath = path.join(getUploadsDirectory(), attachment.storedName);
      try {
        await fs.promises.access(filePath, fs.constants.R_OK);
      } catch {
        sendNotFound(response);
        return;
      }
      response.type(attachment.mimeType);
      return response.download(filePath, attachment.originalName, error => {
        if (error && !response.headersSent) internalError(response);
      });
    } catch (error) {
      console.error('Error downloading attachment:', error);
      return internalError(response);
    }
  },
);

// PATCH /api/attachments/:id/remove — Requester owner only.
attachmentsRouter.patch(
  '/:id/remove',
  requireRole('REQUESTER'),
  requireTrustedOrigin,
  async (request: Request, response: Response) => {
    const details: ValidationErrorDetail[] = [];
    const attachmentId = parseId(request.params.id, 'id', details);
    const removalReason = typeof request.body?.removalReason === 'string' ? request.body.removalReason.trim() : '';
    if (removalReason.length < 3 || removalReason.length > 500) {
      details.push({ field: 'removalReason', message: 'Removal reason must be between 3 and 500 characters' });
    }
    if (details.length > 0 || attachmentId === undefined) return validationError(response, details);

    try {
      const attachment = await getAuthorizedAttachment(attachmentId, request, response);
      if (!attachment) return;
      if (attachment.isRemoved) {
        return validationError(response, [{ field: 'attachment', message: 'Attachment has already been removed' }]);
      }
      await prisma.attachment.update({
        where: { id: attachmentId },
        data: { isRemoved: true, removalReason, removedAt: new Date() },
      });
      return response.status(204).send();
    } catch (error) {
      console.error('Error removing attachment:', error);
      return internalError(response);
    }
  },
);

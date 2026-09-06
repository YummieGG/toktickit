import { Router, type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import {
  getUploadsDirectory,
  MAX_ACTIVE_ATTACHMENTS,
  MAX_ATTACHMENT_SIZE_BYTES,
  prepareAttachment,
  removeStoredFiles,
  storePreparedAttachment,
  validateAttachmentFile,
} from '../lib/attachment-policy';

import {
  validatePositiveIntegerParam,
  validateActiveRequester,
  validationError,
  type ValidationErrorDetail,
} from '../lib/validation';

export const attachmentsRouter = Router();
export const ticketAttachmentsRouter = Router({ mergeParams: true });

const singleFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES, files: 1 },
});

function handleSingleFileUpload(req: Request, res: Response, next: NextFunction) {
  if (!(req.headers['content-type'] || '').includes('multipart/form-data')) {
    return validationError(res, [{ field: 'file', message: 'A multipart file is required' }]);
  }

  singleFileUpload.single('file')(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'File exceeds the 5 MB limit'
        : error.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Exactly one file using the file field is required'
          : error.message;
      return validationError(res, [{ field: 'file', message }]);
    }
    if (error) {
      return validationError(res, [{ field: 'file', message: 'Failed to process file upload' }]);
    }
    next();
  });
}

async function findOwnedTicket(ticketId: number, requesterId: number, res: Response) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, requesterId: true },
  });
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return null;
  }
  if (ticket.requesterId !== requesterId) {
    res.status(403).json({ error: 'You do not have access to this ticket' });
    return null;
  }
  return ticket;
}

const ticketUploadQueues = new Map<number, Promise<void>>();

async function withTicketUploadLock<T>(ticketId: number, fn: () => Promise<T>): Promise<T> {
  const currentLock = ticketUploadQueues.get(ticketId) ?? Promise.resolve();
  let release!: () => void;
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  ticketUploadQueues.set(ticketId, nextLock);

  try {
    await currentLock;
    return await fn();
  } finally {
    release();
    if (ticketUploadQueues.get(ticketId) === nextLock) {
      ticketUploadQueues.delete(ticketId);
    }
  }
}

async function findOwnedAttachment(attachmentId: number, requesterId: number, res: Response) {
  const ownership = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    select: {
      id: true,
      ticket: { select: { requesterId: true } },
    },
  });
  if (!ownership) {
    res.status(404).json({ error: 'Attachment not found' });
    return null;
  }
  if (ownership.ticket.requesterId !== requesterId) {
    res.status(403).json({ error: 'You do not have access to this attachment' });
    return null;
  }

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { ticket: { select: { requesterId: true } } },
  });
  if (!attachment) {
    res.status(404).json({ error: 'Attachment not found' });
    return null;
  }
  return attachment;
}

ticketAttachmentsRouter.post('/', handleSingleFileUpload, async (req: Request, res: Response) => {
  const details: ValidationErrorDetail[] = [];
  const ticketId = validatePositiveIntegerParam(req.params.ticketId, 'ticketId', details);
  const requesterId = validatePositiveIntegerParam(req.body.requesterId ?? req.query.requesterId, 'requesterId', details);
  if (details.length > 0 || ticketId === undefined || requesterId === undefined) {
    return validationError(res, details);
  }

  try {
    if (!(await validateActiveRequester(requesterId, res))) return;
    if (!(await findOwnedTicket(ticketId, requesterId, res))) return;

    if (!req.file) {
      return validationError(res, [{ field: 'file', message: 'File is required' }]);
    }
    const fileError = validateAttachmentFile(req.file);
    if (fileError) {
      return validationError(res, [{ field: 'file', message: fileError }]);
    }

    return await withTicketUploadLock(ticketId, async () => {
      const activeCount = await prisma.attachment.count({
        where: { ticketId, isRemoved: false },
      });
      if (activeCount >= MAX_ACTIVE_ATTACHMENTS) {
        return validationError(res, [{ field: 'file', message: 'Maximum 5 active attachments allowed per ticket' }]);
      }

      const prepared = prepareAttachment(req.file!);
      let storedPath: string;
      try {
        storedPath = await storePreparedAttachment(getUploadsDirectory(), prepared);
      } catch (error) {
        console.error('Error storing attachment:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

      try {
        const createRecord = async (client: typeof prisma) => {
          return client.attachment.create({
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
        };

        const attachment = typeof prisma.$transaction === 'function'
          ? await prisma.$transaction(async (tx: any) => {
              const currentCount = await tx.attachment.count({
                where: { ticketId, isRemoved: false },
              });
              if (currentCount >= MAX_ACTIVE_ATTACHMENTS) {
                const err = new Error('LIMIT_EXCEEDED');
                (err as any).isLimitExceeded = true;
                throw err;
              }
              return createRecord(tx);
            })
          : await createRecord(prisma);

        return res.status(201).json({ data: attachment });
      } catch (error) {
        await removeStoredFiles([storedPath]);
        if ((error as any)?.isLimitExceeded) {
          return validationError(res, [{ field: 'file', message: 'Maximum 5 active attachments allowed per ticket' }]);
        }
        throw error;
      }
    });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

attachmentsRouter.get('/:id', async (req: Request, res: Response) => {
  const details: ValidationErrorDetail[] = [];
  const attachmentId = validatePositiveIntegerParam(req.params.id, 'id', details);
  const requesterId = validatePositiveIntegerParam(req.query.requesterId, 'requesterId', details);
  if (details.length > 0 || attachmentId === undefined || requesterId === undefined) {
    return validationError(res, details);
  }

  try {
    if (!(await validateActiveRequester(requesterId, res))) return;
    const attachment = await findOwnedAttachment(attachmentId, requesterId, res);
    if (!attachment) return;
    const metadata = {
      id: attachment.id,
      originalName: attachment.originalName,
      storedName: attachment.storedName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      isRemoved: attachment.isRemoved,
      createdAt: attachment.createdAt,
      ticketId: attachment.ticketId,
    };
    return res.status(200).json({ data: metadata });
  } catch (error) {
    console.error('Error fetching attachment metadata:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

attachmentsRouter.get('/:id/download', async (req: Request, res: Response) => {
  const details: ValidationErrorDetail[] = [];
  const attachmentId = validatePositiveIntegerParam(req.params.id, 'id', details);
  const requesterId = validatePositiveIntegerParam(req.query.requesterId, 'requesterId', details);
  if (details.length > 0 || attachmentId === undefined || requesterId === undefined) {
    return validationError(res, details);
  }

  try {
    if (!(await validateActiveRequester(requesterId, res))) return;
    const attachment = await findOwnedAttachment(attachmentId, requesterId, res);
    if (!attachment) return;
    if (attachment.isRemoved) {
      return validationError(res, [{ field: 'attachment', message: 'Removed attachments cannot be downloaded' }]);
    }
    if (path.basename(attachment.storedName) !== attachment.storedName) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    const filePath = path.join(getUploadsDirectory(), attachment.storedName);
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.type(attachment.mimeType);
    return res.download(filePath, attachment.originalName, error => {
      if (error && !res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  } catch (error) {
    console.error('Error downloading attachment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

attachmentsRouter.patch('/:id/remove', async (req: Request, res: Response) => {
  const details: ValidationErrorDetail[] = [];
  const attachmentId = validatePositiveIntegerParam(req.params.id, 'id', details);
  const requesterId = validatePositiveIntegerParam(req.body.requesterId, 'requesterId', details);
  const removalReason = typeof req.body.removalReason === 'string' ? req.body.removalReason.trim() : '';
  if (removalReason.length < 3 || removalReason.length > 500) {
    details.push({ field: 'removalReason', message: 'Removal reason must be between 3 and 500 characters' });
  }
  if (details.length > 0 || attachmentId === undefined || requesterId === undefined) {
    return validationError(res, details);
  }

  try {
    if (!(await validateActiveRequester(requesterId, res))) return;
    const attachment = await findOwnedAttachment(attachmentId, requesterId, res);
    if (!attachment) return;
    if (attachment.isRemoved) {
      return validationError(res, [{ field: 'attachment', message: 'Attachment has already been removed' }]);
    }

    const removed = await prisma.attachment.update({
      where: { id: attachmentId },
      data: { isRemoved: true, removalReason, removedAt: new Date() },
      select: {
        id: true,
        originalName: true,
        isRemoved: true,
        removalReason: true,
        removedAt: true,
      },
    });
    return res.status(200).json({ data: removed });
  } catch (error) {
    console.error('Error removing attachment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

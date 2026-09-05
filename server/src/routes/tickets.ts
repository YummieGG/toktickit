import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { Prisma } from '../../generated/prisma';
import { generateTicketNumber } from '../lib/ticket-number';

export const ticketsRouter = Router();

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB per file (BR-09)

interface PreparedAttachment {
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
}

async function removeStoredFiles(filePaths: string[]): Promise<void> {
  await Promise.all(filePaths.map(async filePath => {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`Failed to clean up attachment file ${filePath}:`, error);
      }
    }
  }));
}

async function storePreparedAttachments(
  uploadsDir: string,
  attachments: PreparedAttachment[]
): Promise<string[]> {
  if (attachments.length === 0) return [];

  await fs.promises.mkdir(uploadsDir, { recursive: true });
  const storedPaths: string[] = [];

  try {
    for (const attachment of attachments) {
      const filePath = path.join(uploadsDir, attachment.storedName);
      await fs.promises.writeFile(filePath, attachment.buffer, { flag: 'wx' });
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
    fileSize: MAX_FILE_SIZE,
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
      if (typeof normalizedValue !== 'string' && typeof normalizedValue !== 'number') {
        details.push({ field: fieldName, message: `${fieldName} must be a valid integer` });
        return isRequired ? undefined : null;
      }
      if (typeof normalizedValue === 'string' && !/^[1-9]\d*$/.test(normalizedValue)) {
        details.push({ field: fieldName, message: `${fieldName} must be a valid integer` });
        return isRequired ? undefined : null;
      }
      const parsed = Number(normalizedValue);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        details.push({ field: fieldName, message: `${fieldName} must be a valid integer` });
        return isRequired ? undefined : null;
      }
      return parsed;
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

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    if (!requestedPriority || !validPriorities.includes(requestedPriority)) {
      details.push({ field: 'requestedPriority', message: 'Invalid requested priority. Must be one of LOW, MEDIUM, HIGH, CRITICAL' });
    }

    // Attachment validation (BR-08, BR-09, BR-10)
    const rawFiles = (req.files as Express.Multer.File[]) || [];
    if (rawFiles.length > 5) {
      details.push({ field: 'attachments', message: 'Maximum 5 attachments allowed per ticket' });
    }

    for (const file of rawFiles) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        details.push({ 
          field: 'attachments', 
          message: `File type for "${file.originalname}" is not permitted. Supported formats: JPG, PNG, WEBP, PDF` 
        });
      }

      if (file.size > MAX_FILE_SIZE) {
        details.push({ 
          field: 'attachments', 
          message: `File "${file.originalname}" exceeds the 5 MB limit` 
        });
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
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    const preparedAttachments: PreparedAttachment[] = rawFiles.map(f => {
      const ext = path.extname(f.originalname);
      const storedName = `${crypto.randomUUID()}${ext}`;
      return {
        originalName: f.originalname,
        storedName,
        mimeType: f.mimetype,
        sizeBytes: f.size,
        buffer: f.buffer
      };
    });

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

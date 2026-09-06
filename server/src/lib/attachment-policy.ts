import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export const ALLOWED_ATTACHMENT_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'] as const;
export const MAX_ATTACHMENT_SIZE_BYTES = 5_242_880;
export const MAX_ACTIVE_ATTACHMENTS = 5;

export interface PreparedAttachment {
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
}

export function getUploadsDirectory(): string {
  return process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.resolve(process.cwd(), 'uploads');
}

export function validateAttachmentFile(file: Express.Multer.File): string | null {
  const extension = path.extname(file.originalname).toLowerCase();
  if (
    !ALLOWED_ATTACHMENT_EXTENSIONS.includes(extension as (typeof ALLOWED_ATTACHMENT_EXTENSIONS)[number]) ||
    !ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number])
  ) {
    return `File type for "${file.originalname}" is not permitted. Supported formats: JPG, PNG, WEBP, PDF`;
  }
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return `File "${file.originalname}" exceeds the 5 MB limit`;
  }
  return null;
}

export function prepareAttachment(file: Express.Multer.File): PreparedAttachment {
  const extension = path.extname(file.originalname).toLowerCase();
  return {
    originalName: file.originalname,
    storedName: `${crypto.randomUUID()}${extension}`,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    buffer: file.buffer,
  };
}

export async function storePreparedAttachment(
  uploadsDirectory: string,
  attachment: PreparedAttachment
): Promise<string> {
  await fs.promises.mkdir(uploadsDirectory, { recursive: true });
  const filePath = path.join(uploadsDirectory, attachment.storedName);
  await fs.promises.writeFile(filePath, attachment.buffer, { flag: 'wx' });
  return filePath;
}

export async function removeStoredFiles(filePaths: string[]): Promise<void> {
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

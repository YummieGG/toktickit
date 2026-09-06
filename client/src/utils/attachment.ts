export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export const ALLOWED_ATTACHMENT_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'] as const;
export const MAX_ATTACHMENT_SIZE_BYTES = 5_242_880;
export const MAX_ACTIVE_ATTACHMENTS = 5;

export function validateAttachmentSelection(
  file: File,
  attachmentCount: number,
  countLabel = 'active attachments'
): string | null {
  const dotIndex = file.name.lastIndexOf('.');
  const extension = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : '';
  if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(extension as (typeof ALLOWED_ATTACHMENT_EXTENSIONS)[number])) {
    return `File type ${extension || '(none)'} is not permitted. Supported formats: JPG, PNG, WEBP, PDF`;
  }
  if (
    file.type &&
    !ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type as (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number])
  ) {
    return `File type "${file.type}" is not permitted. Supported formats: JPG, PNG, WEBP, PDF`;
  }
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return `File "${file.name}" exceeds the 5 MB limit`;
  }
  if (attachmentCount >= MAX_ACTIVE_ATTACHMENTS) {
    return `Maximum 5 ${countLabel} allowed per ticket`;
  }
  return null;
}

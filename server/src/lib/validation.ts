import type { Response } from 'express';

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export function getSingleStringParam(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function isPositiveIntegerString(value: string): boolean {
  if (!/^[1-9]\d*$/.test(value)) return false;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= 2_147_483_647;
}

export function validatePositiveIntegerParam(
  rawValue: unknown,
  field: string,
  details: ValidationErrorDetail[],
  options?: { required?: boolean }
): number | undefined {
  const isRequired = options?.required ?? true;
  if (rawValue === undefined) {
    if (isRequired) {
      details.push({ field, message: `${field} must be a positive integer` });
    }
    return undefined;
  }

  const normalized = typeof rawValue === 'number' ? String(rawValue) : (typeof rawValue === 'string' ? rawValue : undefined);
  if (!normalized || !isPositiveIntegerString(normalized)) {
    details.push({ field, message: `${field} must be a positive integer` });
    return undefined;
  }

  return Number(normalized);
}

export function validationError(
  res: Response,
  details: ValidationErrorDetail[],
  code: 'VALIDATION_ERROR' | 'INVALID_QUERY' = 'VALIDATION_ERROR',
) {
  return res.status(400).json({
    error: {
      code,
      message: code === 'INVALID_QUERY' ? 'Query is invalid' : 'Request is invalid',
      fields: Object.fromEntries(details.map(({ field, message }) => [field, message])),
    },
    // Retained for backward compatibility with Lab 2 clients.
    details,
  });
}

export function internalError(res: Response) {
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Unable to process the request' },
  });
}

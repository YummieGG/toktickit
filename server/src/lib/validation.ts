import type { Response } from 'express';
import { getUserDelegate, hasUserModelDelegate } from './user-delegate';

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

export function validationError(res: Response, details: ValidationErrorDetail[]) {
  return res.status(400).json({ error: 'Validation failed', details });
}

export async function validateActiveRequester(
  requesterId: number,
  res: Response
): Promise<boolean> {
  const requester = await getUserDelegate().findUnique({
    where: { id: requesterId },
    select: {
      id: true,
      isActive: true,
      ...(hasUserModelDelegate() ? { role: true } : {}),
    },
  });

  if (!requester || !requester.isActive || (hasUserModelDelegate() && requester.role !== 'REQUESTER')) {
    validationError(res, [{ field: 'requesterId', message: 'Requester not found or is inactive' }]);
    return false;
  }

  return true;
}

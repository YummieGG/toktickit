import { Router, type Request, type Response } from 'express';
import { Prisma, type UserRole } from '../../generated/prisma';
import {
  canonicalizeEmail,
  isValidEmail,
  userProjection,
} from '../lib/auth';
import { hashPassword, validatePassword } from '../lib/password';
import {
  getSingleStringParam,
  validatePositiveIntegerParam,
  type ValidationErrorDetail,
} from '../lib/validation';
import { prisma } from '../lib/prisma';
import { requireAuth, requirePasswordChanged, requireRole } from '../middleware/auth';
import { requireTrustedOrigin } from '../middleware/csrf';

const USER_ROLES: readonly UserRole[] = ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'];
const EDITABLE_FIELDS = new Set(['name', 'email', 'role', 'isActive']);

const ADMIN_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
} as const satisfies Prisma.UserSelect;

type AdminUserRecord = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
};

class AdminUserError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AdminUserError';
  }
}

function apiError(
  response: Response,
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
) {
  return response.status(status).json({
    error: { code, message, ...(fields ? { fields } : {}) },
  });
}

function validationError(response: Response, code: string, details: ValidationErrorDetail[]) {
  return apiError(
    response,
    400,
    code,
    code === 'INVALID_QUERY' ? 'Query is invalid' : 'Request is invalid',
    Object.fromEntries(details.map(({ field, message }) => [field, message])),
  );
}

function conflictError(response: Response, code: string, message: string) {
  return apiError(response, 409, code, message);
}

function internalError(response: Response) {
  return apiError(response, 500, 'INTERNAL_ERROR', 'Unable to process the request');
}

function bodyRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && USER_ROLES.includes(value as UserRole);
}

function isKnownPrismaError(error: unknown, code: string): boolean {
  return (error instanceof Prisma.PrismaClientKnownRequestError && error.code === code)
    || (typeof error === 'object' && error !== null && 'code' in error && error.code === code);
}

function parseUserId(request: Request, response: Response): number | undefined {
  const details: ValidationErrorDetail[] = [];
  const userId = validatePositiveIntegerParam(request.params.id, 'id', details);
  if (details.length > 0 || userId === undefined) {
    validationError(response, 'INVALID_USER_UPDATE', details);
    return undefined;
  }
  return userId;
}

function validateCreateBody(body: Record<string, unknown>): {
  details: ValidationErrorDetail[];
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  initialPassword?: string;
} {
  const details: ValidationErrorDetail[] = [];
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) details.push({ field: 'name', message: 'Name is required' });

  const email = canonicalizeEmail(body.email);
  if (!email) details.push({ field: 'email', message: 'Email is required' });
  else if (!isValidEmail(email)) details.push({ field: 'email', message: 'Enter a valid email address' });

  const role = body.role;
  if (!isUserRole(role)) details.push({ field: 'role', message: `Role must be one of ${USER_ROLES.join(', ')}` });

  if (typeof body.isActive !== 'boolean') {
    details.push({ field: 'isActive', message: 'isActive must be a boolean' });
  }

  const initialPassword = body.initialPassword;
  const passwordError = validatePassword(initialPassword);
  if (passwordError) details.push({ field: 'initialPassword', message: passwordError.message });

  return {
    details,
    ...(name ? { name } : {}),
    ...(email ? { email } : {}),
    ...(isUserRole(role) ? { role } : {}),
    ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}),
    ...(typeof initialPassword === 'string' ? { initialPassword } : {}),
  };
}

function validateEditBody(body: Record<string, unknown>): {
  details: ValidationErrorDetail[];
  data: { name?: string; email?: string; role?: UserRole; isActive?: boolean };
} {
  const details: ValidationErrorDetail[] = [];
  const data: { name?: string; email?: string; role?: UserRole; isActive?: boolean } = {};
  const keys = Object.keys(body);

  if (keys.length === 0) {
    details.push({ field: 'body', message: 'At least one editable field is required' });
  }
  for (const key of keys) {
    if (!EDITABLE_FIELDS.has(key)) details.push({ field: key, message: 'Field is not editable' });
  }

  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      details.push({ field: 'name', message: 'Name is required' });
    } else {
      data.name = body.name.trim();
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'email')) {
    const email = canonicalizeEmail(body.email);
    if (!email) details.push({ field: 'email', message: 'Email is required' });
    else if (!isValidEmail(email)) details.push({ field: 'email', message: 'Enter a valid email address' });
    else data.email = email;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'role')) {
    if (!isUserRole(body.role)) details.push({ field: 'role', message: `Role must be one of ${USER_ROLES.join(', ')}` });
    else data.role = body.role;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'isActive')) {
    if (typeof body.isActive !== 'boolean') details.push({ field: 'isActive', message: 'isActive must be a boolean' });
    else data.isActive = body.isActive;
  }

  return { details, data };
}

function handleAdminUserError(error: unknown, response: Response, operation: string) {
  if (error instanceof AdminUserError) {
    return apiError(response, error.status, error.code, error.message, error.fields);
  }
  if (isKnownPrismaError(error, 'P2002')) {
    return conflictError(response, 'DUPLICATE_EMAIL', 'A user with this email already exists');
  }
  if (isKnownPrismaError(error, 'P2034')) {
    return conflictError(response, 'CONFLICT', 'The user changed while this operation was in progress. Retry the request');
  }
  console.error(`Error ${operation}:`, error);
  return internalError(response);
}

export const adminUsersRouter = Router();
adminUsersRouter.use(requireAuth, requirePasswordChanged, requireRole('ADMINISTRATOR'));

adminUsersRouter.get('/', async (request: Request, response: Response) => {
  const details: ValidationErrorDetail[] = [];
  const rawSearch = request.query.search;
  const rawRole = request.query.role;
  if (rawSearch !== undefined && typeof rawSearch !== 'string') {
    details.push({ field: 'search', message: 'search must be a single string' });
  }
  if (rawRole !== undefined && (typeof rawRole !== 'string' || !isUserRole(rawRole))) {
    details.push({ field: 'role', message: `Role must be one of ${USER_ROLES.join(', ')}` });
  }
  if (details.length > 0) return validationError(response, 'INVALID_QUERY', details);

  const search = (getSingleStringParam(rawSearch) ?? '').trim();
  const role = getSingleStringParam(rawRole) as UserRole | undefined;
  const where: Prisma.UserWhereInput = {
    ...(search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    } : {}),
    ...(role ? { role } : {}),
  };

  try {
    const users = await prisma.user.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: ADMIN_USER_SELECT,
    });
    return response.status(200).json({
      data: users.map((user) => userProjection(user)),
    });
  } catch (error) {
    return handleAdminUserError(error, response, 'fetching admin users');
  }
});

adminUsersRouter.post('/', requireTrustedOrigin, async (request: Request, response: Response) => {
  const parsed = validateCreateBody(bodyRecord(request.body));
  if (parsed.details.length > 0 || !parsed.name || !parsed.email || !parsed.role || parsed.isActive === undefined || !parsed.initialPassword) {
    return validationError(response, 'INVALID_USER_CREATE', parsed.details);
  }

  try {
    const passwordHash = await hashPassword(parsed.initialPassword);
    const user = await prisma.user.create({
      data: {
        name: parsed.name,
        email: parsed.email,
        role: parsed.role,
        isActive: parsed.isActive,
        passwordHash,
        mustChangePassword: true,
      },
      select: ADMIN_USER_SELECT,
    });
    return response.status(201).json({ data: userProjection(user) });
  } catch (error) {
    return handleAdminUserError(error, response, 'creating admin user');
  }
});

adminUsersRouter.patch('/:id', requireTrustedOrigin, async (request: Request, response: Response) => {
  const userId = parseUserId(request, response);
  if (userId === undefined) return;

  const parsed = validateEditBody(bodyRecord(request.body));
  if (parsed.details.length > 0) return validationError(response, 'INVALID_USER_UPDATE', parsed.details);

  try {
    const updatedUser = await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
      const currentUser = await transaction.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, isActive: true },
      });
      if (!currentUser) {
        throw new AdminUserError(404, 'NOT_FOUND', 'Resource not found');
      }

      const nextRole = parsed.data.role ?? currentUser.role;
      const nextIsActive = parsed.data.isActive ?? currentUser.isActive;
      if (request.auth!.user.id === userId && nextIsActive === false) {
        throw new AdminUserError(409, 'SELF_DEACTIVATION', 'You cannot deactivate your own account');
      }

      const removesActiveAdministrator = currentUser.role === 'ADMINISTRATOR'
        && currentUser.isActive
        && (nextRole !== 'ADMINISTRATOR' || !nextIsActive);
      if (removesActiveAdministrator) {
        const remainingAdministrators = await transaction.user.count({
          where: {
            id: { not: userId },
            role: 'ADMINISTRATOR',
            isActive: true,
          },
        });
        if (remainingAdministrators < 1) {
          throw new AdminUserError(409, 'LAST_ADMIN_PROTECTION', 'At least one active Administrator must remain');
        }
      }

      const ownerBecomesIneligible = nextRole === 'REQUESTER' || !nextIsActive;
      if (ownerBecomesIneligible) {
        await transaction.ticket.updateMany({
          where: { ownerId: userId },
          data: { ownerId: null },
        });
      }
      if (!nextIsActive) {
        await transaction.userSession.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      return transaction.user.update({
        where: { id: userId },
        data: parsed.data,
        select: ADMIN_USER_SELECT,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return response.status(200).json({ data: userProjection(updatedUser as AdminUserRecord) });
  } catch (error) {
    return handleAdminUserError(error, response, 'updating admin user');
  }
});

adminUsersRouter.post('/:id/initial-password', requireTrustedOrigin, async (request: Request, response: Response) => {
  const userId = parseUserId(request, response);
  if (userId === undefined) return;

  const initialPassword = bodyRecord(request.body).initialPassword;
  const passwordError = validatePassword(initialPassword);
  if (passwordError) {
    return apiError(response, 400, 'INVALID_PASSWORD', passwordError.message, {
      initialPassword: passwordError.message,
    });
  }

  try {
    const passwordHash = await hashPassword(initialPassword as string);
    await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
      const target = await transaction.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!target) throw new AdminUserError(404, 'NOT_FOUND', 'Resource not found');

      await transaction.user.update({
        where: { id: userId },
        data: { passwordHash, mustChangePassword: true },
      });
      await transaction.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return response.status(204).send();
  } catch (error) {
    return handleAdminUserError(error, response, 'resetting admin user password');
  }
});

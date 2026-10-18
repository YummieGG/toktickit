import { Prisma, type RequestedPriority } from '../../generated/prisma';
import { getSingleStringParam, isPositiveIntegerString, type ValidationErrorDetail } from './validation';

import { ALL_STATUSES } from './status-transition';

export const STAFF_STATUSES = ALL_STATUSES;

export const STAFF_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const satisfies readonly RequestedPriority[];
export const STAFF_SORT_FIELDS = [
  'ticketDate',
  'updatedAt',
  'ticketNumber',
  'currentStatus',
  'requestedPriority',
  'itPriority',
  'owner',
] as const;
export const STAFF_SORT_ORDERS = ['asc', 'desc'] as const;
export const STAFF_PAGE_SIZES = [5, 10, 20] as const;

export type StaffQueueSortField = (typeof STAFF_SORT_FIELDS)[number];
export type StaffQueueSortOrder = (typeof STAFF_SORT_ORDERS)[number];
export type StaffQueuePageSize = (typeof STAFF_PAGE_SIZES)[number];
export type StaffQueueOwner = number | 'unassigned' | 'me';

export interface StaffQueueQuery {
  search?: string;
  status?: (typeof STAFF_STATUSES)[number];
  statuses?: (typeof STAFF_STATUSES)[number][];
  requestedPriority?: (typeof STAFF_PRIORITIES)[number];
  itPriority?: (typeof STAFF_PRIORITIES)[number];
  itPriorities?: (typeof STAFF_PRIORITIES)[number][];
  categoryId?: number;
  ownerId?: StaffQueueOwner;
  updatedFrom?: Date;
  updatedTo?: Date;
  resolvedFrom?: Date;
  resolvedTo?: Date;
  sortBy: StaffQueueSortField;
  sortOrder: StaffQueueSortOrder;
  page: number;
  pageSize: StaffQueuePageSize;
}

export type StaffQueueQueryParseResult =
  | { success: true; data: StaffQueueQuery }
  | { success: false; details: ValidationErrorDetail[] };

function parsePositiveInteger(value: unknown, field: string, details: ValidationErrorDetail[]): number | undefined {
  const raw = getSingleStringParam(value);
  if (raw === undefined || !isPositiveIntegerString(raw.trim())) {
    details.push({ field, message: `${field} must be a positive integer` });
    return undefined;
  }
  return Number(raw.trim());
}

function parseEnum<T extends readonly string[]>(
  query: Record<string, unknown>,
  field: string,
  values: T,
  details: ValidationErrorDetail[],
): T[number] | undefined {
  if (query[field] === undefined) return undefined;
  const value = getSingleStringParam(query[field]);
  if (!value || !values.includes(value)) {
    details.push({ field, message: `${field} must be one of ${values.join(', ')}` });
    return undefined;
  }
  return value as T[number];
}

export function parseStaffQueueQuery(query: Record<string, unknown>): StaffQueueQueryParseResult {
  const details: ValidationErrorDetail[] = [];
  const search = query.search === undefined ? undefined : getSingleStringParam(query.search);
  if (query.search !== undefined && search === undefined) {
    details.push({ field: 'search', message: 'search must be a string' });
  }

  const status = parseEnum(query, 'status', STAFF_STATUSES, details);
  const requestedPriority = parseEnum(query, 'requestedPriority', STAFF_PRIORITIES, details);
  const itPriority = parseEnum(query, 'itPriority', STAFF_PRIORITIES, details);

  let statuses: (typeof STAFF_STATUSES)[number][] | undefined;
  if (query.status !== undefined && query.statuses !== undefined) {
    details.push({ field: 'statuses', message: 'status and statuses cannot be combined' });
  } else if (query.statuses !== undefined) {
    const rawStatuses = getSingleStringParam(query.statuses);
    if (!rawStatuses) {
      details.push({ field: 'statuses', message: 'statuses must be a non-empty string' });
    } else {
      const parts = rawStatuses.split(',').map((s) => s.trim());
      const invalid = parts.filter((s) => !STAFF_STATUSES.includes(s as (typeof STAFF_STATUSES)[number]) || s.length === 0);
      if (invalid.length > 0 || parts.length === 0) {
        details.push({ field: 'statuses', message: `statuses must be comma-separated list of: ${STAFF_STATUSES.join(', ')}` });
      } else {
        statuses = parts as (typeof STAFF_STATUSES)[number][];
      }
    }
  }

  let itPriorities: (typeof STAFF_PRIORITIES)[number][] | undefined;
  if (query.itPriority !== undefined && query.itPriorities !== undefined) {
    details.push({ field: 'itPriorities', message: 'itPriority and itPriorities cannot be combined' });
  } else if (query.itPriorities !== undefined) {
    const rawPriorities = getSingleStringParam(query.itPriorities);
    if (!rawPriorities) {
      details.push({ field: 'itPriorities', message: 'itPriorities must be a non-empty string' });
    } else {
      const parts = rawPriorities.split(',').map((s) => s.trim());
      const invalid = parts.filter((s) => !STAFF_PRIORITIES.includes(s as (typeof STAFF_PRIORITIES)[number]) || s.length === 0);
      if (invalid.length > 0 || parts.length === 0) {
        details.push({ field: 'itPriorities', message: `itPriorities must be comma-separated list of: ${STAFF_PRIORITIES.join(', ')}` });
      } else {
        itPriorities = parts as (typeof STAFF_PRIORITIES)[number][];
      }
    }
  }

  let updatedFrom: Date | undefined;
  if (query.updatedFrom !== undefined) {
    const raw = getSingleStringParam(query.updatedFrom);
    if (!raw || Number.isNaN(Date.parse(raw))) {
      details.push({ field: 'updatedFrom', message: 'updatedFrom must be a valid ISO 8601 timestamp' });
    } else {
      updatedFrom = new Date(raw);
    }
  }

  let updatedTo: Date | undefined;
  if (query.updatedTo !== undefined) {
    const raw = getSingleStringParam(query.updatedTo);
    if (!raw || Number.isNaN(Date.parse(raw))) {
      details.push({ field: 'updatedTo', message: 'updatedTo must be a valid ISO 8601 timestamp' });
    } else {
      updatedTo = new Date(raw);
    }
  }

  let resolvedFrom: Date | undefined;
  if (query.resolvedFrom !== undefined) {
    const raw = getSingleStringParam(query.resolvedFrom);
    if (!raw || Number.isNaN(Date.parse(raw))) {
      details.push({ field: 'resolvedFrom', message: 'resolvedFrom must be a valid ISO 8601 timestamp' });
    } else {
      resolvedFrom = new Date(raw);
    }
  }

  let resolvedTo: Date | undefined;
  if (query.resolvedTo !== undefined) {
    const raw = getSingleStringParam(query.resolvedTo);
    if (!raw || Number.isNaN(Date.parse(raw))) {
      details.push({ field: 'resolvedTo', message: 'resolvedTo must be a valid ISO 8601 timestamp' });
    } else {
      resolvedTo = new Date(raw);
    }
  }

  let rawSortBy = (query.sortBy === undefined ? 'updatedAt' : getSingleStringParam(query.sortBy)) as string | undefined;
  if (rawSortBy === 'status') rawSortBy = 'currentStatus';
  if (rawSortBy === 'lastUpdated') rawSortBy = 'updatedAt';
  const sortBy = rawSortBy;
  const sortOrder = (query.sortOrder === undefined ? 'desc' : getSingleStringParam(query.sortOrder)) as string | undefined;

  if (query.sortBy !== undefined && getSingleStringParam(query.sortBy) === undefined) details.push({ field: 'sortBy', message: 'sortBy must be a string' });
  if (!sortBy || !STAFF_SORT_FIELDS.includes(sortBy as StaffQueueSortField)) {
    details.push({ field: 'sortBy', message: `sortBy must be one of ${STAFF_SORT_FIELDS.join(', ')}` });
  }
  if (query.sortOrder !== undefined && sortOrder === undefined) details.push({ field: 'sortOrder', message: 'sortOrder must be a string' });
  if (!sortOrder || !STAFF_SORT_ORDERS.includes(sortOrder as StaffQueueSortOrder)) {
    details.push({ field: 'sortOrder', message: 'sortOrder must be asc or desc' });
  }

  const pageRaw = query.page === undefined ? '1' : getSingleStringParam(query.page);
  const pageSizeRaw = query.pageSize === undefined ? '10' : getSingleStringParam(query.pageSize);
  if (pageRaw === undefined || !isPositiveIntegerString(pageRaw.trim())) {
    details.push({ field: 'page', message: 'page must be an integer greater than or equal to 1' });
  }
  if (pageSizeRaw === undefined || !isPositiveIntegerString(pageSizeRaw.trim()) || !STAFF_PAGE_SIZES.includes(Number(pageSizeRaw) as StaffQueuePageSize)) {
    details.push({ field: 'pageSize', message: `pageSize must be one of ${STAFF_PAGE_SIZES.join(', ')}` });
  }

  let categoryId: number | undefined;
  if (query.category !== undefined) categoryId = parsePositiveInteger(query.category, 'category', details);

  let ownerId: StaffQueueOwner | undefined;
  if (query.ownerId !== undefined) {
    const ownerRaw = getSingleStringParam(query.ownerId);
    if (ownerRaw === 'unassigned') ownerId = ownerRaw;
    else if (ownerRaw === 'me') ownerId = 'me';
    else if (ownerRaw !== undefined && isPositiveIntegerString(ownerRaw.trim())) ownerId = Number(ownerRaw.trim());
    else details.push({ field: 'ownerId', message: 'ownerId must be a positive integer, unassigned, or me' });
  }

  if (details.length > 0) return { success: false, details };
  return {
    success: true,
    data: {
      ...(search?.trim() ? { search: search.trim() } : {}),
      ...(status ? { status } : {}),
      ...(statuses ? { statuses } : {}),
      ...(requestedPriority ? { requestedPriority } : {}),
      ...(itPriority ? { itPriority } : {}),
      ...(itPriorities ? { itPriorities } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(ownerId !== undefined ? { ownerId } : {}),
      ...(updatedFrom ? { updatedFrom } : {}),
      ...(updatedTo ? { updatedTo } : {}),
      ...(resolvedFrom ? { resolvedFrom } : {}),
      ...(resolvedTo ? { resolvedTo } : {}),
      sortBy: sortBy as StaffQueueSortField,
      sortOrder: sortOrder as StaffQueueSortOrder,
      page: Number(pageRaw),
      pageSize: Number(pageSizeRaw) as StaffQueuePageSize,
    },
  };
}

export function buildStaffQueueWhere(query: StaffQueueQuery, currentUserId?: number): Prisma.TicketWhereInput {
  return {
    ...(query.statuses ? { currentStatus: { in: query.statuses } } : query.status ? { currentStatus: query.status } : {}),
    ...(query.itPriorities ? { itPriority: { in: query.itPriorities } } : query.itPriority ? { itPriority: query.itPriority } : {}),
    ...(query.requestedPriority ? { requestedPriority: query.requestedPriority } : {}),
    ...(query.categoryId !== undefined ? { categoryId: query.categoryId } : {}),
    ...(query.ownerId === 'unassigned'
      ? { ownerId: null }
      : query.ownerId === 'me'
        ? { ownerId: currentUserId ?? -1 }
        : query.ownerId !== undefined
          ? { ownerId: query.ownerId }
          : {}),
    ...(query.updatedFrom || query.updatedTo
      ? {
          updatedAt: {
            ...(query.updatedFrom ? { gte: query.updatedFrom } : {}),
            ...(query.updatedTo ? { lte: query.updatedTo } : {}),
          },
        }
      : {}),
    ...(query.resolvedFrom || query.resolvedTo
      ? {
          resolvedAt: {
            ...(query.resolvedFrom ? { gte: query.resolvedFrom } : {}),
            ...(query.resolvedTo ? { lte: query.resolvedTo } : {}),
          },
        }
      : {}),
    ...(query.search
      ? {
          OR: [
            { ticketNumber: { contains: query.search, mode: 'insensitive' } },
            { summary: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { requester: { name: { contains: query.search, mode: 'insensitive' } } },
            { requester: { email: { contains: query.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };
}

export function buildStaffQueueOrderBy(query: StaffQueueQuery): Prisma.TicketOrderByWithRelationInput[] {
  const order = query.sortOrder as Prisma.SortOrder;
  const primary: Prisma.TicketOrderByWithRelationInput = query.sortBy === 'owner'
    ? { owner: { name: order } }
    : { [query.sortBy]: order };
  return [primary, { id: 'desc' }];
}

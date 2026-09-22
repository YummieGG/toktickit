import { Prisma, type TicketStatus, type RequestedPriority } from '../../generated/prisma';
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
export type StaffQueueOwner = number | 'unassigned';

export interface StaffQueueQuery {
  search?: string;
  status?: (typeof STAFF_STATUSES)[number];
  requestedPriority?: (typeof STAFF_PRIORITIES)[number];
  itPriority?: (typeof STAFF_PRIORITIES)[number];
  categoryId?: number;
  ownerId?: StaffQueueOwner;
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
    else if (ownerRaw !== undefined && isPositiveIntegerString(ownerRaw.trim())) ownerId = Number(ownerRaw.trim());
    else details.push({ field: 'ownerId', message: 'ownerId must be a positive integer or unassigned' });
  }

  if (details.length > 0) return { success: false, details };
  return {
    success: true,
    data: {
      ...(search?.trim() ? { search: search.trim() } : {}),
      ...(status ? { status } : {}),
      ...(requestedPriority ? { requestedPriority } : {}),
      ...(itPriority ? { itPriority } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(ownerId !== undefined ? { ownerId } : {}),
      sortBy: sortBy as StaffQueueSortField,
      sortOrder: sortOrder as StaffQueueSortOrder,
      page: Number(pageRaw),
      pageSize: Number(pageSizeRaw) as StaffQueuePageSize,
    },
  };
}

export function buildStaffQueueWhere(query: StaffQueueQuery): Prisma.TicketWhereInput {
  return {
    ...(query.status ? { currentStatus: query.status } : {}),
    ...(query.requestedPriority ? { requestedPriority: query.requestedPriority } : {}),
    ...(query.itPriority ? { itPriority: query.itPriority } : {}),
    ...(query.categoryId !== undefined ? { categoryId: query.categoryId } : {}),
    ...(query.ownerId === 'unassigned' ? { ownerId: null } : query.ownerId !== undefined ? { ownerId: query.ownerId } : {}),
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

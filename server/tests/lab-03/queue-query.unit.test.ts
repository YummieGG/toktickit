import { describe, expect, it } from 'vitest';
import { buildStaffQueueOrderBy, buildStaffQueueWhere, parseStaffQueueQuery } from '../../src/lib/staff-queue';

describe('Lab 3-4 staff queue query contract', () => {
  it('defaults to updatedAt descending, page one, and page size ten', () => {
    const parsed = parseStaffQueueQuery({});
    expect(parsed).toEqual({ success: true, data: { sortBy: 'updatedAt', sortOrder: 'desc', page: 1, pageSize: 10 } });
  });

  it('parses all filters and builds a case-insensitive requester-aware predicate', () => {
    const parsed = parseStaffQueueQuery({
      search: 'VPN', status: 'IN_PROGRESS', requestedPriority: 'HIGH', itPriority: 'CRITICAL',
      category: '3', ownerId: 'unassigned', sortBy: 'owner', sortOrder: 'asc', page: '2', pageSize: '20',
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(buildStaffQueueWhere(parsed.data)).toEqual({
      currentStatus: 'IN_PROGRESS',
      requestedPriority: 'HIGH',
      itPriority: 'CRITICAL',
      categoryId: 3,
      ownerId: null,
      OR: [
        { ticketNumber: { contains: 'VPN', mode: 'insensitive' } },
        { summary: { contains: 'VPN', mode: 'insensitive' } },
        { description: { contains: 'VPN', mode: 'insensitive' } },
        { requester: { name: { contains: 'VPN', mode: 'insensitive' } } },
        { requester: { email: { contains: 'VPN', mode: 'insensitive' } } },
      ],
    });
    expect(buildStaffQueueOrderBy(parsed.data)).toEqual([{ owner: { name: 'asc' } }, { id: 'desc' }]);
  });

  it.each([
    ['status=ASSIGNED', { status: 'ASSIGNED' }],
    ['pageSize=15', { pageSize: '15' }],
    ['page=0', { page: '0' }],
    ['ownerId=4.2', { ownerId: '4.2' }],
  ])('rejects invalid %s', (_label, query) => {
    const parsed = parseStaffQueueQuery(query);
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.details.length).toBeGreaterThan(0);
  });

  it('accepts sortBy=status as an alias for currentStatus', () => {
    const parsed = parseStaffQueueQuery({ sortBy: 'status' });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.sortBy).toBe('currentStatus');
  });

  it('accepts sortBy=lastUpdated as an alias for updatedAt', () => {
    const parsed = parseStaffQueueQuery({ sortBy: 'lastUpdated' });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.sortBy).toBe('updatedAt');
  });
});

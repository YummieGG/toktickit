import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/auth';
import type { TicketPriority, TicketStatus, TicketSummary } from '../types/ticket';
import { formatTicketDateTime } from '../utils/date';

type SortField = 'ticketDate' | 'updatedAt' | 'ticketNumber' | 'currentStatus' | 'requestedPriority' | 'itPriority' | 'owner';
type SortOrder = 'asc' | 'desc';
type QueueFilters = {
  search: string;
  status: TicketStatus | '';
  statuses?: string;
  requestedPriority: TicketPriority | '';
  itPriority: TicketPriority | '';
  itPriorities?: string;
  category: string;
  ownerId: string;
  updatedFrom?: string;
  updatedTo?: string;
  resolvedFrom?: string;
  resolvedTo?: string;
};
type Pagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

const STATUSES: TicketStatus[] = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'];
const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const SORT_FIELDS: Array<{ value: SortField; label: string }> = [
  { value: 'ticketDate', label: 'Ticket Date' },
  { value: 'updatedAt', label: 'Last Updated' },
  { value: 'ticketNumber', label: 'Ticket Number' },
  { value: 'currentStatus', label: 'Status' },
  { value: 'requestedPriority', label: 'Requested Priority' },
  { value: 'itPriority', label: 'IT Priority' },
  { value: 'owner', label: 'Owner' },
];

function parseStaffFilters(params: URLSearchParams): QueueFilters {
  return {
    search: params.get('search') ?? '',
    status: (params.get('status') as TicketStatus | null) ?? '',
    statuses: params.get('statuses') ?? '',
    requestedPriority: (params.get('requestedPriority') as TicketPriority | null) ?? '',
    itPriority: (params.get('itPriority') as TicketPriority | null) ?? '',
    itPriorities: params.get('itPriorities') ?? '',
    category: params.get('category') ?? '',
    ownerId: params.get('ownerId') ?? '',
    updatedFrom: params.get('updatedFrom') ?? '',
    updatedTo: params.get('updatedTo') ?? '',
    resolvedFrom: params.get('resolvedFrom') ?? '',
    resolvedTo: params.get('resolvedTo') ?? '',
  };
}

class QueueRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function fetchQueue(url: string, signal: AbortSignal) {
  const response = await fetch(url, { credentials: 'include', signal });
  if (!response.ok) {
    let message = 'Unable to load the staff queue.';
    try {
      const payload = await response.json() as { error?: { message?: string } };
      message = payload.error?.message ?? message;
    } catch { /* Keep the safe fallback. */ }
    throw new QueueRequestError(response.status, message);
  }
  return response.json() as Promise<{ data: TicketSummary[]; pagination: Pagination }>;
}

function displayStatus(status: string): string {
  return status.replaceAll('_', ' ');
}

function QueueCell({ label, children }: { label: string; children: ReactNode }) {
  return <div className="staff-queue-cell"><span className="staff-queue-cell-label">{label}</span><span>{children}</span></div>;
}

export function StaffTicketQueue() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<QueueFilters>(() => parseStaffFilters(searchParams));
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') ?? '');
  const [sortBy, setSortBy] = useState<SortField>(() => (searchParams.get('sortBy') as SortField | null) ?? 'updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => (searchParams.get('sortOrder') as SortOrder | null) ?? 'desc');
  const [page, setPage] = useState(() => {
    const p = parseInt(searchParams.get('page') ?? '1', 10);
    return p > 0 ? p : 1;
  });
  const [pageSize, setPageSize] = useState<5 | 10 | 20>(() => {
    const ps = parseInt(searchParams.get('pageSize') ?? '10', 10);
    return ps === 5 || ps === 10 || ps === 20 ? ps : 10;
  });
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<QueueRequestError | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const nextFilters = parseStaffFilters(searchParams);
    setFilters(nextFilters);
    setSearchInput(nextFilters.search);
    const s = searchParams.get('sortBy') as SortField | null;
    if (s && SORT_FIELDS.some(f => f.value === s)) setSortBy(s);
    const o = searchParams.get('sortOrder') as SortOrder | null;
    if (o === 'asc' || o === 'desc') setSortOrder(o);
    const p = parseInt(searchParams.get('page') ?? '1', 10);
    if (p > 0) setPage(p);
    const ps = parseInt(searchParams.get('pageSize') ?? '10', 10);
    if (ps === 5 || ps === 10 || ps === 20) setPageSize(ps);
  }, [searchParams]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ sortBy, sortOrder, page: String(page), pageSize: String(pageSize) });
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.requestedPriority) params.set('requestedPriority', filters.requestedPriority);
    if (filters.itPriority) params.set('itPriority', filters.itPriority);
    if (filters.category) params.set('category', filters.category);
    if (filters.ownerId) params.set('ownerId', filters.ownerId);
    if (filters.statuses) params.set('statuses', filters.statuses);
    if (filters.itPriorities) params.set('itPriorities', filters.itPriorities);
    if (filters.updatedFrom) params.set('updatedFrom', filters.updatedFrom);
    if (filters.updatedTo) params.set('updatedTo', filters.updatedTo);
    if (filters.resolvedFrom) params.set('resolvedFrom', filters.resolvedFrom);
    if (filters.resolvedTo) params.set('resolvedTo', filters.resolvedTo);
    return params.toString();
  }, [filters, page, pageSize, sortBy, sortOrder]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    void fetchQueue(`/api/staff/tickets?${queryString}`, controller.signal)
      .then(payload => {
        setTickets(payload.data ?? []);
        setPagination(payload.pagination);
      })
      .catch(requestError => {
        if ((requestError as Error).name !== 'AbortError') {
          if (requestError instanceof QueueRequestError && requestError.status === 401) {
            void refresh().finally(() => navigate('/login', {
              replace: true,
              state: { from: '/staff/tickets', notice: 'Your session has expired. Please sign in again.' },
            }));
            return;
          }
          setTickets([]);
          setError(requestError instanceof QueueRequestError ? requestError : new QueueRequestError(0, 'Unable to load the staff queue.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [navigate, queryString, refresh, retry, user]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/categories', { credentials: 'include', signal: controller.signal })
      .then(response => response.ok ? response.json() as Promise<{ data: Array<{ id: number; name: string }> }> : null)
      .then(payload => { if (payload) setCategories(payload.data ?? []); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [retry, user?.id]);

  const updateFilter = <K extends keyof QueueFilters>(key: K, value: QueueFilters[K]) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key === 'status') {
      next.delete('statuses');
    }
    if (key === 'itPriority') {
      next.delete('itPriorities');
    }
    next.set('page', '1');
    setSearchParams(next);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    updateFilter('search', searchInput.trim());
  };

  const changeSort = (field: SortField) => {
    const next = new URLSearchParams(searchParams);
    const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    next.set('sortBy', field);
    next.set('sortOrder', newOrder);
    next.set('page', '1');
    setSearchParams(next);
  };

  const changePage = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(newPage));
    setSearchParams(next);
  };

  const changePageSize = (newPageSize: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('pageSize', String(newPageSize));
    next.set('page', '1');
    setSearchParams(next);
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const clearStatuses = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('statuses');
    next.set('page', '1');
    setSearchParams(next);
  };

  const clearItPriorities = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('itPriorities');
    next.set('page', '1');
    setSearchParams(next);
  };

  const clearUpdatedRange = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('updatedFrom');
    next.delete('updatedTo');
    next.set('page', '1');
    setSearchParams(next);
  };

  const clearResolvedRange = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('resolvedFrom');
    next.delete('resolvedTo');
    next.set('page', '1');
    setSearchParams(next);
  };

  const isForbidden = error?.status === 403;
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <section aria-labelledby="staff-queue-title" className="staff-queue">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-2 mb-4">
        <div>
          <h1 id="staff-queue-title" className="mb-1">Staff Ticket Queue</h1>
          <p className="mb-0" style={{ color: 'var(--text-secondary)' }}>Search, triage, and open support tickets.</p>
        </div>
        <span className="badge rounded-pill align-self-start" style={{ backgroundColor: 'var(--pale-green)', color: 'var(--primary-green)' }}>{user?.role === 'ADMINISTRATOR' ? 'Read-only view' : 'IT Staff'}</span>
      </div>

      <form className="card shadow-sm mb-4" onSubmit={submitSearch} aria-label="Queue filters">
        <div className="card-body p-3 p-md-4">
          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <label className="form-label" htmlFor="staff-queue-search">Search tickets</label>
              <div className="input-group">
                <input id="staff-queue-search" className="form-control" value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Ticket number, summary, requester..." />
                <Button type="submit">Search</Button>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label" htmlFor="staff-status">Status</label>
              <select id="staff-status" className="form-select" value={filters.status} onChange={event => updateFilter('status', event.target.value as TicketStatus | '')}>
                <option value="">All statuses</option>
                {STATUSES.map(status => <option key={status} value={status}>{displayStatus(status)}</option>)}
              </select>
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label" htmlFor="staff-owner">Owner filter</label>
              <input id="staff-owner" className="form-control" list="staff-owner-options" value={filters.ownerId} onChange={event => updateFilter('ownerId', event.target.value)} placeholder="Any, ID, or unassigned" />
              <datalist id="staff-owner-options">
                <option value="unassigned">Unassigned</option>
                <option value="me">Assigned to me</option>
                {user && <option value={String(user.id)}>Assigned to me (ID {user.id})</option>}
              </datalist>
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label" htmlFor="staff-requested-priority">Requested Priority</label>
              <select id="staff-requested-priority" className="form-select" value={filters.requestedPriority} onChange={event => updateFilter('requestedPriority', event.target.value as TicketPriority | '')}>
                <option value="">All requested priorities</option>
                {PRIORITIES.map(priority => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label" htmlFor="staff-it-priority">IT Priority</label>
              <select id="staff-it-priority" className="form-select" value={filters.itPriority} onChange={event => updateFilter('itPriority', event.target.value as TicketPriority | '')}>
                <option value="">All IT priorities</option>
                {PRIORITIES.map(priority => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label" htmlFor="staff-category">Category</label>
              <select id="staff-category" className="form-select" value={filters.category} onChange={event => updateFilter('category', event.target.value)}>
                <option value="">All categories</option>
                {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label" htmlFor="staff-sort">Sort by</label>
              <select id="staff-sort" className="form-select" value={sortBy} onChange={event => { setSortBy(event.target.value as SortField); setPage(1); }}>
                {SORT_FIELDS.map(field => <option key={field.value} value={field.value}>{field.label}</option>)}
              </select>
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label" htmlFor="staff-sort-order">Direction</label>
              <select id="staff-sort-order" className="form-select" value={sortOrder} onChange={event => { setSortOrder(event.target.value as SortOrder); setPage(1); }}>
                <option value="desc">Newest first</option><option value="asc">Oldest first</option>
              </select>
            </div>
          </div>

          {(filters.statuses || filters.itPriorities || filters.updatedFrom || filters.resolvedFrom) && (
            <div className="d-flex flex-wrap gap-2 align-items-center mt-3 pt-3 border-top" aria-label="Active drill-down filters">
              <span className="small text-muted fw-bold">Active Drill-down Filters:</span>
              {filters.statuses && (
                <span className="badge rounded-pill bg-light text-dark border p-2 d-inline-flex align-items-center gap-1">
                  <span>Statuses: {filters.statuses}</span>
                  <button
                    type="button"
                    className="btn-close btn-close-sm"
                    aria-label="Clear statuses filter"
                    onClick={clearStatuses}
                    style={{ fontSize: '0.65rem' }}
                  />
                </span>
              )}
              {filters.itPriorities && (
                <span className="badge rounded-pill bg-light text-dark border p-2 d-inline-flex align-items-center gap-1">
                  <span>IT Priorities: {filters.itPriorities}</span>
                  <button
                    type="button"
                    className="btn-close btn-close-sm"
                    aria-label="Clear IT priorities filter"
                    onClick={clearItPriorities}
                    style={{ fontSize: '0.65rem' }}
                  />
                </span>
              )}
              {filters.updatedFrom && (
                <span className="badge rounded-pill bg-light text-dark border p-2 d-inline-flex align-items-center gap-1">
                  <span>Updated: {filters.updatedFrom.split('T')[0]} to {filters.updatedTo ? filters.updatedTo.split('T')[0] : 'now'}</span>
                  <button
                    type="button"
                    className="btn-close btn-close-sm"
                    aria-label="Clear updated date filter"
                    onClick={clearUpdatedRange}
                    style={{ fontSize: '0.65rem' }}
                  />
                </span>
              )}
              {filters.resolvedFrom && (
                <span className="badge rounded-pill bg-light text-dark border p-2 d-inline-flex align-items-center gap-1">
                  <span>Resolved: {filters.resolvedFrom.split('T')[0]} to {filters.resolvedTo ? filters.resolvedTo.split('T')[0] : 'now'}</span>
                  <button
                    type="button"
                    className="btn-close btn-close-sm"
                    aria-label="Clear resolved date filter"
                    onClick={clearResolvedRange}
                    style={{ fontSize: '0.65rem' }}
                  />
                </span>
              )}
            </div>
          )}

          <div className="d-flex flex-column flex-sm-row gap-2 mt-3">
            <Button type="button" variant="secondary" onClick={clearFilters} disabled={!hasFilters && !searchInput}>Clear filters</Button>
            <span className="small align-self-center" style={{ color: 'var(--text-secondary)' }}>Search includes ticket number, text, and requester name/email.</span>
          </div>
        </div>
      </form>

      {isLoading && <div className="card shadow-sm p-5 text-center" role="status" aria-live="polite"><div className="spinner-border mx-auto mb-3" /><p className="mb-0">Loading staff queue...</p></div>}
      {!isLoading && error && (
        <Alert variant={isForbidden ? 'warning' : 'danger'} className="text-center p-4">
          <h2 className="h3">{isForbidden ? 'Access Denied' : 'Unable to Load Staff Queue'}</h2>
          <p>{error.message}</p>
          {!isForbidden && <Button type="button" onClick={() => setRetry(value => value + 1)}>Retry</Button>}
        </Alert>
      )}
      {!isLoading && !error && tickets.length === 0 && (
        <div className="card shadow-sm p-5 text-center" role="status">
          <h2 className="h3">{hasFilters ? 'No tickets match' : 'No tickets in the queue'}</h2>
          <p className="mb-3" style={{ color: 'var(--text-secondary)' }}>{hasFilters ? 'Try changing your search or filters.' : 'There are no tickets to triage yet.'}</p>
          {hasFilters && <Button type="button" variant="secondary" onClick={clearFilters}>Clear filters</Button>}
        </div>
      )}
      {!isLoading && !error && tickets.length > 0 && (
        <>
          <div className="staff-queue-table-wrap card shadow-sm" role="region" aria-label="Ticket queue results">
            <table className="table align-middle mb-0 staff-queue-table">
              <thead><tr>
                {[
                  ['ticketNumber', 'Ticket Number'], ['ticketDate', 'Ticket Date'], ['summary', 'Summary'], ['category', 'Category'],
                  ['requestedPriority', 'Requested Priority'], ['itPriority', 'IT Priority'], ['currentStatus', 'Status'], ['owner', 'Owner'], ['requester', 'Requester'], ['updatedAt', 'Last Updated'], ['resolution', 'Resolution Indication'],
                ].map(([field, label]) => <th key={field} scope="col">{SORT_FIELDS.some(item => item.value === field) ? <button type="button" className="staff-sort-button" onClick={() => changeSort(field as SortField)}>{label} {sortBy === field ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</button> : label}</th>)}
                <th scope="col"><span className="visually-hidden">Open</span></th>
              </tr></thead>
              <tbody>{tickets.map(ticket => <tr key={ticket.id}>
                <td><Link to={`/staff/tickets/${ticket.id}`} className="fw-semibold">{ticket.ticketNumber}</Link></td>
                <td>{formatTicketDateTime(ticket.ticketDate)}</td><td>{ticket.summary}</td><td>{ticket.category.name}</td>
                <td><Badge type="priority" value={ticket.requestedPriority} /></td><td><Badge type="priority" value={ticket.itPriority} /></td><td><Badge type="status" value={ticket.currentStatus} /></td>
                <td>{ticket.owner?.name ?? 'Unassigned'}</td><td>{ticket.requester.name}<br /><span className="small text-muted">{ticket.requester.email}</span></td><td>{formatTicketDateTime(ticket.updatedAt)}</td><td>{ticket.problemAppearsResolvedAt ? formatTicketDateTime(ticket.problemAppearsResolvedAt) : 'Not indicated'}</td>
                <td><Link className="btn btn-sm btn-zen-secondary text-nowrap" to={`/staff/tickets/${ticket.id}`}>Open</Link></td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="staff-queue-cards d-grid gap-3">{tickets.map(ticket => <article className="card shadow-sm p-3" key={ticket.id}>
            <div className="staff-queue-card-header d-flex justify-content-between gap-2"><Link className="fw-bold" to={`/staff/tickets/${ticket.id}`}>{ticket.ticketNumber}</Link><Badge type="status" value={ticket.currentStatus} /></div>
            <h2 className="h5 mt-2 mb-3">{ticket.summary}</h2>
            <div className="staff-queue-card-grid"><QueueCell label="Ticket Date">{formatTicketDateTime(ticket.ticketDate)}</QueueCell><QueueCell label="Category">{ticket.category.name}</QueueCell><QueueCell label="Requested Priority"><Badge type="priority" value={ticket.requestedPriority} /></QueueCell><QueueCell label="IT Priority"><Badge type="priority" value={ticket.itPriority} /></QueueCell><QueueCell label="Owner">{ticket.owner?.name ?? 'Unassigned'}</QueueCell><QueueCell label="Requester">{ticket.requester.name} ({ticket.requester.email})</QueueCell><QueueCell label="Last Updated">{formatTicketDateTime(ticket.updatedAt)}</QueueCell><QueueCell label="Resolution Indication">{ticket.problemAppearsResolvedAt ? formatTicketDateTime(ticket.problemAppearsResolvedAt) : 'Not indicated'}</QueueCell></div>
            <Link className="btn btn-zen-secondary mt-3 w-100" to={`/staff/tickets/${ticket.id}`}>Open ticket detail</Link>
          </article>)}</div>
          <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mt-3" aria-label="Queue pagination">
            <span className="small" style={{ color: 'var(--text-secondary)' }}>Page {pagination.page} of {pagination.totalPages} · {pagination.totalItems} ticket{pagination.totalItems === 1 ? '' : 's'}</span>
            <div className="d-flex gap-2"><label className="visually-hidden" htmlFor="staff-page-size">Page size</label><select id="staff-page-size" className="form-select form-select-sm" value={pageSize} onChange={event => changePageSize(Number(event.target.value) as 5 | 10 | 20)}><option value="5">5 / page</option><option value="10">10 / page</option><option value="20">20 / page</option></select><Button type="button" variant="secondary" disabled={!pagination.hasPreviousPage} onClick={() => changePage(Math.max(1, page - 1))}>Previous</Button><Button type="button" variant="secondary" disabled={!pagination.hasNextPage} onClick={() => changePage(page + 1)}>Next</Button></div>
          </div>
        </>
      )}
    </section>
  );
}

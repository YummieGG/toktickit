import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/auth';
import type { TicketPriority, TicketStatus } from '../types/ticket';
import { formatTicketDateTime } from '../utils/date';

type SortField = 'ticketDate' | 'ticketNumber' | 'summary' | 'requestedPriority' | 'currentStatus' | 'updatedAt' | 'resolvedAt';
type SortOrder = 'asc' | 'desc';

interface Category {
  id: number;
  name: string;
}

interface TicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  requestedPriority: TicketPriority;
  currentStatus: TicketStatus;
  ticketDate: string;
  category: Category;
  updatedAt: string;
  resolvedAt?: string | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

const DEFAULT_PAGINATION: Pagination = {
  page: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 0,
};

const SORT_LABELS: Record<SortField, string> = {
  ticketDate: 'Date Created',
  ticketNumber: 'Ticket Number',
  summary: 'Summary',
  requestedPriority: 'Requested Priority',
  currentStatus: 'Status',
  updatedAt: 'Last Updated',
  resolvedAt: 'Date Resolved',
};

interface TicketFilterState {
  search: string;
  category: string;
  status: TicketStatus | '';
  statuses?: string;
  priority: TicketPriority | '';
  sortBy: SortField;
  sortOrder: SortOrder;
  page: number;
  pageSize: number;
  updatedFrom?: string;
  updatedTo?: string;
  resolvedFrom?: string;
  resolvedTo?: string;
}


function parseFiltersFromSearchParams(searchParams: URLSearchParams): TicketFilterState {
  return {
    search: searchParams.get('search') ?? '',
    category: searchParams.get('category') ?? '',
    status: (searchParams.get('status') as TicketStatus | null) ?? '',
    statuses: searchParams.get('statuses') ?? '',
    priority: (searchParams.get('priority') as TicketPriority | null) ?? '',
    sortBy: (searchParams.get('sortBy') as SortField | null) ?? 'ticketDate',
    sortOrder: (searchParams.get('sortOrder') as SortOrder | null) ?? 'desc',
    page: parseInt(searchParams.get('page') ?? '1', 10) || 1,
    pageSize: parseInt(searchParams.get('pageSize') ?? '10', 10) || 10,
    updatedFrom: searchParams.get('updatedFrom') ?? '',
    updatedTo: searchParams.get('updatedTo') ?? '',
    resolvedFrom: searchParams.get('resolvedFrom') ?? '',
    resolvedTo: searchParams.get('resolvedTo') ?? '',
  };
}

interface ColumnConfig {
  key: string;
  label: string;
  sortField?: SortField;
}

const TABLE_COLUMNS: ColumnConfig[] = [
  { key: 'ticketNumber', label: 'Ticket Number', sortField: 'ticketNumber' },
  { key: 'summary', label: 'Summary', sortField: 'summary' },
  { key: 'category', label: 'Category' },
  { key: 'requestedPriority', label: 'Requested Priority', sortField: 'requestedPriority' },
  { key: 'currentStatus', label: 'Status', sortField: 'currentStatus' },
  { key: 'ticketDate', label: 'Date Created', sortField: 'ticketDate' },
];

type PaginationItem = number | 'start-ellipsis' | 'end-ellipsis';

function getPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'end-ellipsis', totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, 'start-ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, 'start-ellipsis', currentPage - 1, currentPage, currentPage + 1, 'end-ellipsis', totalPages];
}

async function fetchJson<T>(url: string, signal: AbortSignal, fallbackMessage: string): Promise<T> {
  const response = await fetch(url, { signal, credentials: 'include' });
  if (!response.ok) throw new Error(fallbackMessage);
  return response.json();
}

export function MyTickets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [filters, setFilters] = useState<TicketFilterState>(() => parseFiltersFromSearchParams(searchParams));
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') ?? '');
  const [isLoading, setIsLoading] = useState(true);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [loadedUserId, setLoadedUserId] = useState<number | null>(null);

  useEffect(() => {
    const next = parseFiltersFromSearchParams(searchParams);
    setFilters(next);
    setSearchInput(next.search);
  }, [searchParams]);

  const hasCommittedCriteria = Boolean(
    filters.search ||
    filters.category ||
    filters.status ||
    filters.statuses ||
    filters.priority ||
    filters.updatedFrom ||
    filters.resolvedFrom
  );
  const hasActiveFilterOrDraft = Boolean(
    hasCommittedCriteria || searchInput.trim()
  );
  const isCurrentUserData = loadedUserId === user?.id;

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      page: String(filters.page),
      pageSize: String(filters.pageSize),
    });
    if (filters.search) params.set('search', filters.search);
    if (filters.category) params.set('category', filters.category);
    if (filters.status) params.set('status', filters.status);
    if (filters.statuses) params.set('statuses', filters.statuses);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.updatedFrom) params.set('updatedFrom', filters.updatedFrom);
    if (filters.updatedTo) params.set('updatedTo', filters.updatedTo);
    if (filters.resolvedFrom) params.set('resolvedFrom', filters.resolvedFrom);
    if (filters.resolvedTo) params.set('resolvedTo', filters.resolvedTo);
    return params.toString();
  }, [filters]);

  useEffect(() => {
    if (!user || !queryString) return;

    const controller = new AbortController();
    const requestUserId = user.id;
    const loadTickets = async () => {
      setIsLoading(true);
      setTicketError(null);
      setLoadedUserId(null);
      try {
        const payload = await fetchJson<{ data: TicketListItem[]; pagination: Pagination }>(
          `/api/tickets?${queryString}`,
          controller.signal,
          'Unable to load tickets'
        );
        const nextPagination = payload.pagination ?? DEFAULT_PAGINATION;
        if (nextPagination.totalPages > 0 && nextPagination.page > nextPagination.totalPages) {
          setFilters(prev => ({ ...prev, page: nextPagination.totalPages }));
          return;
        }
        setTickets(payload.data ?? []);
        setPagination(nextPagination);
        setLoadedUserId(requestUserId);
      } catch (requestError) {
        if ((requestError as Error).name !== 'AbortError') {
          setTickets([]);
          setTicketError((requestError as Error).message || 'Unable to load tickets');
          setLoadedUserId(requestUserId);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadTickets();
    return () => controller.abort();
  }, [queryString, retryTrigger, user]);

  useEffect(() => {
    const controller = new AbortController();
    const loadCategories = async () => {
      setIsCategoriesLoading(true);
      setCategoryError(null);
      try {
        const payload = await fetchJson<{ data: Category[] }>(
          '/api/categories',
          controller.signal,
          'Unable to load categories'
        );
        setCategories(payload.data ?? []);
      } catch (requestError) {
        if ((requestError as Error).name !== 'AbortError') {
          setCategoryError((requestError as Error).message || 'Unable to load categories');
        }
      } finally {
        if (!controller.signal.aborted) setIsCategoriesLoading(false);
      }
    };
    void loadCategories();
    return () => controller.abort();
  }, [retryTrigger, user?.id]);

  const updateFilter = (updates: Partial<TicketFilterState>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined && val !== '') {
        next.set(key, String(val));
      } else {
        next.delete(key);
      }
    }
    if ('status' in updates && updates.status) {
      next.delete('statuses');
    }
    next.set('page', '1');
    setSearchParams(next);
  };

  const clearFilters = () => {
    setSearchInput('');
    const next = new URLSearchParams();
    if (filters.pageSize) {
      next.set('pageSize', String(filters.pageSize));
    }
    setSearchParams(next);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    updateFilter({ search: searchInput.trim() });
  };

  const changeSort = (field: SortField) => {
    const next = new URLSearchParams(searchParams);
    const newOrder = filters.sortBy === field && filters.sortOrder === 'asc' ? 'desc' : 'asc';
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

  const clearStatuses = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('statuses');
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

  const openTicket = (ticketId: number) => navigate(`/tickets/${ticketId}`);

  const startItem = pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);
  const paginationItems = getPaginationItems(pagination.page, pagination.totalPages);

  return (
    <section className="my-tickets mt-4" aria-labelledby="my-tickets-title">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <h1 id="my-tickets-title" className="h2 mb-1" style={{ color: 'var(--text-primary)' }}>My Tickets</h1>
          <p className="mb-0" style={{ color: 'var(--text-secondary)' }}>
            Support requests submitted by {user?.name}
          </p>
        </div>
        <Link className="btn btn-zen-primary text-white align-self-stretch align-self-md-auto text-center" style={{ minHeight: 44 }} to="/tickets/new">
          Create Ticket
        </Link>
      </div>

      <div className="card shadow-sm mb-4" style={{ borderColor: 'var(--surface-border)' }}>
        <div className="card-body p-3 p-md-4">
          <form onSubmit={submitSearch} className="row g-3" role="search">
            <div className="col-12 col-lg-6">
              <label className="form-label" htmlFor="ticket-search">Search</label>
              <div className="input-group">
                <span className="input-group-text" aria-hidden="true">🔍</span>
                <input
                  id="ticket-search"
                  className="form-control"
                  placeholder="Search by ticket #, summary, or description..."
                  value={searchInput}
                  onChange={event => setSearchInput(event.target.value)}
                  disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading}>Search</Button>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-lg-2">
              <label className="form-label" htmlFor="category-filter">Category</label>
              <select
                id="category-filter"
                className="form-select"
                value={filters.category}
                onChange={event => updateFilter({ category: event.target.value })}
                disabled={isLoading || isCategoriesLoading}
              >
                <option value="">All Categories</option>
                {categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div className="col-6 col-sm-3 col-lg-2">
              <label className="form-label" htmlFor="status-filter">Status</label>
              <select
                id="status-filter"
                className="form-select"
                value={filters.status}
                onChange={event => updateFilter({ status: event.target.value as TicketStatus | '' })}
                disabled={isLoading}
              >
                <option value="">All Statuses</option>
                <option value="NEW">NEW</option>
              </select>
            </div>
            <div className="col-6 col-sm-3 col-lg-2">
              <label className="form-label" htmlFor="priority-filter">Priority</label>
              <select
                id="priority-filter"
                className="form-select"
                value={filters.priority}
                onChange={event => updateFilter({ priority: event.target.value as TicketPriority | '' })}
                disabled={isLoading}
              >
                <option value="">All Priorities</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
          </form>

          {(filters.statuses || filters.updatedFrom || filters.resolvedFrom) && (
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

          {hasActiveFilterOrDraft && (
            <Button variant="tertiary" type="button" className="mt-3" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {isCurrentUserData && ticketError && (
        <Alert variant="danger" className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
          <span>{ticketError}</span>
          <Button variant="secondary" type="button" onClick={() => setRetryTrigger(value => value + 1)}>Retry</Button>
        </Alert>
      )}

      {isCurrentUserData && categoryError && !ticketError && (
        <Alert variant="warning" className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
          <span>Failed to load categories. Category filter may be unavailable.</span>
          <Button variant="secondary" type="button" onClick={() => setRetryTrigger(value => value + 1)}>Retry</Button>
        </Alert>
      )}

      {(!isCurrentUserData || isLoading) && !ticketError && (
        <div className="card shadow-sm text-center p-5" aria-live="polite">
          <div className="spinner-border mx-auto mb-3" role="status" style={{ color: 'var(--primary-green)' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mb-0">Loading...</p>
        </div>
      )}

      {isCurrentUserData && !isLoading && !ticketError && pagination.totalItems === 0 && !hasCommittedCriteria && (
        <div className="card shadow-sm text-center p-4 p-md-5">
          <div className="empty-state-icon mb-3" aria-hidden="true">📋</div>
          <h2>No Tickets Submitted Yet</h2>
          <p style={{ color: 'var(--text-secondary)' }}>You have not created any IT support requests under this account.</p>
          <Link className="btn btn-zen-primary text-white align-self-center px-4 w-100 w-md-auto" style={{ minHeight: 44 }} to="/tickets/new">Create Ticket</Link>
        </div>
      )}

      {isCurrentUserData && !isLoading && !ticketError && pagination.totalItems === 0 && hasCommittedCriteria && (
        <div className="card shadow-sm text-center p-4 p-md-5">
          <div className="empty-state-icon mb-3" aria-hidden="true">🔍</div>
          <h2>No Matching Tickets Found</h2>
          <p style={{ color: 'var(--text-secondary)' }}>We couldn't find any tickets matching your search criteria.</p>
          <Button variant="secondary" type="button" className="align-self-center w-100 w-md-auto" onClick={clearFilters}>Clear All Filters</Button>
        </div>
      )}

      {isCurrentUserData && !isLoading && !ticketError && pagination.totalItems > 0 && (
        <>
          <div className="d-none d-md-block card shadow-sm overflow-hidden" style={{ borderColor: 'var(--surface-border)' }}>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 d-none d-md-table">
                <thead>
                  <tr>
                    {TABLE_COLUMNS.map(col => (
                      <th key={col.key} scope="col">
                        {col.sortField ? (
                          <button
                            className="ticket-sort"
                            type="button"
                            onClick={() => changeSort(col.sortField!)}
                          >
                            {col.label} {filters.sortBy === col.sortField ? (filters.sortOrder === 'asc' ? '↑' : '↓') : ''}
                          </button>
                        ) : (
                          col.label
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(ticket => (
                    <tr key={ticket.id} className="ticket-row" onClick={() => openTicket(ticket.id)}>
                      <td><Link className="ticket-number-link" to={`/tickets/${ticket.id}`} onClick={event => event.stopPropagation()}>{ticket.ticketNumber}</Link></td>
                      <td className="ticket-summary" title={ticket.summary}>{ticket.summary}</td>
                      <td>{ticket.category.name}</td>
                      <td><Badge type="priority" value={ticket.requestedPriority} /></td>
                      <td><Badge type="status" value={ticket.currentStatus} /></td>
                      <td className="text-nowrap">{formatTicketDateTime(ticket.ticketDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="d-block d-md-none d-grid gap-3">
            <div className="row g-2">
              <div className="col-8">
                <label className="form-label" htmlFor="mobile-sort">Sort by</label>
                <select
                  id="mobile-sort"
                  className="form-select"
                  value={filters.sortBy}
                  onChange={event => setFilters(prev => ({ ...prev, sortBy: event.target.value as SortField, page: 1 }))}
                >
                  {Object.entries(SORT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="col-4">
                <label className="form-label" htmlFor="mobile-sort-order">Order</label>
                <select
                  id="mobile-sort-order"
                  className="form-select"
                  value={filters.sortOrder}
                  onChange={event => setFilters(prev => ({ ...prev, sortOrder: event.target.value as SortOrder, page: 1 }))}
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
            {tickets.map(ticket => (
              <Link key={ticket.id} className="ticket-card card text-decoration-none" to={`/tickets/${ticket.id}`}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
                    <span className="ticket-number-link">{ticket.ticketNumber}</span>
                    <Badge type="status" value={ticket.currentStatus} />
                  </div>
                  <div className="fw-bold mb-3" style={{ color: 'var(--text-primary)' }}>{ticket.summary}</div>
                  <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                    <span style={{ color: 'var(--text-secondary)' }}>{ticket.category.name}</span>
                    <Badge type="priority" value={ticket.requestedPriority} />
                  </div>
                  <div className="small" style={{ color: 'var(--text-secondary)' }}>{formatTicketDateTime(ticket.ticketDate)}</div>
                </div>
              </Link>
            ))}
          </div>

          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mt-4">
            <div aria-live="polite">Showing {startItem}-{endItem} of {pagination.totalItems} tickets</div>
            <div className="d-flex flex-column flex-sm-row align-items-sm-center gap-3">
              <label className="d-flex align-items-center gap-2 text-nowrap" htmlFor="page-size">
                Per page
                <select
                  id="page-size"
                  className="form-select"
                  value={filters.pageSize}
                  onChange={event => changePageSize(Number(event.target.value))}
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                </select>
              </label>
              <nav aria-label="Ticket pages">
                <ul className="pagination mb-0 flex-wrap">
                  <li className={`page-item ${filters.page <= 1 ? 'disabled' : ''}`}>
                    <button className="page-link" type="button" disabled={filters.page <= 1} onClick={() => changePage(Math.max(1, filters.page - 1))}>
                      Previous
                    </button>
                  </li>
                  {paginationItems.map(item => typeof item === 'number' ? (
                    <li key={item} className={`page-item ${item === pagination.page ? 'active' : ''}`}>
                      <button className="page-link" type="button" aria-current={item === pagination.page ? 'page' : undefined} onClick={() => changePage(item)}>
                        {item}
                      </button>
                    </li>
                  ) : (
                    <li key={item} className="page-item disabled" aria-hidden="true">
                      <span className="page-link">…</span>
                    </li>
                  ))}
                  <li className={`page-item ${filters.page >= pagination.totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" type="button" disabled={filters.page >= pagination.totalPages} onClick={() => changePage(filters.page + 1)}>
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

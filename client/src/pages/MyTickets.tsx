import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useRequester } from '../contexts/RequesterContext';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type TicketStatus = 'NEW';
type SortField = 'ticketDate' | 'ticketNumber' | 'summary' | 'requestedPriority' | 'currentStatus';
type SortOrder = 'asc' | 'desc';

interface Category {
  id: number;
  name: string;
}

interface TicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  requestedPriority: Priority;
  currentStatus: TicketStatus;
  ticketDate: string;
  category: Category;
  updatedAt: string;
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
};

function formatTicketDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 16).replace('T', ' ');
}

interface TicketFilterState {
  search: string;
  category: string;
  status: TicketStatus | '';
  priority: Priority | '';
  sortBy: SortField;
  sortOrder: SortOrder;
  page: number;
  pageSize: number;
}

const DEFAULT_FILTERS: TicketFilterState = {
  search: '',
  category: '',
  status: '',
  priority: '',
  sortBy: 'ticketDate',
  sortOrder: 'desc',
  page: 1,
  pageSize: 10,
};

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

async function fetchJson<T>(url: string, signal: AbortSignal, fallbackMessage: string): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(fallbackMessage);
  return response.json();
}

export function MyTickets() {
  const { requester } = useRequester();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [filters, setFilters] = useState<TicketFilterState>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [previousRequesterId, setPreviousRequesterId] = useState(requester?.id);
  const [isLoading, setIsLoading] = useState(true);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [loadedRequesterId, setLoadedRequesterId] = useState<string | null>(null);

  // Synchronously reset filters and tickets on requester change to prevent stale queries
  if (requester && requester.id !== previousRequesterId) {
    setPreviousRequesterId(requester.id);
    setFilters(DEFAULT_FILTERS);
    setSearchInput('');
    setTickets([]);
    setLoadedRequesterId(null);
  }

  const hasCommittedCriteria = Boolean(
    filters.search ||
    filters.category ||
    filters.status ||
    filters.priority
  );
  const hasActiveFilterOrDraft = Boolean(
    hasCommittedCriteria || searchInput.trim()
  );
  const isCurrentRequesterData = loadedRequesterId === String(requester?.id ?? '');

  const queryString = useMemo(() => {
    if (!requester) return '';
    const params = new URLSearchParams({
      requesterId: String(requester.id),
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      page: String(filters.page),
      pageSize: String(filters.pageSize),
    });
    if (filters.search) params.set('search', filters.search);
    if (filters.category) params.set('category', filters.category);
    if (filters.status) params.set('status', filters.status);
    if (filters.priority) params.set('priority', filters.priority);
    return params.toString();
  }, [requester, filters]);

  useEffect(() => {
    if (!requester) {
      navigate('/');
      return;
    }
  }, [requester, navigate]);

  useEffect(() => {
    if (!requester || !queryString) return;

    const controller = new AbortController();
    const requestRequesterId = String(requester.id);
    const loadTickets = async () => {
      setIsLoading(true);
      setTicketError(null);
      setLoadedRequesterId(null);
      try {
        const payload = await fetchJson<{ data: TicketListItem[]; pagination: Pagination }>(
          `/api/tickets?${queryString}`,
          controller.signal,
          'Unable to load tickets'
        );
        setTickets(payload.data ?? []);
        setPagination(payload.pagination ?? DEFAULT_PAGINATION);
        setLoadedRequesterId(requestRequesterId);
      } catch (requestError) {
        if ((requestError as Error).name !== 'AbortError') {
          setTickets([]);
          setTicketError((requestError as Error).message || 'Unable to load tickets');
          setLoadedRequesterId(requestRequesterId);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadTickets();
    return () => controller.abort();
  }, [requester, queryString, retryTrigger]);

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
  }, [requester?.id, retryTrigger]);

  const clearFilters = () => {
    setSearchInput('');
    setFilters(DEFAULT_FILTERS);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setFilters(prev => ({ ...prev, search: searchInput.trim(), page: 1 }));
  };

  const changeSort = (field: SortField) => {
    setFilters(prev => ({
      ...prev,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      sortBy: field,
      page: 1,
    }));
  };

  const openTicket = (ticketId: number) => navigate(`/tickets/${ticketId}`);

  const startItem = pagination.totalItems === 0 ? 0 : (filters.page - 1) * filters.pageSize + 1;
  const endItem = Math.min(filters.page * filters.pageSize, pagination.totalItems);
  const pageNumbers = Array.from({ length: pagination.totalPages }, (_, index) => index + 1);

  return (
    <section className="my-tickets mt-4" aria-labelledby="my-tickets-title">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <h1 id="my-tickets-title" className="h2 mb-1" style={{ color: 'var(--text-primary)' }}>My Tickets</h1>
          <p className="mb-0" style={{ color: 'var(--text-secondary)' }}>
            Support requests submitted by {requester?.name}
          </p>
        </div>
        <Link className="btn btn-zen-primary text-white align-self-stretch align-self-md-auto text-center" style={{ minHeight: 44 }} to="/tickets/create">
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
                onChange={event => setFilters(prev => ({ ...prev, category: event.target.value, page: 1 }))}
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
                onChange={event => setFilters(prev => ({ ...prev, status: event.target.value as TicketStatus | '', page: 1 }))}
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
                onChange={event => setFilters(prev => ({ ...prev, priority: event.target.value as Priority | '', page: 1 }))}
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

          {hasActiveFilterOrDraft && (
            <Button variant="tertiary" type="button" className="mt-3" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {isCurrentRequesterData && ticketError && (
        <Alert variant="danger" className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
          <span>{ticketError}</span>
          <Button variant="secondary" type="button" onClick={() => setRetryTrigger(value => value + 1)}>Retry</Button>
        </Alert>
      )}

      {isCurrentRequesterData && categoryError && !ticketError && (
        <Alert variant="warning" className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
          <span>Failed to load categories. Category filter may be unavailable.</span>
          <Button variant="secondary" type="button" onClick={() => setRetryTrigger(value => value + 1)}>Retry</Button>
        </Alert>
      )}

      {(!isCurrentRequesterData || isLoading) && !ticketError && (
        <div className="card shadow-sm text-center p-5" aria-live="polite">
          <div className="spinner-border mx-auto mb-3" role="status" style={{ color: 'var(--primary-green)' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mb-0">Loading...</p>
        </div>
      )}

      {isCurrentRequesterData && !isLoading && !ticketError && pagination.totalItems === 0 && !hasCommittedCriteria && (
        <div className="card shadow-sm text-center p-4 p-md-5">
          <div className="empty-state-icon mb-3" aria-hidden="true">📋</div>
          <h2>No Tickets Submitted Yet</h2>
          <p style={{ color: 'var(--text-secondary)' }}>You have not created any IT support requests under this account.</p>
          <Link className="btn btn-zen-primary text-white align-self-center px-4 w-100 w-md-auto" style={{ minHeight: 44 }} to="/tickets/create">Create Ticket</Link>
        </div>
      )}

      {isCurrentRequesterData && !isLoading && !ticketError && pagination.totalItems === 0 && hasCommittedCriteria && (
        <div className="card shadow-sm text-center p-4 p-md-5">
          <div className="empty-state-icon mb-3" aria-hidden="true">🔍</div>
          <h2>No Matching Tickets Found</h2>
          <p style={{ color: 'var(--text-secondary)' }}>We couldn't find any tickets matching your search criteria.</p>
          <Button variant="secondary" type="button" className="align-self-center w-100 w-md-auto" onClick={clearFilters}>Clear All Filters</Button>
        </div>
      )}

      {isCurrentRequesterData && !isLoading && !ticketError && pagination.totalItems > 0 && (
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
                      <td className="text-nowrap">{formatTicketDate(ticket.ticketDate)}</td>
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
                  <div className="small" style={{ color: 'var(--text-secondary)' }}>{formatTicketDate(ticket.ticketDate)}</div>
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
                  onChange={event => setFilters(prev => ({ ...prev, pageSize: Number(event.target.value), page: 1 }))}
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                </select>
              </label>
              <nav aria-label="Ticket pages">
                <ul className="pagination mb-0 flex-wrap">
                  <li className={`page-item ${filters.page <= 1 ? 'disabled' : ''}`}>
                    <button className="page-link" type="button" disabled={filters.page <= 1} onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}>
                      Previous
                    </button>
                  </li>
                  {pageNumbers.map(pageNumber => (
                    <li key={pageNumber} className={`page-item ${pageNumber === filters.page ? 'active' : ''}`}>
                      <button className="page-link" type="button" aria-current={pageNumber === filters.page ? 'page' : undefined} onClick={() => setFilters(prev => ({ ...prev, page: pageNumber }))}>
                        {pageNumber}
                      </button>
                    </li>
                  ))}
                  <li className={`page-item ${filters.page >= pagination.totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" type="button" disabled={filters.page >= pagination.totalPages} onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}>
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

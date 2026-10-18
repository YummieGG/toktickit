import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import type { ActionStatus } from '../types/action';
import type { StaffActionListResponse, StaffActionRow } from '../types/dashboard';
import { formatTicketDateTime } from '../utils/date';

const ALL_ACTION_STATUSES: ActionStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export const StaffActionsTaken: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL params
  const statusesParam = searchParams.get('statuses') ?? 'PENDING,IN_PROGRESS';
  const pageParam = Number(searchParams.get('page') ?? '1');
  const pageSizeParam = Number(searchParams.get('pageSize') ?? '10');

  const [actions, setActions] = useState<StaffActionRow[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedStatuses = useMemo(() => {
    if (!statusesParam) return [];
    return statusesParam.split(',').filter((s) => ALL_ACTION_STATUSES.includes(s as ActionStatus)) as ActionStatus[];
  }, [statusesParam]);

  const loadActions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('assignee', 'me');
      if (statusesParam) params.set('statuses', statusesParam);
      params.set('page', String(pageParam > 0 ? pageParam : 1));
      params.set('pageSize', String([5, 10, 20].includes(pageSizeParam) ? pageSizeParam : 10));

      const response = await fetch(`/api/staff/actions-taken?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        let msg = 'Failed to load assigned actions.';
        try {
          const errData = (await response.json()) as { error?: { message?: string } };
          if (errData.error?.message) msg = errData.error.message;
        } catch {
          // Keep safe fallback
        }
        throw new Error(msg);
      }

      const json = (await response.json()) as StaffActionListResponse;
      setActions(json.data);
      setPagination(json.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assigned actions.');
    } finally {
      setIsLoading(false);
    }
  }, [pageParam, pageSizeParam, statusesParam]);

  useEffect(() => {
    void loadActions();
  }, [loadActions]);

  const handleStatusToggle = (status: ActionStatus) => {
    let next: ActionStatus[];
    if (selectedStatuses.includes(status)) {
      next = selectedStatuses.filter((s) => s !== status);
    } else {
      next = [...selectedStatuses, status];
    }
    const params = new URLSearchParams(searchParams);
    params.set('assignee', 'me');
    if (next.length > 0) {
      params.set('statuses', next.join(','));
    } else {
      params.delete('statuses');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleResetFilters = () => {
    const params = new URLSearchParams();
    params.set('assignee', 'me');
    params.set('statuses', 'PENDING,IN_PROGRESS');
    params.set('page', '1');
    params.set('pageSize', '10');
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('pageSize', String(newPageSize));
    params.set('page', '1');
    setSearchParams(params);
  };

  return (
    <div className="container py-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 border-bottom pb-3">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: '#006B3C' }}>
            My Actions Taken
          </h1>
          <p className="text-muted small mb-0">
            Dedicated drill-down of IT actions assigned to your account.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => void loadActions()}
            isLoading={isLoading}
            className="btn-sm"
          >
            Refresh
          </Button>
          <Link to="/staff/dashboard" className="btn btn-outline-success btn-sm text-decoration-none">
            Back to Dashboard
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4 d-flex justify-content-between align-items-center">
          <span>{error}</span>
          <Button variant="secondary" onClick={() => void loadActions()} className="btn-sm ms-3">
            Retry
          </Button>
        </Alert>
      )}

      {/* Filter and Status Controls */}
      <div className="card shadow-sm border-0 mb-4 bg-light">
        <div className="card-body p-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="small fw-bold text-muted">Status Filters:</span>
              {ALL_ACTION_STATUSES.map((status) => {
                const isActive = selectedStatuses.includes(status);
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleStatusToggle(status)}
                    className={`btn btn-sm ${isActive ? 'btn-success text-white' : 'btn-outline-secondary'}`}
                    style={{ fontSize: '0.8rem' }}
                    aria-pressed={isActive}
                  >
                    {status.replaceAll('_', ' ')}
                  </button>
                );
              })}
            </div>

            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-secondary" style={{ fontSize: '0.8rem' }}>
                Assignee: Me
              </span>
              {selectedStatuses.length > 0 && (
                <span className="badge bg-info text-dark" style={{ fontSize: '0.8rem' }}>
                  Statuses: {selectedStatuses.join(', ')}
                </span>
              )}
              <Button
                variant="tertiary"
                onClick={handleResetFilters}
                className="btn-sm p-0 text-decoration-underline"
                style={{ fontSize: '0.825rem', color: '#006B3C' }}
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Table / Content */}
      {isLoading && actions.length === 0 ? (
        <div className="text-center py-5" role="status">
          <div className="spinner-border text-success mb-2" role="status" aria-hidden="true" />
          <p className="text-muted">Loading actions...</p>
        </div>
      ) : actions.length === 0 ? (
        <div className="card shadow-sm border-0 text-center py-5 bg-white">
          <div className="card-body">
            <p className="text-muted mb-2">No actions found matching filters.</p>
            <Button variant="secondary" onClick={handleResetFilters} className="btn-sm">
              Clear Filters
            </Button>
          </div>
        </div>
      ) : (
        <div className="card shadow-sm border-0 mb-4">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.9rem' }}>
              <thead className="table-light">
                <tr>
                  <th scope="col" style={{ width: '130px' }}>Ticket Number</th>
                  <th scope="col" style={{ width: '220px' }}>Ticket Summary</th>
                  <th scope="col" style={{ width: '130px' }}>Ticket Status</th>
                  <th scope="col">Action Description</th>
                  <th scope="col" style={{ width: '130px' }}>Action Status</th>
                  <th scope="col" style={{ width: '140px' }}>Assignee</th>
                  <th scope="col" style={{ width: '170px' }}>Created At</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((act) => (
                  <tr key={act.id}>
                    <td>
                      <Link
                        to={`/staff/tickets/${act.ticketId}`}
                        className="fw-bold text-decoration-none"
                        style={{ color: '#006B3C' }}
                      >
                        {act.ticket.ticketNumber}
                      </Link>
                    </td>
                    <td className="text-truncate" style={{ maxWidth: '220px' }}>
                      <Link
                        to={`/staff/tickets/${act.ticketId}`}
                        className="text-dark text-decoration-none"
                      >
                        {act.ticket.summary}
                      </Link>
                    </td>
                    <td>
                      <Badge type="status" value={act.ticket.currentStatus} />
                    </td>
                    <td>
                      <div className="text-wrap" style={{ maxWidth: '350px' }}>
                        {act.description}
                      </div>
                      {act.result && (
                        <small className="text-success d-block mt-1">
                          <strong>Result:</strong> {act.result}
                        </small>
                      )}
                      {act.followUpRequired && (
                        <small className="text-warning d-block mt-1">
                          <strong>Follow-up:</strong> {act.followUpNote || 'Required'}
                        </small>
                      )}
                    </td>
                    <td>
                      <Badge type="action-status" value={act.status} />
                    </td>
                    <td>
                      <span className="small">{act.assignee ? act.assignee.name : 'Unassigned'}</span>
                    </td>
                    <td className="text-muted" style={{ fontSize: '0.825rem' }}>
                      {formatTicketDateTime(act.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="card-footer bg-white py-3 border-top d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="small text-muted">
              Showing {(pagination.page - 1) * pagination.pageSize + 1}–
              {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of{' '}
              {pagination.totalItems} actions
            </div>

            <div className="d-flex align-items-center gap-2">
              <label htmlFor="pageSizeSelect" className="small text-muted mb-0">
                Page size:
              </label>
              <select
                id="pageSizeSelect"
                value={pagination.pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="form-select form-select-sm w-auto"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>

              <div className="btn-group btn-group-sm ms-2">
                <Button
                  variant="secondary"
                  disabled={!pagination.hasPreviousPage}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="btn-sm"
                >
                  Previous
                </Button>
                <span className="btn btn-sm btn-light border text-muted disabled">
                  Page {pagination.page} of {pagination.totalPages || 1}
                </span>
                <Button
                  variant="secondary"
                  disabled={!pagination.hasNextPage}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="btn-sm"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

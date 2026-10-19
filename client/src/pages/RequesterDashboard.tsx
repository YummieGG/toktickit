import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import type { RequesterDashboardResponse, TicketDashboardRow } from '../types/dashboard';
import { formatTicketDateTime } from '../utils/date';

export const RequesterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<RequesterDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/dashboards/requester', { credentials: 'include' });
      if (!response.ok) {
        let msg = 'Failed to load requester dashboard.';
        try {
          const errData = (await response.json()) as { error?: { message?: string } };
          if (errData.error?.message) msg = errData.error.message;
        } catch {
          // Keep safe fallback
        }
        throw new Error(msg);
      }
      const json = (await response.json()) as RequesterDashboardResponse;
      if (!json || typeof json !== 'object' || !json.metrics || !json.window) {
        throw new Error('Invalid requester dashboard response structure.');
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requester dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const renderTicketPreview = (
    tickets: TicketDashboardRow[],
    emptyMessage: string,
    showResolvedAt = false,
  ) => {
    if (tickets.length === 0) {
      return (
        <div className="p-3 text-muted text-center border rounded bg-white">
          <small>{emptyMessage}</small>
        </div>
      );
    }

    return (
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.9rem' }}>
          <thead className="table-light">
            <tr>
              <th scope="col" style={{ width: '130px' }}>Ticket Number</th>
              <th scope="col">Summary</th>
              <th scope="col" style={{ width: '140px' }}>Status</th>
              <th scope="col" style={{ width: '110px' }}>IT Priority</th>
              <th scope="col" style={{ width: '180px' }}>{showResolvedAt ? 'Resolved At' : 'Last Updated'}</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td>
                  <Link
                    to={`/tickets/${ticket.id}`}
                    className="fw-bold text-decoration-none"
                    style={{ color: '#006B3C' }}
                  >
                    {ticket.ticketNumber}
                  </Link>
                </td>
                <td className="text-truncate" style={{ maxWidth: '300px' }}>
                  <Link
                    to={`/tickets/${ticket.id}`}
                    className="text-dark text-decoration-none"
                  >
                    {ticket.summary}
                  </Link>
                </td>
                <td>
                  <Badge type="status" value={ticket.currentStatus} />
                </td>
                <td>
                  <Badge type="priority" value={ticket.itPriority} />
                </td>
                <td className="text-muted" style={{ fontSize: '0.825rem' }}>
                  {formatTicketDateTime(showResolvedAt && ticket.resolvedAt ? ticket.resolvedAt : ticket.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="container py-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4 border-bottom pb-3">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: '#006B3C' }}>
            Requester Dashboard
          </h1>
          <p className="text-muted small mb-0">
            Overview of your personal tickets and recent operational activity.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => void loadDashboard()}
            isLoading={isLoading}
            className="btn-sm"
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/tickets/new')}
            className="btn-sm"
          >
            Create Ticket
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4 d-flex justify-content-between align-items-center">
          <span>{error}</span>
          <Button variant="secondary" onClick={() => void loadDashboard()} className="btn-sm ms-3">
            Retry
          </Button>
        </Alert>
      )}

      {isLoading && !data && (
        <div className="text-center py-5" role="status">
          <div className="spinner-border text-success mb-2" role="status" aria-hidden="true" />
          <p className="text-muted">Loading dashboard metrics...</p>
        </div>
      )}

      {data && (
        <>
          {/* 4 Metric Cards */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card h-100 shadow-sm border-0" style={{ backgroundColor: '#EAF6EF' }}>
                <div className="card-body d-flex flex-column justify-content-between">
                  <div>
                    <span className="text-muted small text-uppercase fw-bold">Open Tickets</span>
                    <div className="display-6 fw-bold mt-2" style={{ color: '#006B3C' }}>
                      {data.metrics.openTickets}
                    </div>
                    <small className="text-muted">Active tickets in progress</small>
                  </div>
                  <div className="mt-3">
                    <Link
                      to="/tickets?statuses=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED"
                      className="btn btn-outline-success btn-sm w-100 text-decoration-none"
                    >
                      View Open Tickets
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card h-100 shadow-sm border-0" style={{ backgroundColor: '#EAF6EF' }}>
                <div className="card-body d-flex flex-column justify-content-between">
                  <div>
                    <span className="text-muted small text-uppercase fw-bold">Waiting for You</span>
                    <div className="display-6 fw-bold mt-2" style={{ color: '#B45309' }}>
                      {data.metrics.waitingForYou}
                    </div>
                    <small className="text-muted">Awaiting your response</small>
                  </div>
                  <div className="mt-3">
                    <Link
                      to="/tickets?statuses=WAITING_FOR_REQUESTER"
                      className="btn btn-outline-warning btn-sm w-100 text-decoration-none"
                    >
                      View Waiting Tickets
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card h-100 shadow-sm border-0" style={{ backgroundColor: '#EAF6EF' }}>
                <div className="card-body d-flex flex-column justify-content-between">
                  <div>
                    <span className="text-muted small text-uppercase fw-bold">Recently Updated</span>
                    <div className="display-6 fw-bold mt-2" style={{ color: '#006B3C' }}>
                      {data.metrics.recentlyUpdated}
                    </div>
                    <small className="text-muted">Active in last 7 calendar days</small>
                  </div>
                  <div className="mt-3">
                    <Link
                      to={`/tickets?updatedFrom=${encodeURIComponent(data.window.from)}&updatedTo=${encodeURIComponent(data.window.to)}&sortBy=updatedAt&sortOrder=desc`}
                      className="btn btn-outline-success btn-sm w-100 text-decoration-none"
                    >
                      View Updated
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="card h-100 shadow-sm border-0" style={{ backgroundColor: '#EAF6EF' }}>
                <div className="card-body d-flex flex-column justify-content-between">
                  <div>
                    <span className="text-muted small text-uppercase fw-bold">Recently Resolved</span>
                    <div className="display-6 fw-bold mt-2" style={{ color: '#1E40AF' }}>
                      {data.metrics.recentlyResolved}
                    </div>
                    <small className="text-muted">Resolved in last 7 calendar days</small>
                  </div>
                  <div className="mt-3">
                    <Link
                      to={`/tickets?statuses=RESOLVED,CLOSED&resolvedFrom=${encodeURIComponent(data.window.from)}&resolvedTo=${encodeURIComponent(data.window.to)}&sortBy=resolvedAt&sortOrder=desc`}
                      className="btn btn-outline-primary btn-sm w-100 text-decoration-none"
                    >
                      View Resolved
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Lists */}
          <div className="d-flex flex-column gap-4">
            {/* Attention Tickets */}
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                <h2 className="h5 fw-bold mb-0" style={{ color: '#B45309' }}>
                  Attention Required (Waiting for You)
                </h2>
                <Link
                  to="/tickets?statuses=WAITING_FOR_REQUESTER"
                  className="small text-decoration-none"
                  style={{ color: '#006B3C' }}
                >
                  View all ({data.metrics.waitingForYou})
                </Link>
              </div>
              <div className="card-body p-0">
                {renderTicketPreview(data.attentionTickets, 'No tickets currently waiting for your attention.')}
              </div>
            </div>

            {/* Recent Tickets */}
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                <h2 className="h5 fw-bold mb-0" style={{ color: '#006B3C' }}>
                  Recent Tickets
                </h2>
                <Link
                  to={`/tickets?updatedFrom=${encodeURIComponent(data.window.from)}&updatedTo=${encodeURIComponent(data.window.to)}&sortBy=updatedAt&sortOrder=desc`}
                  className="small text-decoration-none"
                  style={{ color: '#006B3C' }}
                >
                  View all ({data.metrics.recentlyUpdated})
                </Link>
              </div>
              <div className="card-body p-0">
                {renderTicketPreview(data.recentTickets, 'No recent tickets found.')}
              </div>
            </div>

            {/* Recently Resolved Tickets */}
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                <h2 className="h5 fw-bold mb-0" style={{ color: '#1E40AF' }}>
                  Recently Resolved Tickets
                </h2>
                <Link
                  to={`/tickets?statuses=RESOLVED,CLOSED&resolvedFrom=${encodeURIComponent(data.window.from)}&resolvedTo=${encodeURIComponent(data.window.to)}&sortBy=resolvedAt&sortOrder=desc`}
                  className="small text-decoration-none"
                  style={{ color: '#006B3C' }}
                >
                  View all ({data.metrics.recentlyResolved})
                </Link>
              </div>
              <div className="card-body p-0">
                {renderTicketPreview(data.resolvedTickets, 'No recently resolved tickets found.', true)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

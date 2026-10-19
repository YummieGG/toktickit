import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import type { StaffActionRow, StaffDashboardResponse, TicketDashboardRow } from '../types/dashboard';
import type { TicketPriority, TicketStatus } from '../types/ticket';
import { formatTicketDateTime } from '../utils/date';

const ALL_STATUSES: TicketStatus[] = [
  'NEW',
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_REQUESTER',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
  'CANCELLED',
];

const ALL_PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const StaffDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<StaffDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/dashboards/staff', { credentials: 'include' });
      if (!response.ok) {
        let msg = 'Failed to load staff dashboard.';
        try {
          const errData = (await response.json()) as { error?: { message?: string } };
          if (errData.error?.message) msg = errData.error.message;
        } catch {
          // Keep safe fallback
        }
        throw new Error(msg);
      }
      const json = (await response.json()) as StaffDashboardResponse;
      if (!json || typeof json !== 'object' || !json.metrics || !json.metrics.ticketsByStatus || !json.metrics.activeTicketsByItPriority) {
        throw new Error('Invalid staff dashboard response structure.');
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staff dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const renderTicketPreview = (tickets: TicketDashboardRow[], emptyMessage: string) => {
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
              <th scope="col" style={{ width: '180px' }}>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td>
                  <Link
                    to={`/staff/tickets/${ticket.id}`}
                    className="fw-bold text-decoration-none"
                    style={{ color: '#006B3C' }}
                  >
                    {ticket.ticketNumber}
                  </Link>
                </td>
                <td className="text-truncate" style={{ maxWidth: '300px' }}>
                  <Link
                    to={`/staff/tickets/${ticket.id}`}
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
                  {formatTicketDateTime(ticket.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderActionsPreview = (actions: StaffActionRow[]) => {
    if (actions.length === 0) {
      return (
        <div className="p-3 text-muted text-center border rounded bg-white">
          <small>No active actions assigned to you.</small>
        </div>
      );
    }

    return (
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.9rem' }}>
          <thead className="table-light">
            <tr>
              <th scope="col" style={{ width: '130px' }}>Ticket Number</th>
              <th scope="col">Action Description</th>
              <th scope="col" style={{ width: '130px' }}>Action Status</th>
              <th scope="col" style={{ width: '130px' }}>Ticket Status</th>
              <th scope="col" style={{ width: '180px' }}>Created At</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((act) => (
              <tr
                key={act.id}
                onClick={() => navigate(`/staff/tickets/${act.ticketId}#action-${act.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <td>
                  <Link
                    to={`/staff/tickets/${act.ticketId}#action-${act.id}`}
                    className="fw-bold text-decoration-none"
                    style={{ color: '#006B3C' }}
                  >
                    {act.ticket.ticketNumber}
                  </Link>
                </td>
                <td className="text-truncate" style={{ maxWidth: '280px' }}>
                  <Link
                    to={`/staff/tickets/${act.ticketId}#action-${act.id}`}
                    className="text-dark text-decoration-none"
                  >
                    {act.description}
                  </Link>
                </td>
                <td>
                  <Badge type="action-status" value={act.status} />
                </td>
                <td>
                  <Badge type="status" value={act.ticket.currentStatus} />
                </td>
                <td className="text-muted" style={{ fontSize: '0.825rem' }}>
                  {formatTicketDateTime(act.createdAt)}
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
            Staff Dashboard
          </h1>
          <p className="text-muted small mb-0">
            Real-time operational queue metrics, status breakdowns, and action assignments.
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
            onClick={() => navigate('/staff/tickets')}
            className="btn-sm"
          >
            Open Queue
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
          <p className="text-muted">Loading operational metrics...</p>
        </div>
      )}

      {data && (
        <>
          {/* Top 3 Core Operational Cards */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-4">
              <div className="card h-100 shadow-sm border-0" style={{ backgroundColor: '#EAF6EF' }}>
                <div className="card-body d-flex flex-column justify-content-between">
                  <div>
                    <span className="text-muted small text-uppercase fw-bold">Unassigned Tickets</span>
                    <div className="display-6 fw-bold mt-2" style={{ color: '#C62828' }}>
                      {data.metrics.unassignedTickets}
                    </div>
                    <small className="text-muted">Active tickets needing ownership</small>
                  </div>
                  <div className="mt-3">
                    <Link
                      to="/staff/tickets?ownerId=unassigned&statuses=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED"
                      className="btn btn-outline-danger btn-sm w-100 text-decoration-none"
                    >
                      View Unassigned
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="card h-100 shadow-sm border-0" style={{ backgroundColor: '#EAF6EF' }}>
                <div className="card-body d-flex flex-column justify-content-between">
                  <div>
                    <span className="text-muted small text-uppercase fw-bold">My Tickets</span>
                    <div className="display-6 fw-bold mt-2" style={{ color: '#006B3C' }}>
                      {data.metrics.myTickets}
                    </div>
                    <small className="text-muted">Active tickets owned by you</small>
                  </div>
                  <div className="mt-3">
                    <Link
                      to="/staff/tickets?ownerId=me&statuses=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED"
                      className="btn btn-outline-success btn-sm w-100 text-decoration-none"
                    >
                      View My Tickets
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="card h-100 shadow-sm border-0" style={{ backgroundColor: '#EAF6EF' }}>
                <div className="card-body d-flex flex-column justify-content-between">
                  <div>
                    <span className="text-muted small text-uppercase fw-bold">My Actions Taken</span>
                    <div className="display-6 fw-bold mt-2" style={{ color: '#2563EB' }}>
                      {data.metrics.myActionsTaken}
                    </div>
                    <small className="text-muted">Assigned actions in progress</small>
                  </div>
                  <div className="mt-3">
                    <Link
                      to="/staff/actions-taken?assignee=me&statuses=PENDING,IN_PROGRESS"
                      className="btn btn-outline-primary btn-sm w-100 text-decoration-none"
                    >
                      View Assigned Actions
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Grids */}
          <div className="row g-4 mb-4">
            {/* Tickets by Status */}
            <div className="col-12 col-lg-7">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white py-3 border-bottom">
                  <h2 className="h6 fw-bold mb-0" style={{ color: '#006B3C' }}>
                    Tickets by Status
                  </h2>
                </div>
                <div className="card-body">
                  <div className="row g-2">
                    {ALL_STATUSES.map((status) => {
                      const count = data.metrics.ticketsByStatus[status] ?? 0;
                      return (
                        <div key={status} className="col-6 col-sm-3">
                          <Link
                            to={`/staff/tickets?status=${status}`}
                            className="text-decoration-none"
                          >
                            <div className="p-2 border rounded text-center bg-light transition h-100 hover-shadow">
                              <Badge type="status" value={status} />
                              <div className="fw-bold fs-5 mt-1 text-dark">{count}</div>
                            </div>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Active Tickets by IT Priority */}
            <div className="col-12 col-lg-5">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white py-3 border-bottom">
                  <h2 className="h6 fw-bold mb-0" style={{ color: '#006B3C' }}>
                    Active Tickets by IT Priority
                  </h2>
                </div>
                <div className="card-body">
                  <div className="row g-2">
                    {ALL_PRIORITIES.map((prio) => {
                      const count = data.metrics.activeTicketsByItPriority[prio] ?? 0;
                      return (
                        <div key={prio} className="col-6 col-sm-3 col-lg-6">
                          <Link
                            to={`/staff/tickets?itPriority=${prio}&statuses=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED`}
                            className="text-decoration-none"
                          >
                            <div className="p-2 border rounded text-center bg-light transition h-100 hover-shadow">
                              <Badge type="priority" value={prio} />
                              <div className="fw-bold fs-5 mt-1 text-dark">{count}</div>
                            </div>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Lists */}
          <div className="d-flex flex-column gap-4">
            {/* Urgent Tickets */}
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                <h2 className="h5 fw-bold mb-0" style={{ color: '#C62828' }}>
                  Urgent Tickets (Critical / High)
                </h2>
                <Link
                  to="/staff/tickets?itPriorities=HIGH,CRITICAL&statuses=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED&sortBy=itPriority&sortOrder=desc"
                  className="small text-decoration-none"
                  style={{ color: '#006B3C' }}
                >
                  View queue
                </Link>
              </div>
              <div className="card-body p-0">
                {renderTicketPreview(data.urgentTickets, 'No urgent active tickets found.')}
              </div>
            </div>

            {/* Recent Tickets */}
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                <h2 className="h5 fw-bold mb-0" style={{ color: '#006B3C' }}>
                  Recently Updated Tickets
                </h2>
                <Link
                  to={`/staff/tickets?updatedFrom=${encodeURIComponent(data.window.from)}&updatedTo=${encodeURIComponent(data.window.to)}&sortBy=updatedAt&sortOrder=desc`}
                  className="small text-decoration-none"
                  style={{ color: '#006B3C' }}
                >
                  View queue
                </Link>
              </div>
              <div className="card-body p-0">
                {renderTicketPreview(data.recentTickets, 'No recently updated tickets found.')}
              </div>
            </div>

            {/* My Actions */}
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                <h2 className="h5 fw-bold mb-0" style={{ color: '#2563EB' }}>
                  My Assigned Actions
                </h2>
                <Link
                  to="/staff/actions-taken?assignee=me&statuses=PENDING,IN_PROGRESS"
                  className="small text-decoration-none"
                  style={{ color: '#006B3C' }}
                >
                  View all ({data.metrics.myActionsTaken})
                </Link>
              </div>
              <div className="card-body p-0">
                {renderActionsPreview(data.myActions)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

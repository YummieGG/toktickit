import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { TicketAttachmentSection } from '../components/tickets/TicketAttachmentSection';
import { useRequester } from '../contexts/RequesterContext';
import type { TicketAttachment, TicketDetail } from '../types/ticket';
import { formatTicketDateTime } from '../utils/date';

type DetailErrorKind = 'not-found' | 'unauthorized' | 'failure';

interface DetailError {
  kind: DetailErrorKind;
  message: string;
}

class TicketDetailRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function ReadOnlyField({ label, children, className = '' }: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="ticket-detail-label">{label}</dt>
      <dd className="ticket-detail-readonly mb-0">{children}</dd>
    </div>
  );
}

export function RequesterTicketDetail() {
  const { id } = useParams();
  const { requester } = useRequester();
  const navigate = useNavigate();
  const [scopedTicketState, setScopedTicketState] = useState<{ requesterId: string; ticket: TicketDetail } | null>(null);
  const [error, setError] = useState<DetailError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => {
    if (!requester) {
      navigate('/');
    }
  }, [navigate, requester]);

  useEffect(() => {
    if (!requester || !id) return;

    const controller = new AbortController();
    const requesterId = String(requester.id);

    const loadTicket = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/tickets/${encodeURIComponent(id)}?requesterId=${encodeURIComponent(requesterId)}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          let message = 'Unable to load ticket details';
          try {
            const payload = await response.json() as { error?: string };
            message = payload.error || message;
          } catch {
            // Keep the safe fallback when the server does not return JSON.
          }
          throw new TicketDetailRequestError(response.status, message);
        }

        const payload = await response.json() as { data?: TicketDetail };
        if (!payload.data) {
          throw new Error('Unable to load ticket details');
        }
        setScopedTicketState({ requesterId, ticket: payload.data });
      } catch (requestError) {
        if ((requestError as Error).name === 'AbortError') return;
        if (requestError instanceof TicketDetailRequestError && requestError.status === 404) {
          setError({ kind: 'not-found', message: 'The requested ticket could not be found.' });
        } else if (requestError instanceof TicketDetailRequestError && requestError.status === 403) {
          setError({ kind: 'unauthorized', message: 'You do not have permission to view this ticket.' });
        } else {
          setError({
            kind: 'failure',
            message: requestError instanceof Error ? requestError.message : 'Unable to load ticket details',
          });
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadTicket();
    return () => controller.abort();
  }, [id, requester, retryTrigger]);

  const ticket = scopedTicketState?.requesterId === String(requester?.id) ? scopedTicketState.ticket : null;

  const updateAttachments = (update: (attachments: TicketAttachment[]) => TicketAttachment[]) => {
    setScopedTicketState(previous => previous
      ? { ...previous, ticket: { ...previous.ticket, attachments: update(previous.ticket.attachments) } }
      : previous);
  };

  if (!requester) return null;

  return (
    <section className="ticket-detail mt-2" aria-label="Ticket detail">
      <Link className="btn btn-zen-tertiary mb-3 px-0" to="/tickets">
        ← Back to My Tickets
      </Link>

      {(isLoading || (!ticket && !error)) && (
        <div className="card shadow-sm text-center p-5" aria-live="polite">
          <div className="spinner-border mx-auto mb-3" role="status" style={{ color: 'var(--primary-green)' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mb-0">Loading...</p>
        </div>
      )}

      {!isLoading && error && (
        <Alert variant={error.kind === 'failure' ? 'danger' : 'warning'} className="ticket-detail-error text-center p-4">
          <h1 id="ticket-detail-title" className="h3 mb-2">
            {error.kind === 'not-found'
              ? 'Ticket Not Found'
              : error.kind === 'unauthorized'
                ? 'Access Denied'
                : 'Unable to Load Ticket'}
          </h1>
          <p className="mb-3">{error.message}</p>
          <div className="d-flex flex-column flex-sm-row justify-content-center gap-3">
            {error.kind === 'failure' && (
              <Button type="button" onClick={() => setRetryTrigger(value => value + 1)}>
                Retry
              </Button>
            )}
            <Link className="btn btn-zen-secondary" to="/tickets">
              Back to My Tickets
            </Link>
          </div>
        </Alert>
      )}

      {!isLoading && !error && ticket && (
        <>
          <header className="card shadow-sm mb-4 ticket-detail-header">
            <div className="card-body p-3 p-md-4">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3">
                <div>
                  <p className="mb-1 small" style={{ color: 'var(--text-secondary)' }}>Ticket Number</p>
                  <h1 id="ticket-detail-title" className="ticket-detail-number mb-0">{ticket.ticketNumber}</h1>
                </div>
                <div className="d-flex flex-wrap gap-2" aria-label="Ticket status and requested priority">
                  <Badge type="status" value={ticket.currentStatus} />
                  <Badge type="priority" value={ticket.requestedPriority} />
                </div>
              </div>
              <dl className="row g-3 mt-2 mb-0">
                <ReadOnlyField label="Date Created" className="col-12">
                  {formatTicketDateTime(ticket.ticketDate)}
                </ReadOnlyField>
              </dl>
            </div>
          </header>

          <div className="card shadow-sm mb-4">
            <div className="card-body p-3 p-md-4">
              <h2 className="h3 mb-3">Classification</h2>
              <dl className="row g-3 mb-0">
                <ReadOnlyField label="Category" className="col-12 col-md-6">
                  {ticket.category.name}
                </ReadOnlyField>
                <ReadOnlyField label="Related System" className="col-12 col-md-6">
                  {ticket.relatedSystem?.name ?? <span className="text-muted">Not specified</span>}
                </ReadOnlyField>
              </dl>
            </div>
          </div>

          <div className="card shadow-sm mb-4">
            <div className="card-body p-3 p-md-4">
              <h2 className="h3 mb-3">Request Details</h2>
              <dl className="mb-0 d-grid gap-3">
                <ReadOnlyField label="Summary">
                  <span className="ticket-detail-summary">{ticket.summary}</span>
                </ReadOnlyField>
                <ReadOnlyField label="Description">
                  <span className="ticket-detail-description">{ticket.description}</span>
                </ReadOnlyField>
              </dl>
            </div>
          </div>

          <div className="card shadow-sm mb-4">
            <div className="card-body p-3 p-md-4">
              <h2 className="h3 mb-3">Requester</h2>
              <dl className="row g-3 mb-0">
                <ReadOnlyField label="Requester Name" className="col-12 col-md-6">
                  {ticket.requester.name}
                </ReadOnlyField>
                <ReadOnlyField label="Requester Email" className="col-12 col-md-6">
                  {ticket.requester.email}
                </ReadOnlyField>
              </dl>
            </div>
          </div>

          <TicketAttachmentSection
            ticketId={ticket.id}
            attachments={ticket.attachments}
            requesterId={requester.id}
            onUpdateAttachments={updateAttachments}
          />
        </>
      )}
    </section>
  );
}

import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { TicketAttachmentSection } from '../components/tickets/TicketAttachmentSection';
import { useAuth } from '../contexts/auth';
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

async function extractErrorMessage(response: Response, defaultMessage: string): Promise<string> {
  try {
    const payload = await response.json() as { error?: string | { message?: string } };
    return typeof payload.error === 'string' ? payload.error : payload.error?.message || defaultMessage;
  } catch {
    return defaultMessage;
  }
}

function ReadOnlyField({ label, children, className = '' }: {

  label: string;
  children: ReactNode;
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [error, setError] = useState<DetailError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    if (!user || !id) return;

    const controller = new AbortController();

    const loadTicket = async () => {
      setIsLoading(true);
      setError(null);
      setTicket(null);
      try {
        const response = await fetch(
          `/api/tickets/${encodeURIComponent(id)}`,
          { signal: controller.signal, credentials: 'include' }
        );
        if (!response.ok) {
          const message = await extractErrorMessage(response, 'Unable to load ticket details');
          throw new TicketDetailRequestError(response.status, message);
        }

        const payload = await response.json() as { data?: TicketDetail };
        if (!payload.data) {
          throw new Error('Unable to load ticket details');
        }
        setTicket(payload.data);
      } catch (requestError) {
        if ((requestError as Error).name === 'AbortError') return;
        if (requestError instanceof TicketDetailRequestError && requestError.status === 401) {
          navigate('/login', {
            replace: true,
            state: { from: `/tickets/${id}`, notice: 'Your session has expired. Please sign in again.' },
          });
          return;
        }
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
  }, [id, navigate, retryTrigger, user]);

  const updateAttachments = (update: (attachments: TicketAttachment[]) => TicketAttachment[]) => {
    setTicket(previous => previous ? { ...previous, attachments: update(previous.attachments) } : previous);
  };

  const handleResolutionIndication = async () => {
    if (!ticket || ticket.problemAppearsResolvedAt || isSubmittingResolution) return;
    setResolutionError(null);
    setIsSubmittingResolution(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/problem-appears-resolved`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 401) {
          navigate('/login', {
            replace: true,
            state: { from: `/tickets/${ticket.id}`, notice: 'Your session has expired. Please sign in again.' },
          });
          return;
        }
        const message = await extractErrorMessage(response, 'Unable to report that the problem appears resolved.');
        setResolutionError(message);
        return;
      }
      const payload = await response.json() as { data?: { problemAppearsResolvedAt?: string } };
      const timestamp = payload.data?.problemAppearsResolvedAt;
      if (!timestamp) {
        setResolutionError('The server did not return a resolution timestamp. Please try again.');
        return;
      }
      setTicket(previous => previous ? { ...previous, problemAppearsResolvedAt: timestamp } : previous);
    } catch {
      setResolutionError('Unable to report that the problem appears resolved. Please try again.');
    } finally {
      setIsSubmittingResolution(false);
    }
  };

  const handleCommentSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ticket || isSubmittingComment) return;
    const content = commentText.replace(/\r\n?/g, '\n').trim();
    if (content.length < 1 || content.length > 2000) {
      setCommentError('Comment must be between 1 and 2000 characters.');
      return;
    }

    setCommentError(null);
    setIsSubmittingComment(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        const message = await extractErrorMessage(response, 'Unable to add comment.');
        setCommentError(message);
        return;
      }
      const payload = await response.json() as { data?: TicketDetail['comments'][number] };
      if (!payload.data) {
        setCommentError('The server did not return the new comment. Please try again.');
        return;
      }
      setTicket(previous => previous ? { ...previous, comments: [...(previous.comments ?? []), payload.data!] } : previous);
      setCommentText('');
    } catch {
      setCommentError('Unable to add comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

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
            onUpdateAttachments={updateAttachments}
          />

          <section className="card shadow-sm mb-4" aria-labelledby="public-comments-title">
            <div className="card-body p-3 p-md-4">
              <h2 id="public-comments-title" className="h3 mb-3">Public Comments</h2>
              {(ticket.comments?.length ?? 0) === 0 ? (
                <p className="text-muted">No public comments yet.</p>
              ) : (
                <ul className="list-unstyled d-grid gap-3 mb-4">
                  {ticket.comments?.map(comment => (
                    <li key={comment.id} className="border rounded p-3">
                      <div className="d-flex flex-column flex-sm-row justify-content-between gap-2 mb-2">
                        <strong>{comment.author.name} · {comment.author.role}</strong>
                        <time className="small text-muted" dateTime={comment.createdAt}>{formatTicketDateTime(comment.createdAt)}</time>
                      </div>
                      <p className="mb-0" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{comment.content}</p>
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={handleCommentSubmit} noValidate>
                <label className="form-label" htmlFor="public-comment">Add a public comment</label>
                <textarea
                  id="public-comment"
                  className={`form-control ${commentError ? 'is-invalid' : ''}`}
                  rows={4}
                  maxLength={2000}
                  value={commentText}
                  disabled={isSubmittingComment}
                  onChange={event => {
                    setCommentText(event.target.value);
                    setCommentError(null);
                  }}
                  aria-describedby={commentError ? 'public-comment-error' : undefined}
                  aria-invalid={commentError ? true : undefined}
                />
                {commentError && <div id="public-comment-error" className="invalid-feedback-custom mt-1" role="alert">{commentError}</div>}
                <Button type="submit" className="mt-3" isLoading={isSubmittingComment}>Add Comment</Button>
              </form>
            </div>
          </section>

          <section className="card shadow-sm mb-4" aria-labelledby="resolution-title">
            <div className="card-body p-3 p-md-4">
              <h2 id="resolution-title" className="h3 mb-2">Problem Appears Resolved</h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                Let the support team know if the problem appears to be resolved. This does not change the ticket status.
              </p>
              {resolutionError && <Alert variant="danger" className="mb-3">{resolutionError}</Alert>}
              {ticket.problemAppearsResolvedAt && (
                <p className="alert alert-success mb-3" role="status">
                  Reported on {formatTicketDateTime(ticket.problemAppearsResolvedAt)}. The support team has been notified.
                </p>
              )}
              <Button
                type="button"
                variant="secondary"
                isLoading={isSubmittingResolution}
                disabled={Boolean(ticket.problemAppearsResolvedAt)}
                onClick={() => void handleResolutionIndication()}
              >
                {ticket.problemAppearsResolvedAt ? 'Problem Appears Resolved (reported)' : 'Problem Appears Resolved'}
              </Button>
            </div>
          </section>
        </>
      )}
    </section>
  );
}

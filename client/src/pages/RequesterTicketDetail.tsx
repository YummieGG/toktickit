import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useRequester } from '../contexts/RequesterContext';
import type { TicketAttachment, TicketDetail } from '../types/ticket';
import { validateAttachmentSelection } from '../utils/attachment';
import { formatTicketDateTime } from '../utils/date';
import { formatFileSize } from '../utils/file';

type DetailErrorKind = 'not-found' | 'unauthorized' | 'failure';

interface DetailError {
  kind: DetailErrorKind;
  message: string;
}

interface AttachmentError {
  fileName?: string;
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
  const [result, setResult] = useState<{ requesterId: string; ticket: TicketDetail } | null>(null);
  const [error, setError] = useState<DetailError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<AttachmentError | null>(null);
  const [unavailableAttachmentIds, setUnavailableAttachmentIds] = useState<Set<number>>(new Set());
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<number | null>(null);
  const [removalTarget, setRemovalTarget] = useState<TicketAttachment | null>(null);
  const [removalReason, setRemovalReason] = useState('');
  const [removalError, setRemovalError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

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
        setResult({ requesterId, ticket: payload.data });
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

  const ticket = result?.requesterId === String(requester?.id) ? result.ticket : null;

  const updateAttachments = (update: (attachments: TicketAttachment[]) => TicketAttachment[]) => {
    setResult(previous => previous
      ? { ...previous, ticket: { ...previous.ticket, attachments: update(previous.ticket.attachments) } }
      : previous);
  };

  const parseErrorMessage = async (response: Response, fallback: string): Promise<string> => {
    try {
      const payload = await response.json() as {
        error?: string;
        details?: Array<{ message?: string }>;
      };
      return payload.details?.find(detail => detail.message)?.message || payload.error || fallback;
    } catch {
      return fallback;
    }
  };

  const handleAttachmentSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !ticket || !requester || uploadingFileName) return;

    setAttachmentError(null);
    const activeCount = ticket.attachments.filter(attachment => !attachment.isRemoved).length;
    const validationMessage = validateAttachmentSelection(file, activeCount);
    if (validationMessage) {
      setAttachmentError({ fileName: file.name, message: validationMessage });
      return;
    }

    setUploadingFileName(file.name);
    try {
      const formData = new FormData();
      formData.append('requesterId', String(requester.id));
      formData.append('file', file);
      const response = await fetch(`/api/tickets/${ticket.id}/attachments`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const message = await parseErrorMessage(response, 'Unable to upload attachment');
        setAttachmentError({ fileName: file.name, message });
        return;
      }
      const payload = await response.json() as { data: TicketAttachment };
      updateAttachments(attachments => [
        ...attachments,
        { ...payload.data, removalReason: null, removedAt: null },
      ]);
    } catch {
      setAttachmentError({ fileName: file.name, message: 'Unable to upload attachment. Please try again.' });
    } finally {
      setUploadingFileName(null);
    }
  };

  const handleDownload = async (attachment: TicketAttachment) => {
    if (!requester || downloadingAttachmentId !== null) return;
    setDownloadingAttachmentId(attachment.id);
    try {
      const response = await fetch(
        `/api/attachments/${attachment.id}/download?requesterId=${encodeURIComponent(String(requester.id))}`
      );
      if (!response.ok) throw new Error('File unavailable');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = attachment.originalName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setUnavailableAttachmentIds(previous => new Set(previous).add(attachment.id));
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  const openRemovalConfirmation = (attachment: TicketAttachment) => {
    setRemovalTarget(attachment);
    setRemovalReason('');
    setRemovalError(null);
  };

  const closeRemovalConfirmation = () => {
    if (isRemoving) return;
    setRemovalTarget(null);
    setRemovalReason('');
    setRemovalError(null);
  };

  const confirmRemoval = async () => {
    if (!removalTarget || !requester || isRemoving) return;
    const trimmedReason = removalReason.trim();
    if (trimmedReason.length < 3 || trimmedReason.length > 500) {
      setRemovalError('Removal reason must be between 3 and 500 characters.');
      return;
    }

    setRemovalError(null);
    setIsRemoving(true);
    try {
      const response = await fetch(`/api/attachments/${removalTarget.id}/remove`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: requester.id, removalReason: trimmedReason }),
      });
      if (!response.ok) {
        setRemovalError(await parseErrorMessage(response, 'Unable to remove attachment'));
        return;
      }
      const payload = await response.json() as {
        data: Pick<TicketAttachment, 'id' | 'isRemoved' | 'removalReason' | 'removedAt'>;
      };
      updateAttachments(attachments => attachments.map(attachment =>
        attachment.id === payload.data.id ? { ...attachment, ...payload.data } : attachment
      ));
      setRemovalTarget(null);
      setRemovalReason('');
    } catch {
      setRemovalError('Unable to remove attachment. Please try again.');
    } finally {
      setIsRemoving(false);
    }
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

          <div className="card shadow-sm mb-4">
            <div className="card-body p-3 p-md-4">
              <h2 className="h3 mb-3">Attachments</h2>
              <div className="attachment-picker mb-3">
                <label htmlFor="ticket-attachment" className="form-label">Add attachment</label>
                <input
                  id="ticket-attachment"
                  className={`form-control ${attachmentError ? 'is-invalid' : ''}`}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  disabled={uploadingFileName !== null}
                  onChange={event => void handleAttachmentSelection(event)}
                  aria-invalid={attachmentError ? true : undefined}
                  aria-busy={uploadingFileName ? true : undefined}
                  aria-describedby={`ticket-attachment-help${attachmentError ? ' ticket-attachment-error' : ''}`}
                />
                <div id="ticket-attachment-help" className="form-text">
                  JPG, PNG, WEBP, or PDF. Maximum 5 MB per file and 5 active attachments.
                </div>
              </div>

              {attachmentError && (
                <div id="ticket-attachment-error" className="ticket-attachment ticket-attachment-invalid mb-3" role="alert">
                  <div className="d-flex flex-column flex-sm-row justify-content-between gap-2">
                    <div className="ticket-attachment-metadata">
                      <strong>{attachmentError.fileName ? `Invalid: ${attachmentError.fileName}` : 'Invalid attachment'}</strong>
                      <div className="small mt-1">{attachmentError.message}</div>
                    </div>
                    <Button variant="secondary" type="button" onClick={() => setAttachmentError(null)}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              )}

              {uploadingFileName && (
                <div className="ticket-attachment ticket-attachment-uploading mb-3" aria-live="polite">
                  <div className="ticket-attachment-name fw-semibold">Uploading: {uploadingFileName}</div>
                  <div className="progress mt-2" role="progressbar" aria-label={`Uploading ${uploadingFileName}`}>
                    <div className="progress-bar progress-bar-striped progress-bar-animated w-100" />
                  </div>
                </div>
              )}

              {ticket.attachments.length === 0 && !uploadingFileName && !attachmentError ? (
                <p className="mb-0 text-muted">No attachments were submitted with this ticket.</p>
              ) : (
                <ul className="list-unstyled d-grid gap-3 mb-0">
                  {ticket.attachments.map(attachment => {
                    const isUnavailable = unavailableAttachmentIds.has(attachment.id);
                    const isRemovalOpen = removalTarget?.id === attachment.id;
                    return (
                      <li
                        key={attachment.id}
                        className={`ticket-attachment ${attachment.isRemoved ? 'ticket-attachment-removed' : ''} ${isUnavailable ? 'ticket-attachment-unavailable' : ''}`}
                      >
                        <div className="ticket-attachment-content d-flex flex-column flex-lg-row justify-content-between gap-3">
                          <div className="ticket-attachment-metadata">
                            <div className={`ticket-attachment-name fw-semibold ${attachment.isRemoved ? 'text-decoration-line-through' : ''}`}>
                              📎 {attachment.originalName}
                            </div>
                            <div className="small mt-1" style={{ color: 'var(--text-secondary)' }}>
                              {attachment.mimeType} · {formatFileSize(attachment.sizeBytes)} · Uploaded {formatTicketDateTime(attachment.createdAt)}
                            </div>
                          </div>
                          {attachment.isRemoved ? (
                            <span className="attachment-state-badge is-removed">Removed</span>
                          ) : isUnavailable ? (
                            <span className="attachment-state-badge is-unavailable">Unavailable</span>
                          ) : (
                            <div className="d-flex flex-column align-items-start align-items-lg-end gap-2">
                              <span className="attachment-state-badge is-active">Active</span>
                              <div className="ticket-attachment-actions d-flex flex-column flex-sm-row gap-2">
                                <Button
                                  variant="secondary"
                                  type="button"
                                  isLoading={downloadingAttachmentId === attachment.id}
                                  disabled={uploadingFileName !== null || isRemoving || downloadingAttachmentId !== null}
                                  onClick={() => void handleDownload(attachment)}
                                >
                                  Download
                                </Button>
                                <Button
                                  variant="destructive"
                                  type="button"
                                  disabled={uploadingFileName !== null || isRemoving || downloadingAttachmentId !== null}
                                  onClick={() => openRemovalConfirmation(attachment)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                        {isUnavailable && (
                          <Alert variant="warning" className="small mt-3 mb-0 py-2">
                            File not found on server. Download is unavailable.
                          </Alert>
                        )}
                        {attachment.isRemoved && (
                          <div className="ticket-attachment-removal-details small mt-2">
                            <div><strong>Removal reason:</strong> {attachment.removalReason || 'Reason not provided'}</div>
                            <div><strong>Removed at:</strong> {attachment.removedAt ? formatTicketDateTime(attachment.removedAt) : 'Removal time unavailable'}</div>
                          </div>
                        )}
                        {isRemovalOpen && (
                          <div className="ticket-attachment-removal-confirmation mt-3" role="dialog" aria-labelledby={`remove-title-${attachment.id}`}>
                            <h3 id={`remove-title-${attachment.id}`} className="h5">Remove {attachment.originalName}?</h3>
                            <p className="small mb-2">This keeps the file metadata in the ticket history and blocks future downloads.</p>
                            <label htmlFor={`removal-reason-${attachment.id}`} className="form-label">
                              Removal reason <span className="required-asterisk" aria-hidden="true">*</span>
                            </label>
                            <textarea
                              id={`removal-reason-${attachment.id}`}
                              className={`form-control ${removalError ? 'is-invalid' : ''}`}
                              rows={3}
                              minLength={3}
                              maxLength={500}
                              required
                              value={removalReason}
                              disabled={isRemoving}
                              onChange={event => {
                                setRemovalReason(event.target.value);
                                setRemovalError(null);
                              }}
                              aria-invalid={removalError ? true : undefined}
                              aria-describedby={removalError ? `removal-error-${attachment.id}` : undefined}
                            />
                            {removalError && (
                              <div id={`removal-error-${attachment.id}`} className="invalid-feedback-custom mt-1" role="alert">
                                ⚠ {removalError}
                              </div>
                            )}
                            <div className="d-flex flex-column-reverse flex-sm-row justify-content-end gap-2 mt-3">
                              <Button variant="secondary" type="button" disabled={isRemoving} onClick={closeRemovalConfirmation}>
                                Cancel
                              </Button>
                              <Button variant="destructive" type="button" isLoading={isRemoving} onClick={() => void confirmRemoval()}>
                                Remove Attachment
                              </Button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

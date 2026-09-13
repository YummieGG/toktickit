import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { TicketAttachmentSection } from '../components/tickets/TicketAttachmentSection';
import { useAuth } from '../contexts/auth';
import type { TicketComment, TicketDetail, TicketInternalNote, TicketPriority, TicketStatus } from '../types/ticket';
import { formatTicketDateTime } from '../utils/date';

const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: ['OPEN', 'CANCELLED'], OPEN: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'CANCELLED'], IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'CANCELLED'], RESOLVED: ['CLOSED', 'REOPENED'], CLOSED: ['REOPENED'], REOPENED: ['IN_PROGRESS', 'CANCELLED'], CANCELLED: ['REOPENED'],
};
const CONFIRM_STATUSES = new Set<TicketStatus>(['CANCELLED', 'RESOLVED', 'CLOSED', 'REOPENED']);

class DetailRequestError extends Error {
  readonly status: number;
  readonly fields: Record<string, string>;

  constructor(status: number, message: string, fields: Record<string, string> = {}) { super(message); this.status = status; this.fields = fields; }
}

async function readError(response: Response, fallback: string): Promise<{ message: string; fields: Record<string, string> }> {
  try {
    const body = await response.json() as { error?: { message?: string; fields?: Record<string, string> }; details?: Array<{ message?: string }> };
    return { message: body.error?.message ?? body.details?.find(item => item.message)?.message ?? fallback, fields: body.error?.fields ?? {} };
  } catch { return { message: fallback, fields: {} }; }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  if (!response.ok) { const failure = await readError(response, 'Unable to process the request.'); throw new DetailRequestError(response.status, failure.message, failure.fields); }
  return response.status === 204 ? {} as T : response.json() as Promise<T>;
}

function ReadOnlyField({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt className="ticket-detail-label">{label}</dt><dd className="ticket-detail-readonly mb-0">{children}</dd></div>;
}

function displayStatus(value: string) { return value.replaceAll('_', ' '); }

export function StaffTicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdministrator = user?.role === 'ADMINISTRATOR';
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [error, setError] = useState<DetailRequestError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [ownerInput, setOwnerInput] = useState('');
  const [commentText, setCommentText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user || !id) return;
    const controller = new AbortController();
    setIsLoading(true); setError(null); setTicket(null);
    void fetch(`/api/tickets/${encodeURIComponent(id)}`, { credentials: 'include', signal: controller.signal })
      .then(async response => {
        if (!response.ok) { const failure = await readError(response, 'Unable to load ticket detail.'); throw new DetailRequestError(response.status, failure.message, failure.fields); }
        return response.json() as Promise<{ data?: TicketDetail }>;
      })
      .then(payload => {
        if (!payload.data) throw new DetailRequestError(500, 'Unable to load ticket detail.');
        setTicket(payload.data);
        setOwnerInput(payload.data.owner ? String(payload.data.owner.id) : '');
      })
      .catch(requestError => {
        if ((requestError as Error).name !== 'AbortError') setError(requestError instanceof DetailRequestError ? requestError : new DetailRequestError(0, 'Unable to load ticket detail.'));
      })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [id, retry, user]);

  const mutate = async (key: string, url: string, body: unknown, success: string) => {
    if (!ticket || saving) return;
    setSaving(key); setFeedback(null); setMutationError(null); setValidationErrors({});
    try {
      const payload = await requestJson<{ data: TicketDetail }>(url, { method: 'PATCH', body: JSON.stringify(body) });
      setTicket(payload.data); setOwnerInput(payload.data.owner ? String(payload.data.owner.id) : ''); setFeedback(success);
    } catch (requestError) {
      if (requestError instanceof DetailRequestError && requestError.status === 401) { navigate('/login', { replace: true }); return; }
      setValidationErrors(requestError instanceof DetailRequestError ? requestError.fields : {});
      setMutationError(requestError instanceof Error ? requestError.message : 'Unable to save changes.');
    } finally { setSaving(null); }
  };

  const saveOwner = () => {
    if (ownerInput === '') { void mutate('owner', `/api/tickets/${ticket?.id}/owner`, { ownerId: null }, 'Ticket is now unassigned.'); return; }
    const ownerId = Number(ownerInput);
    if (!Number.isSafeInteger(ownerId) || ownerId < 1) { setValidationErrors({ ownerId: 'Owner ID must be a positive integer or empty for unassigned.' }); setMutationError(null); return; }
    void mutate('owner', `/api/tickets/${ticket?.id}/owner`, { ownerId }, 'Owner updated.');
  };

  const saveStatus = (status: TicketStatus, selectElement?: HTMLSelectElement) => {
    if (!ticket) return;
    if (CONFIRM_STATUSES.has(status) && !window.confirm(`Confirm changing this ticket to ${displayStatus(status)}?`)) {
      if (selectElement) selectElement.value = ticket.currentStatus;
      return;
    }
    void mutate('status', `/api/tickets/${ticket.id}/status`, { status, confirmed: CONFIRM_STATUSES.has(status) }, 'Ticket status updated.');
  };

  const postEntry = async (kind: 'comment' | 'note', event: FormEvent) => {
    event.preventDefault();
    if (!ticket || saving) return;
    const text = (kind === 'comment' ? commentText : noteText).replace(/\r\n?/g, '\n').trim();
    if (!text || text.length > 2000) { setValidationErrors({ [kind === 'comment' ? 'comment' : 'internalNote']: `${kind === 'comment' ? 'Comment' : 'Internal note'} must be between 1 and 2000 characters.` }); setMutationError(null); return; }
    setSaving(kind); setFeedback(null); setMutationError(null); setValidationErrors({});
    try {
      const payload = await requestJson<{ data: TicketComment | TicketInternalNote }>(`/api/tickets/${ticket.id}/${kind === 'comment' ? 'comments' : 'internal-notes'}`, { method: 'POST', body: JSON.stringify({ content: text }) });
      setTicket(previous => previous ? kind === 'comment' ? { ...previous, comments: [...previous.comments, payload.data as TicketComment] } : { ...previous, internalNotes: [...(previous.internalNotes ?? []), payload.data as TicketInternalNote] } : previous);
      if (kind === 'comment') setCommentText(''); else setNoteText('');
      setFeedback(`${kind === 'comment' ? 'Public comment' : 'Internal note'} added.`);
    } catch (requestError) { setValidationErrors(requestError instanceof DetailRequestError ? requestError.fields : {}); setMutationError(requestError instanceof Error ? requestError.message : 'Unable to add entry.'); }
    finally { setSaving(null); }
  };

  if (isLoading) return <section className="card shadow-sm p-5 text-center" role="status"><div className="spinner-border mx-auto mb-3" /><p className="mb-0">Loading ticket detail...</p></section>;
  if (error || !ticket) return <Alert variant={error?.status === 403 ? 'warning' : 'danger'} className="text-center p-4"><h1 className="h3">{error?.status === 404 ? 'Ticket Not Found' : error?.status === 403 ? 'Access Denied' : 'Unable to Load Ticket'}</h1><p>{error?.message ?? 'The ticket could not be loaded.'}</p>{error && error.status !== 403 && <Button type="button" onClick={() => setRetry(value => value + 1)}>Retry</Button>}</Alert>;

  const allowedStatuses = TRANSITIONS[ticket.currentStatus];
  return (
    <section className="staff-ticket-detail" aria-labelledby="staff-ticket-detail-title">
      <Link className="btn btn-zen-tertiary mb-3 px-0" to="/staff/tickets">← Back to Staff Queue</Link>
      <header className="card shadow-sm mb-4"><div className="card-body p-3 p-md-4"><div className="d-flex flex-column flex-md-row justify-content-between gap-3"><div><p className="mb-1 small text-muted">Ticket Number</p><h1 id="staff-ticket-detail-title" className="ticket-detail-number mb-0">{ticket.ticketNumber}</h1></div><div className="d-flex gap-2 flex-wrap"><Badge type="status" value={ticket.currentStatus} /><Badge type="priority" value={ticket.requestedPriority} /><Badge type="priority" value={ticket.itPriority} /></div></div><dl className="row g-3 mt-2 mb-0"><ReadOnlyField label="Ticket Date">{formatTicketDateTime(ticket.ticketDate)}</ReadOnlyField><ReadOnlyField label="Last Updated">{formatTicketDateTime(ticket.updatedAt)}</ReadOnlyField><ReadOnlyField label="Requester">{ticket.requester.name} · {ticket.requester.email}</ReadOnlyField><ReadOnlyField label="Owner">{ticket.owner?.name ?? 'Unassigned'}</ReadOnlyField><ReadOnlyField label="Problem Appears Resolved">{ticket.problemAppearsResolvedAt ? formatTicketDateTime(ticket.problemAppearsResolvedAt) : 'Not indicated'}</ReadOnlyField></dl></div></header>

      {(feedback || mutationError) && <div className={`alert ${mutationError ? 'alert-danger' : 'alert-success'}`} role="status" aria-live="polite">{mutationError ?? feedback}</div>}
      <div className="card shadow-sm mb-4"><div className="card-body p-3 p-md-4"><h2 className="h3">Ticket information</h2><dl className="d-grid gap-3 mb-0"><ReadOnlyField label="Category">{ticket.category.name}</ReadOnlyField><ReadOnlyField label="Related System">{ticket.relatedSystem?.name ?? 'Not specified'}</ReadOnlyField><ReadOnlyField label="Summary">{ticket.summary}</ReadOnlyField><ReadOnlyField label="Description"><span className="ticket-detail-description">{ticket.description}</span></ReadOnlyField></dl></div></div>

      {!isAdministrator && <section className="card shadow-sm mb-4" aria-labelledby="workflow-controls-title"><div className="card-body p-3 p-md-4"><h2 id="workflow-controls-title" className="h3">Workflow controls</h2><div className="row g-3"><div className="col-12 col-md-4"><label className="form-label" htmlFor="ticket-owner">Owner ID</label><div className="input-group"><input id="ticket-owner" list="ticket-owner-suggestions" className={`form-control ${validationErrors.ownerId ? 'is-invalid' : ''}`} inputMode="numeric" value={ownerInput} onChange={event => { setOwnerInput(event.target.value); setValidationErrors({}); }} placeholder="Empty = unassigned" aria-invalid={validationErrors.ownerId ? true : undefined} /><datalist id="ticket-owner-suggestions">{user && <option value={String(user.id)}>{user.name} (You)</option>}{ticket.owner && ticket.owner.id !== user?.id && <option value={String(ticket.owner.id)}>{ticket.owner.name} (Current Owner)</option>}</datalist><Button type="button" onClick={saveOwner} isLoading={saving === 'owner'}>Save</Button></div>{validationErrors.ownerId && <div className="invalid-feedback-custom" role="alert">{validationErrors.ownerId}</div>}<div className="form-text">Use your ID to claim; only active Staff/Admin targets are accepted.</div><div className="d-flex gap-2 mt-2"><Button type="button" variant="secondary" onClick={() => { setOwnerInput(String(user?.id ?? '')); }} disabled={saving !== null}>Assign to me</Button><Button type="button" variant="tertiary" onClick={() => { setOwnerInput(''); }} disabled={saving !== null || ownerInput === ''}>Clear</Button></div></div><div className="col-12 col-md-4"><label className="form-label" htmlFor="ticket-it-priority">IT Priority</label><select id="ticket-it-priority" className={`form-select ${validationErrors.itPriority ? 'is-invalid' : ''}`} value={ticket.itPriority} disabled={saving !== null} aria-invalid={validationErrors.itPriority ? true : undefined} onChange={event => void mutate('it-priority', `/api/tickets/${ticket.id}/it-priority`, { itPriority: event.target.value }, 'IT Priority updated.')}>{PRIORITIES.map(priority => <option key={priority} value={priority}>{priority}</option>)}</select>{validationErrors.itPriority && <div className="invalid-feedback-custom" role="alert">{validationErrors.itPriority}</div>}<div className="form-text">Requested Priority remains {ticket.requestedPriority}.</div></div><div className="col-12 col-md-4"><label className="form-label" htmlFor="ticket-status">Status</label><select id="ticket-status" className={`form-select ${validationErrors.status || validationErrors.confirmed ? 'is-invalid' : ''}`} value={ticket.currentStatus} disabled={saving !== null || allowedStatuses.length === 0} aria-invalid={validationErrors.status || validationErrors.confirmed ? true : undefined} onChange={event => saveStatus(event.target.value as TicketStatus, event.currentTarget)}><option value={ticket.currentStatus}>{displayStatus(ticket.currentStatus)} (current)</option>{allowedStatuses.map(status => <option key={status} value={status}>{displayStatus(status)}</option>)}</select>{(validationErrors.status || validationErrors.confirmed) && <div className="invalid-feedback-custom" role="alert">{validationErrors.status ?? validationErrors.confirmed}</div>}<div className="form-text">Allowed next states: {allowedStatuses.length ? allowedStatuses.map(displayStatus).join(', ') : 'None'}.</div></div></div></div></section>}

      <TicketAttachmentSection ticketId={ticket.id} attachments={ticket.attachments} mode={isAdministrator ? 'administrator' : 'staff'} />
      <section className="card shadow-sm mb-4" aria-labelledby="staff-public-comments-title"><div className="card-body p-3 p-md-4"><h2 id="staff-public-comments-title" className="h3">Public Comments</h2>{ticket.comments.length === 0 ? <p className="text-muted">No public comments yet.</p> : <div className="d-grid gap-3 mb-3">{ticket.comments.map(comment => <article className="border rounded p-3" key={comment.id}><p className="mb-1" style={{ whiteSpace: 'pre-wrap' }}>{comment.content}</p><small className="text-muted">{comment.author.name} · {formatTicketDateTime(comment.createdAt)}</small></article>)}</div>}{!isAdministrator && <form onSubmit={event => void postEntry('comment', event)}><label className="form-label" htmlFor="staff-public-comment">Add a public comment</label><textarea id="staff-public-comment" className={`form-control ${validationErrors.comment ? 'is-invalid' : ''}`} rows={4} maxLength={2000} value={commentText} onChange={event => { setCommentText(event.target.value); setValidationErrors({}); }} aria-invalid={validationErrors.comment ? true : undefined} />{validationErrors.comment && <div className="invalid-feedback-custom" role="alert">{validationErrors.comment}</div>}<div className="d-flex justify-content-between mt-2"><span className="form-text">{commentText.length}/2000</span><Button type="submit" isLoading={saving === 'comment'}>Add public comment</Button></div></form>}</div></section>
      <section className="card shadow-sm mb-4 internal-notes-panel" aria-labelledby="internal-notes-title"><div className="card-body p-3 p-md-4"><h2 id="internal-notes-title" className="h3">Internal Notes</h2>{(ticket.internalNotes?.length ?? 0) === 0 ? <p className="text-muted">No internal notes yet.</p> : <div className="d-grid gap-3 mb-3">{ticket.internalNotes?.map(note => <article className="border rounded p-3" key={note.id}><p className="mb-1" style={{ whiteSpace: 'pre-wrap' }}>{note.content}</p><small className="text-muted">{note.author.name} · {formatTicketDateTime(note.createdAt)}</small></article>)}</div>}{!isAdministrator && <form onSubmit={event => void postEntry('note', event)}><label className="form-label" htmlFor="staff-internal-note">Add an internal note</label><textarea id="staff-internal-note" className={`form-control ${validationErrors.internalNote ? 'is-invalid' : ''}`} rows={4} maxLength={2000} value={noteText} onChange={event => { setNoteText(event.target.value); setValidationErrors({}); }} aria-invalid={validationErrors.internalNote ? true : undefined} />{validationErrors.internalNote && <div className="invalid-feedback-custom" role="alert">{validationErrors.internalNote}</div>}<div className="d-flex justify-content-between mt-2"><span className="form-text">{noteText.length}/2000</span><Button type="submit" isLoading={saving === 'note'}>Add internal note</Button></div></form>}</div></section>
    </section>
  );
}

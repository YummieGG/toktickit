import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/auth';
import type {
  ActionProjection,
  ActionListResponse,
} from '../../types/action';
import type { TicketStatus } from '../../types/ticket';

export interface ActionsTakenSectionProps {
  ticketId: number;
  ticketVersion: number;
  ticketStatus: TicketStatus;
  isReadOnly?: boolean;
  onTicketVersionChange?: (newVersion: number) => void;
  onSessionExpired?: () => void;
}

interface ActionAssigneeOption {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
}

const TERMINAL_PARENT_STATUSES: readonly TicketStatus[] = ['RESOLVED', 'CLOSED', 'CANCELLED'];

function formatActionDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return date.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 16);
  } catch {
    return date.toISOString().slice(0, 16).replace('T', ' ');
  }
}

function sortActions(items: ActionProjection[]): ActionProjection[] {
  return [...items].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.id - b.id;
  });
}

function generateIdempotencyKey(ticketId: number): string {
  return `idem-${ticketId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const ActionsTakenSection: React.FC<ActionsTakenSectionProps> = ({
  ticketId,
  ticketVersion,
  ticketStatus,
  isReadOnly = false,
  onTicketVersionChange,
  onSessionExpired,
}) => {
  const { user } = useAuth();
  const onTicketVersionChangeRef = useRef(onTicketVersionChange);
  onTicketVersionChangeRef.current = onTicketVersionChange;
  const onSessionExpiredRef = useRef(onSessionExpired);
  onSessionExpiredRef.current = onSessionExpired;
  const isParentTerminal = TERMINAL_PARENT_STATUSES.includes(ticketStatus);
  const canMutate = !isReadOnly && !isParentTerminal && (user?.role === 'IT_STAFF' || user?.role === 'ADMINISTRATOR');

  const [actions, setActions] = useState<ActionProjection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [currentTicketVersion, setCurrentTicketVersion] = useState(ticketVersion);

  // Eligible assignees for Staff/Admin
  const [assigneeOptions, setAssigneeOptions] = useState<ActionAssigneeOption[]>([]);

  // Create Action Form State
  const [isCreating, setIsCreating] = useState(false);
  const [createDescription, setCreateDescription] = useState('');
  const [createResult, setCreateResult] = useState('');
  const [createAssigneeId, setCreateAssigneeId] = useState<string>('');
  const [createFollowUpRequired, setCreateFollowUpRequired] = useState(false);
  const [createFollowUpNote, setCreateFollowUpNote] = useState('');
  const [createAttachmentNotes, setCreateAttachmentNotes] = useState('');
  const [createIdempotencyKey, setCreateIdempotencyKey] = useState<string>('');
  const [createValidationErrors, setCreateValidationErrors] = useState<Record<string, string>>({});
  const [isCreatingSubmitting, setIsCreatingSubmitting] = useState(false);

  // Edit Action Form State
  const [editingAction, setEditingAction] = useState<ActionProjection | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editResult, setEditResult] = useState('');
  const [editFollowUpRequired, setEditFollowUpRequired] = useState(false);
  const [editFollowUpNote, setEditFollowUpNote] = useState('');
  const [editAttachmentNotes, setEditAttachmentNotes] = useState('');
  const [editValidationErrors, setEditValidationErrors] = useState<Record<string, string>>({});
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Reassign Action Form State
  const [reassigningAction, setReassigningAction] = useState<ActionProjection | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string>('');
  const [reassignError, setReassignError] = useState<string | null>(null);
  const [isReassignSubmitting, setIsReassignSubmitting] = useState(false);

  // Status Transition State
  const [statusAction, setStatusAction] = useState<{
    action: ActionProjection;
    targetStatus: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  } | null>(null);
  const [statusResultInput, setStatusResultInput] = useState('');
  const [statusCancelReasonInput, setStatusCancelReasonInput] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);

  // Keep internal ticketVersion updated if parent prop changes
  useEffect(() => {
    setCurrentTicketVersion(ticketVersion);
  }, [ticketVersion]);

  // Load actions
  const fetchActions = useCallback(async () => {
    if (!ticketId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/actions-taken?page=1&pageSize=20`, {
        credentials: 'include',
      });
      if (response.status === 401) {
        onSessionExpiredRef.current?.();
        return;
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(body.error?.message || 'Unable to load actions taken.');
      }
      const payload = (await response.json()) as ActionListResponse;
      const fetchedActions = payload.data || [];
      setActions(sortActions(fetchedActions));
      setConflictNotice(null);
      if (typeof payload.ticketVersion === 'number') {
        setCurrentTicketVersion(payload.ticketVersion);
        if (payload.ticketVersion !== ticketVersion) {
          onTicketVersionChangeRef.current?.(payload.ticketVersion);
        }
      }
      // Reconcile open mutation subforms with updated action version while preserving user's form inputs
      setEditingAction((prev) => {
        if (!prev) return null;
        const latest = fetchedActions.find((a) => a.id === prev.id);
        return latest ? { ...prev, version: latest.version } : prev;
      });
      setReassigningAction((prev) => {
        if (!prev) return null;
        const latest = fetchedActions.find((a) => a.id === prev.id);
        return latest ? { ...prev, version: latest.version } : prev;
      });
      setStatusAction((prev) => {
        if (!prev) return null;
        const latest = fetchedActions.find((a) => a.id === prev.action.id);
        return latest ? { ...prev, action: { ...prev.action, version: latest.version } } : prev;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load actions taken.');
    } finally {
      setIsLoading(false);
    }
  }, [ticketId, ticketVersion]);

  // Load eligible assignees for staff/admin
  useEffect(() => {
    if (isReadOnly || !user || user.role === 'REQUESTER') return;
    const controller = new AbortController();
    fetch('/api/staff/tickets/owners', {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (res) => {
        if (res.status === 401) {
          onSessionExpiredRef.current?.();
          return;
        }
        if (res.ok) {
          const body = (await res.json()) as { data?: ActionAssigneeOption[] };
          setAssigneeOptions(body.data || []);
        }
      })
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') {
          console.error('Failed to load eligible action assignees', err);
        }
      });
    return () => controller.abort();
  }, [isReadOnly, user]);

  useEffect(() => {
    void fetchActions();
  }, [fetchActions]);

  // Open Create Form
  const handleOpenCreate = () => {
    setIsCreating(true);
    setCreateDescription('');
    setCreateResult('');
    setCreateAssigneeId(user ? String(user.id) : '');
    setCreateFollowUpRequired(false);
    setCreateFollowUpNote('');
    setCreateAttachmentNotes('');
    setCreateIdempotencyKey(generateIdempotencyKey(ticketId));
    setCreateValidationErrors({});
    setConflictNotice(null);
    setSuccessNotice(null);
  };

  const handleCloseCreate = () => {
    setIsCreating(false);
    setCreateValidationErrors({});
  };

  // Submit Create Action
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingSubmitting) return;

    const errors: Record<string, string> = {};
    const trimmedDesc = createDescription.trim();
    if (!trimmedDesc) {
      errors.description = 'Action description is required (1–2,000 characters).';
    } else if (trimmedDesc.length > 2000) {
      errors.description = 'Action description must not exceed 2,000 characters.';
    }

    if (createFollowUpRequired) {
      const trimmedNote = createFollowUpNote.trim();
      if (!trimmedNote) {
        errors.followUpNote = 'Follow-up note is required when follow-up is requested.';
      } else if (trimmedNote.length > 2000) {
        errors.followUpNote = 'Follow-up note must not exceed 2,000 characters.';
      }
    }

    if (createAttachmentNotes && createAttachmentNotes.length > 2000) {
      errors.attachmentNotes = 'Attachment notes must not exceed 2,000 characters.';
    }

    if (createResult && createResult.length > 2000) {
      errors.result = 'Result must not exceed 2,000 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setCreateValidationErrors(errors);
      if (errors.description) {
        document.getElementById('action-create-desc')?.focus();
      } else if (errors.followUpNote) {
        document.getElementById('action-create-followup-note')?.focus();
      } else if (errors.result) {
        document.getElementById('action-create-result')?.focus();
      } else if (errors.attachmentNotes) {
        document.getElementById('action-create-attachments')?.focus();
      }
      return;
    }

    setCreateValidationErrors({});
    setIsCreatingSubmitting(true);
    setConflictNotice(null);
    setSuccessNotice(null);

    const payload: Record<string, unknown> = {
      description: trimmedDesc,
      result: createResult.trim() || null,
      assigneeId: createAssigneeId ? Number(createAssigneeId) : null,
      followUpRequired: createFollowUpRequired,
      followUpNote: createFollowUpRequired ? createFollowUpNote.trim() : null,
      attachmentNotes: createAttachmentNotes.trim() || null,
      expectedTicketVersion: currentTicketVersion,
    };

    try {
      const response = await fetch(`/api/tickets/${ticketId}/actions-taken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': createIdempotencyKey,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        onSessionExpiredRef.current?.();
        return;
      }

      const body = (await response.json().catch(() => ({}))) as {
        data?: { action: ActionProjection; ticketVersion: number };
        error?: { code?: string; message?: string; fields?: Record<string, string> };
      };

      if (response.status === 409) {
        // Concurrency conflict: preserve draft, display reconciliation message
        setConflictNotice(
          body.error?.message ||
            'Conflict: The ticket was updated by another request. Please reload to reconcile before resubmitting.',
        );
        return;
      }

      if (!response.ok) {
        if (body.error?.fields) {
          setCreateValidationErrors(body.error.fields);
        } else {
          setCreateValidationErrors({
            general: body.error?.message || 'Failed to create action.',
          });
        }
        return;
      }

      if (body.data) {
        const newAction = body.data.action;
        setActions((prev) => sortActions([...prev, newAction]));
        setCurrentTicketVersion(body.data.ticketVersion);
        onTicketVersionChangeRef.current?.(body.data.ticketVersion);
        setSuccessNotice('Action created successfully.');
        setIsCreating(false);
      }
    } catch (err) {
      setCreateValidationErrors({
        general: err instanceof Error ? err.message : 'Network error creating action.',
      });
    } finally {
      setIsCreatingSubmitting(false);
    }
  };

  // Open Edit Form
  const handleOpenEdit = (action: ActionProjection) => {
    setEditingAction(action);
    setEditDescription(action.description);
    setEditResult(action.result || '');
    setEditFollowUpRequired(action.followUpRequired);
    setEditFollowUpNote(action.followUpNote || '');
    setEditAttachmentNotes(action.attachmentNotes || '');
    setEditValidationErrors({});
    setConflictNotice(null);
    setSuccessNotice(null);
  };

  const handleCloseEdit = () => {
    setEditingAction(null);
    setEditValidationErrors({});
  };

  // Submit Edit Action
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAction || isEditSubmitting) return;

    const errors: Record<string, string> = {};
    const trimmedDesc = editDescription.trim();
    if (!trimmedDesc) {
      errors.description = 'Action description is required (1–2,000 characters).';
    } else if (trimmedDesc.length > 2000) {
      errors.description = 'Action description must not exceed 2,000 characters.';
    }

    if (editingAction.status === 'COMPLETED') {
      const trimmedRes = editResult.trim();
      if (!trimmedRes) {
        errors.result = 'Result is required for completed actions.';
      } else if (trimmedRes.length > 2000) {
        errors.result = 'Result must not exceed 2,000 characters.';
      }
    }

    if (editFollowUpRequired) {
      const trimmedNote = editFollowUpNote.trim();
      if (!trimmedNote) {
        errors.followUpNote = 'Follow-up note is required when follow-up is requested.';
      } else if (trimmedNote.length > 2000) {
        errors.followUpNote = 'Follow-up note must not exceed 2,000 characters.';
      }
    }

    if (editAttachmentNotes && editAttachmentNotes.length > 2000) {
      errors.attachmentNotes = 'Attachment notes must not exceed 2,000 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setEditValidationErrors(errors);
      if (errors.description) {
        document.getElementById('action-edit-desc')?.focus();
      } else if (errors.result) {
        document.getElementById('action-edit-result')?.focus();
      } else if (errors.followUpNote) {
        document.getElementById('action-edit-followup-note')?.focus();
      } else if (errors.attachmentNotes) {
        document.getElementById('action-edit-attachments')?.focus();
      }
      return;
    }

    setEditValidationErrors({});
    setIsEditSubmitting(true);
    setConflictNotice(null);
    setSuccessNotice(null);

    const payload = {
      description: trimmedDesc,
      result: editResult.trim() || null,
      followUpRequired: editFollowUpRequired,
      followUpNote: editFollowUpRequired ? editFollowUpNote.trim() : null,
      attachmentNotes: editAttachmentNotes.trim() || null,
      expectedTicketVersion: currentTicketVersion,
      expectedActionVersion: editingAction.version,
    };

    try {
      const response = await fetch(`/api/tickets/${ticketId}/actions-taken/${editingAction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        onSessionExpiredRef.current?.();
        return;
      }

      const body = (await response.json().catch(() => ({}))) as {
        data?: { action: ActionProjection; ticketVersion: number };
        error?: { code?: string; message?: string; fields?: Record<string, string> };
      };

      if (response.status === 409) {
        setConflictNotice(
          body.error?.message ||
            'Conflict: The action or ticket was modified by another user. Please reload to see latest state.',
        );
        return;
      }

      if (!response.ok) {
        if (body.error?.fields) {
          setEditValidationErrors(body.error.fields);
        } else {
          setEditValidationErrors({
            general: body.error?.message || 'Failed to update action.',
          });
        }
        return;
      }

      if (body.data) {
        const updated = body.data.action;
        setActions((prev) => sortActions(prev.map((a) => (a.id === updated.id ? updated : a))));
        setCurrentTicketVersion(body.data.ticketVersion);
        onTicketVersionChangeRef.current?.(body.data.ticketVersion);
        setSuccessNotice('Action updated successfully.');
        setEditingAction(null);
      }
    } catch (err) {
      setEditValidationErrors({
        general: err instanceof Error ? err.message : 'Network error updating action.',
      });
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Open Reassign Form
  const handleOpenReassign = (action: ActionProjection) => {
    setReassigningAction(action);
    setReassignTargetId(action.assignee ? String(action.assignee.id) : '');
    setReassignError(null);
    setConflictNotice(null);
    setSuccessNotice(null);
  };

  const handleCloseReassign = () => {
    setReassigningAction(null);
    setReassignError(null);
  };

  // Submit Reassign Action
  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassigningAction || isReassignSubmitting) return;

    const targetIdNum = Number(reassignTargetId);
    if (!reassignTargetId || !Number.isSafeInteger(targetIdNum) || targetIdNum < 1) {
      setReassignError('Please select a valid active staff or administrator.');
      document.getElementById('action-reassign-select')?.focus();
      return;
    }

    setReassignError(null);
    setIsReassignSubmitting(true);
    setConflictNotice(null);
    setSuccessNotice(null);

    const payload = {
      assigneeId: targetIdNum,
      expectedTicketVersion: currentTicketVersion,
      expectedActionVersion: reassigningAction.version,
    };

    try {
      const response = await fetch(
        `/api/tickets/${ticketId}/actions-taken/${reassigningAction.id}/assignee`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        },
      );

      if (response.status === 401) {
        onSessionExpiredRef.current?.();
        return;
      }

      const body = (await response.json().catch(() => ({}))) as {
        data?: { action: ActionProjection; ticketVersion: number };
        error?: { code?: string; message?: string };
      };

      if (response.status === 409) {
        setConflictNotice(
          body.error?.message ||
            'Conflict: The action or ticket was modified. Please reload before reassigning.',
        );
        return;
      }

      if (!response.ok) {
        setReassignError(body.error?.message || 'Failed to reassign action.');
        return;
      }

      if (body.data) {
        const updated = body.data.action;
        setActions((prev) => sortActions(prev.map((a) => (a.id === updated.id ? updated : a))));
        setCurrentTicketVersion(body.data.ticketVersion);
        onTicketVersionChangeRef.current?.(body.data.ticketVersion);
        setSuccessNotice('Action reassigned successfully.');
        setReassigningAction(null);
      }
    } catch (err) {
      setReassignError(err instanceof Error ? err.message : 'Network error reassigning action.');
    } finally {
      setIsReassignSubmitting(false);
    }
  };

  // Open Status Transition
  const handleOpenStatusTransition = (
    action: ActionProjection,
    targetStatus: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
  ) => {
    setStatusAction({ action, targetStatus });
    setStatusResultInput(action.result || '');
    setStatusCancelReasonInput('');
    setStatusError(null);
    setConflictNotice(null);
    setSuccessNotice(null);
  };

  const handleCloseStatusTransition = () => {
    setStatusAction(null);
    setStatusError(null);
  };

  // Submit Status Transition
  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusAction || isStatusSubmitting) return;

    const { action, targetStatus } = statusAction;
    let resultPayload: string | null = null;
    let cancelReasonPayload: string | null = null;

    if (targetStatus === 'COMPLETED') {
      const trimmedResult = statusResultInput.trim();
      if (!trimmedResult) {
        setStatusError('Result is required to complete an action (1–2,000 characters).');
        document.getElementById('action-status-result')?.focus();
        return;
      }
      if (trimmedResult.length > 2000) {
        setStatusError('Result must not exceed 2,000 characters.');
        document.getElementById('action-status-result')?.focus();
        return;
      }
      resultPayload = trimmedResult;
    } else if (targetStatus === 'CANCELLED') {
      const trimmedReason = statusCancelReasonInput.trim();
      if (!trimmedReason) {
        setStatusError('Cancel reason is required to cancel an action (1–2,000 characters).');
        document.getElementById('action-status-cancel-reason')?.focus();
        return;
      }
      if (trimmedReason.length > 2000) {
        setStatusError('Cancel reason must not exceed 2,000 characters.');
        document.getElementById('action-status-cancel-reason')?.focus();
        return;
      }
      cancelReasonPayload = trimmedReason;
    }

    setStatusError(null);
    setIsStatusSubmitting(true);
    setConflictNotice(null);
    setSuccessNotice(null);

    const payload: Record<string, unknown> = {
      status: targetStatus,
      expectedTicketVersion: currentTicketVersion,
      expectedActionVersion: action.version,
    };
    if (resultPayload !== null) payload.result = resultPayload;
    if (cancelReasonPayload !== null) payload.cancelReason = cancelReasonPayload;

    try {
      const response = await fetch(`/api/tickets/${ticketId}/actions-taken/${action.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        onSessionExpiredRef.current?.();
        return;
      }

      const body = (await response.json().catch(() => ({}))) as {
        data?: { action: ActionProjection; ticketVersion: number };
        error?: { code?: string; message?: string };
      };

      if (response.status === 409) {
        setConflictNotice(
          body.error?.message ||
            'Conflict: The action or ticket was modified. Please reload to see the latest version.',
        );
        return;
      }

      if (!response.ok) {
        setStatusError(body.error?.message || 'Failed to update action status.');
        return;
      }

      if (body.data) {
        const updated = body.data.action;
        setActions((prev) => sortActions(prev.map((a) => (a.id === updated.id ? updated : a))));
        setCurrentTicketVersion(body.data.ticketVersion);
        onTicketVersionChangeRef.current?.(body.data.ticketVersion);
        setSuccessNotice(`Action status changed to ${targetStatus}.`);
        setStatusAction(null);
      }
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Network error changing action status.');
    } finally {
      setIsStatusSubmitting(false);
    }
  };

  return (
    <section
      className="card shadow-sm mb-4 actions-taken-section"
      aria-labelledby="actions-taken-title"
      data-testid="actions-taken-section"
    >
      <div className="card-body p-3 p-md-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-3">
          <div className="d-flex align-items-center gap-2">
            <h2 id="actions-taken-title" className="h3 mb-0">
              Actions Taken
            </h2>
            <span className="badge rounded-pill bg-light text-dark border">
              {actions.length}
            </span>
          </div>
          {canMutate && !isCreating && (
            <Button
              type="button"
              variant="primary"
              onClick={handleOpenCreate}
              aria-label="Add Action"
            >
              + Add Action
            </Button>
          )}
        </div>

        {isParentTerminal && !isReadOnly && (
          <div className="alert alert-info py-2 px-3 small mb-3" role="note">
            This ticket is in a terminal status ({ticketStatus}). Actions cannot be added or modified.
          </div>
        )}

        {conflictNotice && (
          <Alert variant="warning" className="mb-3">
            <p className="mb-2 fw-semibold">Version Conflict Detected</p>
            <p className="mb-2">{conflictNotice}</p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void fetchActions()}
            >
              Reload Actions & Reconcile
            </Button>
          </Alert>
        )}

        {successNotice && (
          <div className="alert alert-success py-2 px-3 mb-3" role="status" aria-live="polite">
            {successNotice}
          </div>
        )}

        {error && (
          <Alert variant="danger" className="mb-3">
            <p className="mb-2">{error}</p>
            <Button type="button" onClick={() => void fetchActions()}>
              Retry
            </Button>
          </Alert>
        )}

        {/* Create Action Form */}
        {isCreating && (
          <form
            onSubmit={(e) => void handleCreateSubmit(e)}
            noValidate
            className="border rounded p-3 mb-4 bg-light"
            aria-label="Create Action Form"
          >
            <h3 className="h5 mb-3 text-success">New Action Taken</h3>
            {createValidationErrors.general && (
              <div className="alert alert-danger py-2 px-3 mb-3" role="alert">
                {createValidationErrors.general}
              </div>
            )}

            <div className="mb-3">
              <label htmlFor="action-create-desc" className="form-label">
                Description <span className="text-danger">*</span>
              </label>
              <textarea
                id="action-create-desc"
                className={`form-control ${createValidationErrors.description ? 'is-invalid' : ''}`}
                rows={3}
                maxLength={2000}
                required
                aria-required="true"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                aria-describedby={
                  createValidationErrors.description ? 'action-create-desc-error' : undefined
                }
              />
              {createValidationErrors.description && (
                <div id="action-create-desc-error" className="invalid-feedback-custom" role="alert">
                  {createValidationErrors.description}
                </div>
              )}
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6">
                <label htmlFor="action-create-assignee" className="form-label">
                  Assignee
                </label>
                <select
                  id="action-create-assignee"
                  className="form-select"
                  value={createAssigneeId}
                  onChange={(e) => setCreateAssigneeId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {assigneeOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name} ({opt.role === 'ADMINISTRATOR' ? 'Administrator' : 'IT Staff'})
                    </option>
                  ))}
                </select>
                <div className="form-text">Defaults to current authenticated user.</div>
              </div>

              <div className="col-12 col-md-6">
                <label htmlFor="action-create-result" className="form-label">
                  Result (Optional)
                </label>
                <textarea
                  id="action-create-result"
                  className={`form-control ${createValidationErrors.result ? 'is-invalid' : ''}`}
                  rows={2}
                  maxLength={2000}
                  value={createResult}
                  onChange={(e) => setCreateResult(e.target.value)}
                  placeholder="Can be filled now or upon completion"
                />
              </div>
            </div>

            <div className="mb-3">
              <div className="form-check mb-2">
                <input
                  id="action-create-followup"
                  type="checkbox"
                  className="form-check-input"
                  checked={createFollowUpRequired}
                  onChange={(e) => setCreateFollowUpRequired(e.target.checked)}
                />
                <label htmlFor="action-create-followup" className="form-check-label fw-semibold">
                  Follow-Up Required
                </label>
              </div>

              {createFollowUpRequired && (
                <div>
                  <label htmlFor="action-create-followup-note" className="form-label">
                    Follow-up Note <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="action-create-followup-note"
                    className={`form-control ${createValidationErrors.followUpNote ? 'is-invalid' : ''}`}
                    rows={2}
                    maxLength={2000}
                    required
                    aria-required="true"
                    value={createFollowUpNote}
                    onChange={(e) => setCreateFollowUpNote(e.target.value)}
                    placeholder="Specify the follow-up task or verification needed"
                    aria-describedby={
                      createValidationErrors.followUpNote ? 'action-create-followup-error' : undefined
                    }
                  />
                  {createValidationErrors.followUpNote && (
                    <div
                      id="action-create-followup-error"
                      className="invalid-feedback-custom"
                      role="alert"
                    >
                      {createValidationErrors.followUpNote}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="action-create-attachments" className="form-label">
                Attachment Notes (Optional)
              </label>
              <textarea
                id="action-create-attachments"
                className="form-control"
                rows={2}
                maxLength={2000}
                value={createAttachmentNotes}
                onChange={(e) => setCreateAttachmentNotes(e.target.value)}
                placeholder="Plain text references to existing ticket attachments"
              />
            </div>

            <div className="d-flex gap-2 justify-content-end">
              <Button
                type="button"
                variant="tertiary"
                onClick={handleCloseCreate}
                disabled={isCreatingSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isCreatingSubmitting}>
                Save Action
              </Button>
            </div>
          </form>
        )}

        {/* Edit Action Form */}
        {editingAction && (
          <form
            onSubmit={(e) => void handleEditSubmit(e)}
            noValidate
            className="border rounded p-3 mb-4 bg-light"
            aria-label="Edit Action Form"
          >
            <h3 className="h5 mb-3 text-primary">Edit Action #{editingAction.id}</h3>
            {editValidationErrors.general && (
              <div className="alert alert-danger py-2 px-3 mb-3" role="alert">
                {editValidationErrors.general}
              </div>
            )}

            <div className="mb-2 text-muted small">
              Performed by: <strong>{editingAction.performedBy.name}</strong> ({editingAction.performedBy.role}) · Created:{' '}
              {formatActionDateTime(editingAction.createdAt)}
            </div>

            <div className="mb-3">
              <label htmlFor="action-edit-desc" className="form-label">
                Description <span className="text-danger">*</span>
              </label>
              <textarea
                id="action-edit-desc"
                className={`form-control ${editValidationErrors.description ? 'is-invalid' : ''}`}
                rows={3}
                maxLength={2000}
                required
                aria-required="true"
                aria-describedby={editValidationErrors.description ? 'action-edit-desc-error' : undefined}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
              {editValidationErrors.description && (
                <div id="action-edit-desc-error" className="invalid-feedback-custom" role="alert">
                  {editValidationErrors.description}
                </div>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="action-edit-result" className="form-label">
                Result {editingAction.status === 'COMPLETED' && <span className="text-danger">*</span>}
              </label>
              <textarea
                id="action-edit-result"
                className={`form-control ${editValidationErrors.result ? 'is-invalid' : ''}`}
                rows={2}
                maxLength={2000}
                required={editingAction.status === 'COMPLETED'}
                aria-required={editingAction.status === 'COMPLETED' ? 'true' : undefined}
                aria-describedby={editValidationErrors.result ? 'action-edit-result-error' : undefined}
                value={editResult}
                onChange={(e) => setEditResult(e.target.value)}
              />
              {editValidationErrors.result && (
                <div id="action-edit-result-error" className="invalid-feedback-custom" role="alert">
                  {editValidationErrors.result}
                </div>
              )}
            </div>

            <div className="mb-3">
              <div className="form-check mb-2">
                <input
                  id="action-edit-followup"
                  type="checkbox"
                  className="form-check-input"
                  checked={editFollowUpRequired}
                  onChange={(e) => setEditFollowUpRequired(e.target.checked)}
                />
                <label htmlFor="action-edit-followup" className="form-check-label fw-semibold">
                  Follow-Up Required
                </label>
              </div>

              {editFollowUpRequired && (
                <div>
                  <label htmlFor="action-edit-followup-note" className="form-label">
                    Follow-up Note <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="action-edit-followup-note"
                    className={`form-control ${editValidationErrors.followUpNote ? 'is-invalid' : ''}`}
                    rows={2}
                    maxLength={2000}
                    required
                    aria-required="true"
                    aria-describedby={editValidationErrors.followUpNote ? 'action-edit-followup-error' : undefined}
                    value={editFollowUpNote}
                    onChange={(e) => setEditFollowUpNote(e.target.value)}
                  />
                  {editValidationErrors.followUpNote && (
                    <div id="action-edit-followup-error" className="invalid-feedback-custom" role="alert">
                      {editValidationErrors.followUpNote}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="action-edit-attachments" className="form-label">
                Attachment Notes
              </label>
              <textarea
                id="action-edit-attachments"
                className={`form-control ${editValidationErrors.attachmentNotes ? 'is-invalid' : ''}`}
                rows={2}
                maxLength={2000}
                aria-describedby={editValidationErrors.attachmentNotes ? 'action-edit-attachments-error' : undefined}
                value={editAttachmentNotes}
                onChange={(e) => setEditAttachmentNotes(e.target.value)}
              />
              {editValidationErrors.attachmentNotes && (
                <div id="action-edit-attachments-error" className="invalid-feedback-custom" role="alert">
                  {editValidationErrors.attachmentNotes}
                </div>
              )}
            </div>

            <div className="d-flex gap-2 justify-content-end">
              <Button
                type="button"
                variant="tertiary"
                onClick={handleCloseEdit}
                disabled={isEditSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isEditSubmitting}>
                Save Changes
              </Button>
            </div>
          </form>
        )}

        {/* Reassign Action Modal/Form */}
        {reassigningAction && (
          <form
            onSubmit={(e) => void handleReassignSubmit(e)}
            noValidate
            className="border rounded p-3 mb-4 bg-light"
            aria-label="Reassign Action Form"
          >
            <h3 className="h5 mb-2 text-primary">Reassign Action #{reassigningAction.id}</h3>
            {reassignError && (
              <div id="action-reassign-error" className="alert alert-danger py-2 px-3 mb-3" role="alert">
                {reassignError}
              </div>
            )}
            <div className="mb-3">
              <label htmlFor="action-reassign-select" className="form-label">
                New Assignee <span className="text-danger">*</span>
              </label>
              <select
                id="action-reassign-select"
                className="form-select"
                value={reassignTargetId}
                required
                aria-required="true"
                aria-describedby={reassignError ? 'action-reassign-error' : undefined}
                onChange={(e) => setReassignTargetId(e.target.value)}
              >
                <option value="">Select an active IT Staff or Administrator</option>
                {assigneeOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name} ({opt.role === 'ADMINISTRATOR' ? 'Administrator' : 'IT Staff'})
                  </option>
                ))}
              </select>
            </div>

            <div className="d-flex gap-2 justify-content-end">
              <Button
                type="button"
                variant="tertiary"
                onClick={handleCloseReassign}
                disabled={isReassignSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isReassignSubmitting}>
                Confirm Assignment
              </Button>
            </div>
          </form>
        )}

        {/* Status Transition Modal/Form */}
        {statusAction && (
          <form
            onSubmit={(e) => void handleStatusSubmit(e)}
            noValidate
            className="border rounded p-3 mb-4 bg-light"
            aria-label="Action Status Transition Form"
          >
            <h3 className="h5 mb-2 text-dark">
              Change Status of Action #{statusAction.action.id} to{' '}
              <Badge type="action-status" value={statusAction.targetStatus} />
            </h3>

            {statusError && (
              <div id="action-status-error" className="alert alert-danger py-2 px-3 mb-3" role="alert">
                {statusError}
              </div>
            )}

            {statusAction.targetStatus === 'COMPLETED' && (
              <div className="mb-3">
                <label htmlFor="action-status-result" className="form-label">
                  Completion Result <span className="text-danger">*</span>
                </label>
                <textarea
                  id="action-status-result"
                  className="form-control"
                  rows={3}
                  maxLength={2000}
                  required
                  aria-required="true"
                  aria-describedby={statusError ? 'action-status-error' : undefined}
                  value={statusResultInput}
                  onChange={(e) => setStatusResultInput(e.target.value)}
                  placeholder="Describe the completed work or solution"
                />
              </div>
            )}

            {statusAction.targetStatus === 'CANCELLED' && (
              <div className="mb-3">
                <label htmlFor="action-status-cancel-reason" className="form-label">
                  Cancellation Reason <span className="text-danger">*</span>
                </label>
                <textarea
                  id="action-status-cancel-reason"
                  className="form-control"
                  rows={3}
                  maxLength={2000}
                  required
                  aria-required="true"
                  aria-describedby={statusError ? 'action-status-error' : undefined}
                  value={statusCancelReasonInput}
                  onChange={(e) => setStatusCancelReasonInput(e.target.value)}
                  placeholder="Provide an explanation for cancelling this action"
                />
              </div>
            )}

            {statusAction.targetStatus === 'IN_PROGRESS' && (
              <p className="mb-3">Start working on this action and set status to In Progress?</p>
            )}

            <div className="d-flex gap-2 justify-content-end">
              <Button
                type="button"
                variant="tertiary"
                onClick={handleCloseStatusTransition}
                disabled={isStatusSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isStatusSubmitting}>
                Confirm
              </Button>
            </div>
          </form>
        )}

        {/* Actions List */}
        {isLoading ? (
          <div className="text-center py-4" role="status">
            <div className="spinner-border text-success mx-auto mb-2" />
            <p className="mb-0 text-muted">Loading actions...</p>
          </div>
        ) : actions.length === 0 ? (
          <div className="text-center py-4 border rounded bg-white">
            <p className="mb-2 text-muted">No actions taken yet.</p>
            {canMutate && !isCreating && (
              <Button type="button" variant="secondary" onClick={handleOpenCreate}>
                Record First Action
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View */}
            <div className="actions-taken-table-wrap d-none d-md-block">
              <table className="table table-hover align-middle actions-taken-table mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col" style={{ width: '15%' }}>Date / Time</th>
                    <th scope="col" style={{ width: '12%' }}>Status</th>
                    <th scope="col" style={{ width: '28%' }}>Description & Notes</th>
                    <th scope="col" style={{ width: '20%' }}>People</th>
                    {canMutate && <th scope="col" style={{ width: '25%' }} className="text-end">Controls</th>}
                  </tr>
                </thead>
                <tbody>
                  {actions.map((act) => {
                    const isTerminal = act.status === 'COMPLETED' || act.status === 'CANCELLED';
                    const canEdit = canMutate && act.status !== 'CANCELLED';
                    const canReassign = canMutate && (act.status === 'PENDING' || act.status === 'IN_PROGRESS');
                    return (
                      <tr key={act.id}>
                        <td>
                          <span className="small text-muted d-block">
                            {formatActionDateTime(act.createdAt)}
                          </span>
                        </td>
                        <td>
                          <Badge type="action-status" value={act.status} />
                        </td>
                        <td>
                          <div className="action-pre-wrap fw-normal mb-1">{act.description}</div>
                          {act.result && (
                            <div className="small text-success mt-1">
                              <strong>Result:</strong>{' '}
                              <span className="action-pre-wrap">{act.result}</span>
                            </div>
                          )}
                          {act.followUpRequired && (
                            <div className="small text-warning-emphasis mt-1">
                              <strong>Follow-up:</strong>{' '}
                              <span className="action-pre-wrap">{act.followUpNote || 'Required'}</span>
                            </div>
                          )}
                          {act.attachmentNotes && (
                            <div className="small text-muted mt-1">
                              <strong>Attachments:</strong>{' '}
                              <span className="action-pre-wrap">{act.attachmentNotes}</span>
                            </div>
                          )}
                          {act.cancelReason && (
                            <div className="small text-danger mt-1">
                              <strong>Cancel Reason:</strong>{' '}
                              <span className="action-pre-wrap">{act.cancelReason}</span>
                            </div>
                          )}
                        </td>
                        <td className="small">
                          <div>
                            <span className="text-muted">By:</span> {act.performedBy.name}{' '}
                            <span className="text-muted">({act.performedBy.role})</span>
                          </div>
                          <div className="mt-1">
                            <span className="text-muted">Assignee:</span>{' '}
                            {act.assignee ? (
                              <span>
                                {act.assignee.name}{' '}
                                {!act.assignee.isActive && (
                                  <span className="badge bg-secondary ms-1">Inactive</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-muted fst-italic">Unassigned</span>
                            )}
                          </div>
                        </td>
                        {canMutate && (
                          <td className="text-end">
                            <div className="d-flex flex-wrap gap-1 justify-content-end actions-taken-button-group">
                              {canEdit && (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="btn-sm"
                                  onClick={() => handleOpenEdit(act)}
                                  aria-label={`Edit action ${act.id}`}
                                >
                                  Edit
                                </Button>
                              )}
                              {canReassign && (
                                <Button
                                  type="button"
                                  variant="tertiary"
                                  className="btn-sm"
                                  onClick={() => handleOpenReassign(act)}
                                  aria-label={`Reassign action ${act.id}`}
                                >
                                  Reassign
                                </Button>
                              )}
                              {act.status === 'PENDING' && (
                                <>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    className="btn-sm"
                                    onClick={() => handleOpenStatusTransition(act, 'IN_PROGRESS')}
                                    aria-label={`Start action ${act.id}`}
                                  >
                                    Start
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="primary"
                                    className="btn-sm"
                                    onClick={() => handleOpenStatusTransition(act, 'COMPLETED')}
                                    aria-label={`Complete action ${act.id}`}
                                  >
                                    Complete
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="tertiary"
                                    className="btn-sm text-danger"
                                    onClick={() => handleOpenStatusTransition(act, 'CANCELLED')}
                                    aria-label={`Cancel action ${act.id}`}
                                  >
                                    Cancel
                                  </Button>
                                </>
                              )}
                              {act.status === 'IN_PROGRESS' && (
                                <>
                                  <Button
                                    type="button"
                                    variant="primary"
                                    className="btn-sm"
                                    onClick={() => handleOpenStatusTransition(act, 'COMPLETED')}
                                    aria-label={`Complete action ${act.id}`}
                                  >
                                    Complete
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="tertiary"
                                    className="btn-sm text-danger"
                                    onClick={() => handleOpenStatusTransition(act, 'CANCELLED')}
                                    aria-label={`Cancel action ${act.id}`}
                                  >
                                    Cancel
                                  </Button>
                                </>
                              )}
                              {isTerminal && (
                                <span className="small text-muted align-self-center">Locked</span>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="actions-taken-cards d-md-none">
              {actions.map((act) => {
                const isTerminal = act.status === 'COMPLETED' || act.status === 'CANCELLED';
                const canEdit = canMutate && act.status !== 'CANCELLED';
                const canReassign = canMutate && (act.status === 'PENDING' || act.status === 'IN_PROGRESS');
                return (
                  <article key={act.id} className="actions-taken-card shadow-sm">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="small text-muted">{formatActionDateTime(act.createdAt)}</span>
                      <Badge type="action-status" value={act.status} />
                    </div>

                    <div className="action-pre-wrap fw-normal mb-2">{act.description}</div>

                    {act.result && (
                      <div className="small text-success mb-1">
                        <strong>Result:</strong> <span className="action-pre-wrap">{act.result}</span>
                      </div>
                    )}
                    {act.followUpRequired && (
                      <div className="small text-warning-emphasis mb-1">
                        <strong>Follow-up:</strong>{' '}
                        <span className="action-pre-wrap">{act.followUpNote || 'Required'}</span>
                      </div>
                    )}
                    {act.attachmentNotes && (
                      <div className="small text-muted mb-1">
                        <strong>Attachments:</strong>{' '}
                        <span className="action-pre-wrap">{act.attachmentNotes}</span>
                      </div>
                    )}
                    {act.cancelReason && (
                      <div className="small text-danger mb-1">
                        <strong>Cancel Reason:</strong>{' '}
                        <span className="action-pre-wrap">{act.cancelReason}</span>
                      </div>
                    )}

                    <div className="small text-muted border-top pt-2 mt-2">
                      <div>
                        By: {act.performedBy.name} ({act.performedBy.role})
                      </div>
                      <div>
                        Assignee:{' '}
                        {act.assignee ? (
                          <span>
                            {act.assignee.name}{' '}
                            {!act.assignee.isActive && (
                              <span className="badge bg-secondary ms-1">Inactive</span>
                            )}
                          </span>
                        ) : (
                          <span className="fst-italic">Unassigned</span>
                        )}
                      </div>
                    </div>

                    {canMutate && (
                      <div className="d-grid gap-2 mt-3 actions-taken-button-group">
                        {canEdit && (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => handleOpenEdit(act)}
                          >
                            Edit
                          </Button>
                        )}
                        {canReassign && (
                          <Button
                            type="button"
                            variant="tertiary"
                            onClick={() => handleOpenReassign(act)}
                          >
                            Reassign
                          </Button>
                        )}
                        {act.status === 'PENDING' && (
                          <>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => handleOpenStatusTransition(act, 'IN_PROGRESS')}
                            >
                              Start Work
                            </Button>
                            <Button
                              type="button"
                              variant="primary"
                              onClick={() => handleOpenStatusTransition(act, 'COMPLETED')}
                            >
                              Complete Action
                            </Button>
                            <Button
                              type="button"
                              variant="tertiary"
                              className="text-danger"
                              onClick={() => handleOpenStatusTransition(act, 'CANCELLED')}
                            >
                              Cancel Action
                            </Button>
                          </>
                        )}
                        {act.status === 'IN_PROGRESS' && (
                          <>
                            <Button
                              type="button"
                              variant="primary"
                              onClick={() => handleOpenStatusTransition(act, 'COMPLETED')}
                            >
                              Complete Action
                            </Button>
                            <Button
                              type="button"
                              variant="tertiary"
                              className="text-danger"
                              onClick={() => handleOpenStatusTransition(act, 'CANCELLED')}
                            >
                              Cancel Action
                            </Button>
                          </>
                        )}
                        {isTerminal && (
                          <div className="text-center text-muted small py-1">Action Locked</div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export const ActionsTaken = ActionsTakenSection;
export default ActionsTakenSection;

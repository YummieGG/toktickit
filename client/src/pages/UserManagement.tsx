import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { ROLE_LABELS, useAuth, type UserRole } from '../contexts/auth';
import type { ManagedUser } from '../types/user';
import { validatePasswordInput } from '../utils/password';

const ROLES: UserRole[] = ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'];
const ORIGIN_PATH = '/admin/users';

function homePathForRole(role: UserRole): string {
  if (role === 'IT_STAFF') return '/staff/tickets';
  if (role === 'ADMINISTRATOR') return '/admin/users';
  return '/tickets';
}

type UserForm = {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  initialPassword: string;
};

type FormErrors = Record<string, string>;
type PanelMode = 'create' | 'edit';

const emptyForm: UserForm = {
  name: '',
  email: '',
  role: 'REQUESTER',
  isActive: true,
  initialPassword: '',
};

class UserManagementError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'UserManagementError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

async function requestApi<T>(url: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    const headers = new Headers(init.headers);
    if (init.body) headers.set('Content-Type', 'application/json');
    response = await fetch(url, {
      ...init,
      credentials: 'include',
      headers,
    });
  } catch {
    throw new UserManagementError(0, 'NETWORK_ERROR', 'Unable to connect to the server');
  }

  if (!response.ok) {
    let payload: { error?: { code?: string; message?: string; fields?: Record<string, string> } } = {};
    try {
      payload = await response.json() as typeof payload;
    } catch {
      // Preserve a safe fallback for an empty or non-JSON error response.
    }
    throw new UserManagementError(
      response.status,
      payload.error?.code ?? 'REQUEST_FAILED',
      payload.error?.message ?? 'Unable to process the request',
      payload.error?.fields ?? {},
    );
  }

  if (response.status === 204) return undefined as T;
  const payload = await response.json() as { data: T };
  return payload.data;
}

function validEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function userFormFrom(user: ManagedUser): UserForm {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    initialPassword: '',
  };
}

function safeErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof UserManagementError)) return fallback;
  if (error.code === 'DUPLICATE_EMAIL') return 'A user with this email already exists.';
  if (error.code === 'SELF_DEACTIVATION') return 'You cannot deactivate your own account.';
  if (error.code === 'LAST_ADMIN_PROTECTION') return 'At least one active Administrator must remain.';
  if (error.code === 'CONFLICT') return 'The user changed while you were editing. Reload and try again.';
  if (error.code === 'NETWORK_ERROR') return 'Unable to connect to the server. Please try again.';
  if (error.status === 403) return 'You do not have permission to manage users.';
  return fallback;
}

function userErrorForField(error: unknown, field: string): string | undefined {
  return error instanceof UserManagementError ? error.fields[field] : undefined;
}

function UserStatus({ isActive }: { isActive: boolean }) {
  return <span className={`user-status-badge ${isActive ? 'is-active' : 'is-inactive'}`}>{isActive ? 'Active' : 'Inactive'}</span>;
}

function UserCard({ user, onEdit }: { user: ManagedUser; onEdit: (user: ManagedUser) => void }) {
  return (
    <article className="user-management-card card shadow-sm p-3">
      <div className="d-flex justify-content-between align-items-start gap-3">
        <div className="user-management-card-value">
          <strong>{user.name}</strong>
          <span className="user-management-email">{user.email}</span>
        </div>
        <UserStatus isActive={user.isActive} />
      </div>
      <div className="d-flex justify-content-between align-items-center gap-3 mt-3">
        <span><span className="user-management-card-label">Role</span>{ROLE_LABELS[user.role]}</span>
        <Button type="button" variant="secondary" onClick={() => onEdit(user)}>Edit</Button>
      </div>
    </article>
  );
}

export function UserManagement() {
  const { user: currentUser, refresh } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<{ search: string; role: UserRole | '' }>({ search: '', role: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<UserManagementError | null>(null);
  const [retry, setRetry] = useState(0);
  const [panelMode, setPanelMode] = useState<PanelMode | null>('create');
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.role) params.set('role', filters.role);
    const query = params.toString();
    return query ? `?${query}` : '';
  }, [filters]);

  const handleExpiredSession = useCallback(async () => {
    await refresh();
    navigate('/login', {
      replace: true,
      state: { from: ORIGIN_PATH, notice: 'Your session has expired. Please sign in again.' },
    });
  }, [navigate, refresh]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setLoadError(null);
    void requestApi<ManagedUser[]>(`/api/admin/users${queryString}`, { signal: controller.signal })
      .then(data => setUsers(data ?? []))
      .catch(error => {
        if (controller.signal.aborted) return;
        if (error instanceof UserManagementError && error.status === 401) {
          void handleExpiredSession();
          return;
        }
        setUsers([]);
        setLoadError(error instanceof UserManagementError
          ? error
          : new UserManagementError(0, 'REQUEST_FAILED', 'Unable to load users'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [handleExpiredSession, queryString, retry]);

  const openCreate = () => {
    setPanelMode('create');
    setSelectedUser(null);
    setForm(emptyForm);
    setFormErrors({});
    setFormMessage(null);
    setResetPassword('');
    setResetError(null);
  };

  const openEdit = (managedUser: ManagedUser) => {
    setPanelMode('edit');
    setSelectedUser(managedUser);
    setForm(userFormFrom(managedUser));
    setFormErrors({});
    setFormMessage(null);
    setResetPassword('');
    setResetError(null);
  };

  const closePanel = () => {
    setPanelMode(null);
    setSelectedUser(null);
    setFormErrors({});
    setFormMessage(null);
    setResetError(null);
  };

  const updateForm = <K extends keyof UserForm>(field: K, value: UserForm[K]) => {
    setForm(previous => ({ ...previous, [field]: value }));
    setFormErrors(previous => ({ ...previous, [field]: '' }));
    setFormMessage(null);
  };

  const validateForm = (): FormErrors => {
    const errors: FormErrors = {};
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (!name) errors.name = 'Name is required';
    if (!email) errors.email = 'Email is required';
    else if (!validEmail(email)) errors.email = 'Enter a valid email address';
    if (!ROLES.includes(form.role)) errors.role = 'Choose a permitted role';
    if (panelMode === 'create') {
      const passwordError = validatePasswordInput(form.initialPassword);
      if (passwordError) errors.initialPassword = passwordError;
    }
    if (selectedUser?.id === currentUser?.id && !form.isActive) {
      errors.isActive = 'You cannot deactivate your own account';
    }
    return errors;
  };

  const handleFilterSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFilters({ search: searchInput.trim(), role: filters.role });
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({ search: '', role: '' });
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!panelMode || isSaving) return;

    const nextErrors = validateForm();
    setFormErrors(nextErrors);
    setFormMessage(null);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      const name = form.name.trim();
      const email = form.email.trim().toLowerCase();
      if (panelMode === 'create') {
        await requestApi<ManagedUser>('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify({ name, email, role: form.role, isActive: form.isActive, initialPassword: form.initialPassword }),
        });
        setFormMessage('User created successfully.');
        setForm(emptyForm);
      } else if (selectedUser) {
        const updated = await requestApi<ManagedUser>(`/api/admin/users/${selectedUser.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name, email, role: form.role, isActive: form.isActive }),
        });
        setUsers(previous => previous.map(item => item.id === updated.id ? updated : item));
        setSelectedUser(updated);
        setForm(userFormFrom(updated));
        setFormMessage('User updated successfully.');
      }
      setFormErrors({});
      if (selectedUser?.id === currentUser?.id) {
        const refreshedUser = await refresh();
        if (!refreshedUser) {
          navigate('/login', {
            replace: true,
            state: { from: ORIGIN_PATH, notice: 'Your account access changed. Please sign in again.' },
          });
          return;
        }
        if (refreshedUser.mustChangePassword) {
          navigate('/change-password', { replace: true });
          return;
        }
        if (refreshedUser.role !== 'ADMINISTRATOR') {
          navigate(homePathForRole(refreshedUser.role), { replace: true });
          return;
        }
      }
      setRetry(value => value + 1);
    } catch (error) {
      if (error instanceof UserManagementError && error.status === 401) {
        await handleExpiredSession();
        return;
      }
      const fields = error instanceof UserManagementError ? error.fields : {};
      setFormErrors(fields);
      setFormMessage(safeErrorMessage(error, 'Unable to save this user. Please check the fields and try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || isResetting) return;
    const passwordError = validatePasswordInput(resetPassword);
    setResetError(passwordError ?? null);
    setFormMessage(null);
    if (passwordError) return;

    setIsResetting(true);
    try {
      await requestApi<void>(`/api/admin/users/${selectedUser.id}/initial-password`, {
        method: 'POST',
        body: JSON.stringify({ initialPassword: resetPassword }),
      });
      setResetPassword('');
      setResetError(null);
      if (selectedUser.id === currentUser?.id) {
        await refresh();
        navigate('/login', {
          replace: true,
          state: { from: ORIGIN_PATH, notice: 'Your password was reset. Please sign in again.' },
        });
        return;
      }
      setFormMessage('Initial password set. The user must change it at the next login.');
    } catch (error) {
      if (error instanceof UserManagementError && error.status === 401) {
        await handleExpiredSession();
        return;
      }
      setResetError(userErrorForField(error, 'initialPassword') ?? safeErrorMessage(error, 'Unable to set the initial password. Please try again.'));
    } finally {
      setIsResetting(false);
    }
  };

  const isForbidden = loadError?.status === 403;
  const hasFilters = Boolean(filters.search || filters.role || searchInput);

  if (isForbidden) {
    return (
      <section aria-labelledby="user-management-forbidden-title" className="user-management">
        <Alert variant="warning" role="alert" aria-live="polite">
          <h1 id="user-management-forbidden-title" className="h2">Access Denied</h1>
          <p className="mb-0">You do not have permission to manage users.</p>
        </Alert>
      </section>
    );
  }

  return (
    <section aria-labelledby="user-management-title" className="user-management">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-4">
        <div>
          <h1 id="user-management-title" className="mb-1">User Management</h1>
          <p className="mb-0" style={{ color: 'var(--text-secondary)' }}>Manage accounts and role access for TokTickIT.</p>
        </div>
        <Button type="button" onClick={openCreate}>Create user</Button>
      </div>

      <form className="card shadow-sm mb-4" onSubmit={handleFilterSubmit} aria-label="User filters">
        <div className="card-body p-3 p-md-4">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-7">
              <label className="form-label" htmlFor="user-search">Search users</label>
              <input
                id="user-search"
                className="form-control"
                value={searchInput}
                onChange={event => setSearchInput(event.target.value)}
                placeholder="Name or email"
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label" htmlFor="user-role-filter">Role filter</label>
              <select
                id="user-role-filter"
                className="form-select"
                value={filters.role}
                onChange={event => setFilters(previous => ({ ...previous, role: event.target.value as UserRole | '' }))}
              >
                <option value="">All roles</option>
                {ROLES.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
              </select>
            </div>
            <div className="col-12 col-md-2 d-flex flex-column flex-sm-row flex-md-column gap-2">
              <Button type="submit">Search</Button>
              <Button type="button" variant="secondary" onClick={clearFilters} disabled={!hasFilters}>Clear</Button>
            </div>
          </div>
        </div>
      </form>

      {loadError && (
        <Alert variant={isForbidden ? 'warning' : 'danger'} className="mb-4" aria-live="polite">
          <h2 className="h3">{isForbidden ? 'Access Denied' : 'Unable to Load Users'}</h2>
          <p className="mb-2">{isForbidden ? 'You do not have permission to manage users.' : 'The user list could not be loaded.'}</p>
          {!isForbidden && <Button type="button" onClick={() => setRetry(value => value + 1)}>Retry</Button>}
        </Alert>
      )}

      {isLoading && <div className="card shadow-sm p-5 text-center" role="status" aria-live="polite"><div className="spinner-border mx-auto mb-3" /><p className="mb-0">Loading users...</p></div>}

      {!isLoading && !loadError && users.length === 0 && (
        <div className="card shadow-sm p-5 text-center" role="status">
          <h2 className="h3">No users found</h2>
          <p className="mb-0" style={{ color: 'var(--text-secondary)' }}>{hasFilters ? 'Try changing your search or role filter.' : 'Create the first user to get started.'}</p>
        </div>
      )}

      {!isLoading && !loadError && users.length > 0 && (
        <>
          <div className="user-management-table-wrap card shadow-sm" role="region" aria-label="User list">
            <table className="table align-middle mb-0 user-management-table">
              <thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col"><span className="visually-hidden">Edit</span></th></tr></thead>
              <tbody>{users.map(managedUser => (
                <tr key={managedUser.id}>
                  <td>{managedUser.name}</td>
                  <td className="user-management-email">{managedUser.email}</td>
                  <td>{ROLE_LABELS[managedUser.role]}</td>
                  <td><UserStatus isActive={managedUser.isActive} /></td>
                  <td className="text-end"><Button type="button" variant="secondary" onClick={() => openEdit(managedUser)}>Edit</Button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="user-management-cards" aria-label="User list cards">
            {users.map(managedUser => <UserCard key={managedUser.id} user={managedUser} onEdit={openEdit} />)}
          </div>
        </>
      )}

      {panelMode && (
        <section className="card shadow-sm mt-4 user-management-panel" aria-labelledby="user-management-panel-title">
          <div className="card-body p-3 p-md-4">
            <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
              <div>
                <h2 id="user-management-panel-title" className="h3 mb-1">{panelMode === 'create' ? 'Create user' : 'Edit user'}</h2>
                <p className="mb-0" style={{ color: 'var(--text-secondary)' }}>{panelMode === 'create' ? 'Set an initial password that the user must change at next login.' : `Editing ${selectedUser?.email ?? 'selected user'}.`}</p>
              </div>
              <Button type="button" variant="secondary" onClick={closePanel}>Close</Button>
            </div>

            {formMessage && <Alert variant={formMessage.includes('successfully') || formMessage.includes('set.') ? 'success' : 'danger'} aria-live="polite">{formMessage}</Alert>}
            {panelMode === 'edit' && selectedUser?.id === currentUser?.id && <Alert variant="warning" role="status">You cannot deactivate your own account.</Alert>}
            <Alert variant="warning" role="status">The last active Administrator cannot be deactivated or demoted. Tickets are unassigned when an owner becomes inactive or a Requester.</Alert>

            <form onSubmit={handleSave} noValidate>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="managed-user-name">Name <span className="required-asterisk" aria-hidden="true">*</span></label>
                  <input id="managed-user-name" className={`form-control ${formErrors.name ? 'is-invalid' : ''}`} value={form.name} onChange={event => updateForm('name', event.target.value)} aria-required="true" aria-invalid={Boolean(formErrors.name)} aria-describedby={formErrors.name ? 'managed-user-name-error' : undefined} />
                  {formErrors.name && <div id="managed-user-name-error" className="invalid-feedback-custom mt-1" role="alert">{formErrors.name}</div>}
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="managed-user-email">Email <span className="required-asterisk" aria-hidden="true">*</span></label>
                  <input id="managed-user-email" type="email" className={`form-control ${formErrors.email ? 'is-invalid' : ''}`} value={form.email} onChange={event => updateForm('email', event.target.value)} aria-required="true" aria-invalid={Boolean(formErrors.email)} aria-describedby={formErrors.email ? 'managed-user-email-error' : undefined} />
                  {formErrors.email && <div id="managed-user-email-error" className="invalid-feedback-custom mt-1" role="alert">{formErrors.email}</div>}
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="managed-user-role">Role <span className="required-asterisk" aria-hidden="true">*</span></label>
                  <select id="managed-user-role" className={`form-select ${formErrors.role ? 'is-invalid' : ''}`} value={form.role} onChange={event => updateForm('role', event.target.value as UserRole)} aria-required="true" aria-invalid={Boolean(formErrors.role)}>
                    {ROLES.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                  </select>
                  {formErrors.role && <div className="invalid-feedback-custom mt-1" role="alert">{formErrors.role}</div>}
                </div>
                <div className="col-12 col-md-6 d-flex align-items-center">
                  <div className="form-check mt-md-3">
                    <input id="managed-user-active" type="checkbox" className={`form-check-input ${formErrors.isActive ? 'is-invalid' : ''}`} checked={form.isActive} onChange={event => updateForm('isActive', event.target.checked)} disabled={panelMode === 'edit' && selectedUser?.id === currentUser?.id} aria-describedby={formErrors.isActive ? 'managed-user-active-error' : undefined} />
                    <label className="form-check-label" htmlFor="managed-user-active">Account active</label>
                    {formErrors.isActive && <div id="managed-user-active-error" className="invalid-feedback-custom mt-1" role="alert">{formErrors.isActive}</div>}
                  </div>
                </div>
                {panelMode === 'create' && <div className="col-12">
                  <label className="form-label" htmlFor="managed-user-initial-password">Initial password <span className="required-asterisk" aria-hidden="true">*</span></label>
                  <input id="managed-user-initial-password" type="password" autoComplete="new-password" className={`form-control ${formErrors.initialPassword ? 'is-invalid' : ''}`} value={form.initialPassword} onChange={event => updateForm('initialPassword', event.target.value)} aria-required="true" aria-invalid={Boolean(formErrors.initialPassword)} aria-describedby="managed-user-password-help" />
                  <div id="managed-user-password-help" className="form-text">12–128 characters, three character classes, and no whitespace.</div>
                  {formErrors.initialPassword && <div className="invalid-feedback-custom mt-1" role="alert">{formErrors.initialPassword}</div>}
                </div>}
              </div>
              <div className="d-flex flex-column flex-sm-row gap-2 mt-4">
                <Button type="submit" isLoading={isSaving}>{panelMode === 'create' ? 'Create user' : 'Save changes'}</Button>
                <Button type="button" variant="secondary" onClick={closePanel} disabled={isSaving}>Cancel</Button>
              </div>
            </form>

            {panelMode === 'edit' && selectedUser && <div className="user-management-reset border-top mt-4 pt-4">
              <h3 className="h4">Set Initial Password</h3>
              <p className="form-text">Existing sessions are revoked and the user must change this password at the next login. Password values are never displayed.</p>
              <label className="form-label" htmlFor="managed-user-reset-password">New initial password <span className="required-asterisk" aria-hidden="true">*</span></label>
              <input id="managed-user-reset-password" type="password" autoComplete="new-password" className={`form-control ${resetError ? 'is-invalid' : ''}`} value={resetPassword} onChange={event => { setResetPassword(event.target.value); setResetError(null); }} aria-required="true" aria-invalid={Boolean(resetError)} aria-describedby="managed-user-reset-help" />
              <div id="managed-user-reset-help" className="form-text">The shared password policy applies.</div>
              {resetError && <div className="invalid-feedback-custom mt-1" role="alert">{resetError}</div>}
              <Button type="button" className="mt-2" onClick={() => void handleResetPassword()} isLoading={isResetting}>Set Initial Password</Button>
            </div>}
          </div>
        </section>
      )}
    </section>
  );
}

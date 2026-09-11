import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { ApiError, useAuth } from '../contexts/AuthContext';
import { validatePasswordInput } from '../utils/password';

export const ChangePassword: React.FC = () => {
  const { user, isLoading, changePassword } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) navigate('/login', { replace: true });
  }, [isLoading, navigate, user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors: Record<string, string> = {};
    if (!currentPassword) nextErrors.currentPassword = 'Enter your current password';
    const newPasswordError = validatePasswordInput(newPassword);
    if (newPasswordError) nextErrors.newPassword = newPasswordError;
    if (newPassword !== confirmPassword) nextErrors.confirmPassword = 'Passwords do not match';
    setErrors(nextErrors);
    setApiError(null);
    setSuccess(false);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      setSuccess(true);
      window.setTimeout(() => navigate('/login', { replace: true }), 700);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CURRENT_PASSWORD_INVALID') {
        setApiError('Current password is incorrect.');
      } else if (error instanceof ApiError && error.code === 'INVALID_PASSWORD') {
        setApiError('The new password does not meet the password policy.');
      } else {
        setApiError('Unable to change password. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <main className="container py-5 text-center"><h1>Loading...</h1></main>;
  if (!user) return null;

  return (
    <main className="container py-5" style={{ maxWidth: '640px' }}>
      <div className="card shadow-sm border-0">
        <div className="card-body p-4 p-md-5">
          <h1 className="mb-2">Change your password</h1>
          <p className="text-muted">A new password is required before you can use TokTickIT.</p>
          <p className="form-text mb-4">12–128 characters, at least three of lowercase, uppercase, digit, and special characters, with no whitespace.</p>
          {apiError && <Alert>{apiError}</Alert>}
          {success && <Alert variant="success" aria-live="polite">Password changed. Please sign in again.</Alert>}
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="current-password" className="form-label">Current password <span className="required-asterisk" aria-hidden="true">*</span></label>
              <input id="current-password" type="password" className={`form-control ${errors.currentPassword ? 'is-invalid' : ''}`} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} aria-required="true" aria-invalid={Boolean(errors.currentPassword)} autoComplete="current-password" />
              {errors.currentPassword && <div className="invalid-feedback-custom mt-1" role="alert">{errors.currentPassword}</div>}
            </div>
            <div className="mb-3">
              <label htmlFor="new-password" className="form-label">New password <span className="required-asterisk" aria-hidden="true">*</span></label>
              <input id="new-password" type="password" className={`form-control ${errors.newPassword ? 'is-invalid' : ''}`} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} aria-required="true" aria-invalid={Boolean(errors.newPassword)} autoComplete="new-password" />
              {errors.newPassword && <div className="invalid-feedback-custom mt-1" role="alert">{errors.newPassword}</div>}
            </div>
            <div className="mb-4">
              <label htmlFor="confirm-password" className="form-label">Confirm new password <span className="required-asterisk" aria-hidden="true">*</span></label>
              <input id="confirm-password" type="password" className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} aria-required="true" aria-invalid={Boolean(errors.confirmPassword)} autoComplete="new-password" />
              {errors.confirmPassword && <div className="invalid-feedback-custom mt-1" role="alert">{errors.confirmPassword}</div>}
            </div>
            <Button type="submit" isLoading={isSubmitting} disabled={success}>Change password</Button>
          </form>
        </div>
      </div>
    </main>
  );
};

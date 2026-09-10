import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { ApiError, useAuth } from '../contexts/AuthContext';

function validateEmail(value: string): string | undefined {
  if (!value) return 'Enter your email address';
  if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
  return undefined;
}

function validatePassword(value: string): string | undefined {
  if (value.length < 12 || value.length > 128) return 'Password must be between 12 and 128 characters';
  if (/\s|\p{Cc}/u.test(value)) return 'Password must not contain whitespace or control characters';
  if ([/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(value)).length < 3) {
    return 'Password must contain at least three character classes';
  }
  return undefined;
}

export const Login: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.mustChangePassword) navigate('/change-password', { replace: true });
  }, [navigate, user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    const normalizedEmail = email.trim().toLowerCase();
    const nextErrors: Record<string, string> = {};
    const emailError = validateEmail(normalizedEmail);
    const passwordError = validatePassword(password);
    if (emailError) nextErrors.email = emailError;
    if (passwordError) nextErrors.password = passwordError;
    setErrors(nextErrors);
    setApiError(null);
    setSuccess(false);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const loggedInUser = await login(normalizedEmail, password);
      if (loggedInUser.mustChangePassword) navigate('/change-password', { replace: true });
      else setSuccess(true);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'LOGIN_COOLDOWN') {
        setApiError('Too many attempts. Please try again later.');
      } else {
        setApiError('Email or password is incorrect.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="container py-5" style={{ maxWidth: '560px' }}>
      <div className="card shadow-sm border-0">
        <div className="card-body p-4 p-md-5">
          <h1 className="text-center mb-2 text-success fw-bold">TokTickIT</h1>
          <p className="text-center text-muted mb-4">Sign in to your support portal</p>
          {apiError && <Alert>{apiError}</Alert>}
          {success && <Alert variant="success" aria-live="polite">Signed in successfully.</Alert>}
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="login-email" className="form-label">Email <span className="required-asterisk" aria-hidden="true">*</span></label>
              <input
                id="login-email"
                name="email"
                type="email"
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                value={email}
                onChange={(event) => { setEmail(event.target.value); setErrors((current) => ({ ...current, email: '' })); }}
                aria-required="true"
                aria-invalid={Boolean(errors.email)}
                autoComplete="username"
              />
              {errors.email && <div className="invalid-feedback-custom mt-1" role="alert">{errors.email}</div>}
            </div>
            <div className="mb-4">
              <label htmlFor="login-password" className="form-label">Password <span className="required-asterisk" aria-hidden="true">*</span></label>
              <input
                id="login-password"
                name="password"
                type="password"
                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                value={password}
                onChange={(event) => { setPassword(event.target.value); setErrors((current) => ({ ...current, password: '' })); }}
                aria-required="true"
                aria-invalid={Boolean(errors.password)}
                autoComplete="current-password"
              />
              {errors.password && <div className="invalid-feedback-custom mt-1" role="alert">{errors.password}</div>}
            </div>
            <div className="d-grid">
              <Button type="submit" isLoading={isSubmitting}>Sign in</Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};

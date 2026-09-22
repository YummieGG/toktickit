import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

interface RouteStateProps {
  title: string;
  message: string;
  linkTo: string;
  linkLabel: string;
  variant?: 'warning' | 'danger';
}

function RouteState({ title, message, linkTo, linkLabel, variant = 'warning' }: RouteStateProps) {
  return (
    <main className="container py-5" style={{ maxWidth: '720px' }}>
      <div className={`alert alert-${variant} text-center p-4`} role="alert">
        <h1 className="h2 mb-2">{title}</h1>
        <p className="mb-3">{message}</p>
        <Link className="btn btn-zen-secondary" to={linkTo}>
          {linkLabel}
        </Link>
      </div>
    </main>
  );
}

export function ForbiddenPage({ homePath }: { homePath: string }) {
  return (
    <RouteState
      title="Access Denied"
      message="You do not have permission to view this page."
      linkTo={homePath}
      linkLabel="Go to My Workspace"
    />
  );
}

export function NotFoundPage({ homePath }: { homePath: string }) {
  return (
    <RouteState
      title="Page Not Found"
      message="The requested page could not be found."
      linkTo={homePath}
      linkLabel="Go to My Workspace"
    />
  );
}

export function FeaturePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <section className="card shadow-sm p-4 p-md-5 text-center" aria-labelledby="feature-placeholder-title">
      <h1 id="feature-placeholder-title" className="h2">{title}</h1>
      <p className="mb-0" style={{ color: 'var(--text-secondary)' }}>{description}</p>
    </section>
  );
}

export function RouteStateRetry({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <main className="container py-5 text-center">
      <div className="alert alert-danger" role="alert">
        <h1 className="h2">{title}</h1>
        <p>{message}</p>
        <Button type="button" onClick={onRetry}>Retry</Button>
      </div>
    </main>
  );
}

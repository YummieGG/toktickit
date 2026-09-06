import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { Alert } from '../../src/components/ui/Alert';

describe('Alert Component (ui-spec.md §1, Issue #14)', () => {
  it('renders the default danger variant', () => {
    render(<Alert>Something went wrong</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('alert', 'alert-danger');
    expect(alert).toHaveTextContent('Something went wrong');
    expect(alert).not.toHaveAttribute('style');
  });

  it('renders the warning variant', () => {
    render(<Alert variant="warning">Please review your input</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('alert', 'alert-warning');
    expect(alert).toHaveTextContent('Please review your input');
  });

  it('renders the success variant', () => {
    render(<Alert variant="success">Operation completed</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('alert', 'alert-success');
    expect(alert).toHaveTextContent('Operation completed');
  });
});

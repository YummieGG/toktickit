import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { Alert } from '../../src/components/ui/Alert';

describe('Alert Component (ui-spec.md §1, Issue #14)', () => {
  it('renders default danger alert with error tokens', () => {
    render(<Alert>Something went wrong</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('alert', 'alert-danger');
    expect(alert).toHaveTextContent('Something went wrong');
    expect(alert).toHaveStyle({
      color: '#C62828',
      backgroundColor: '#FFEBEE',
      border: '1px solid #C62828',
    });
  });

  it('renders warning variant with warning tokens', () => {
    render(<Alert variant="warning">Please review your input</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('alert', 'alert-warning');
    expect(alert).toHaveTextContent('Please review your input');
    expect(alert).toHaveStyle({
      color: '#E65100',
      backgroundColor: '#FFF3E0',
      border: '1px solid #E65100',
    });
  });

  it('renders success variant with success tokens', () => {
    render(<Alert variant="success">Operation completed</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('alert', 'alert-success');
    expect(alert).toHaveTextContent('Operation completed');
    expect(alert).toHaveStyle({
      color: '#2E7D32',
      backgroundColor: '#E8F5E9',
      border: '1px solid #2E7D32',
    });
  });
});

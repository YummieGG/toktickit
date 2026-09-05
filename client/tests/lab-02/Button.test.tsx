import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { Button } from '../../src/components/ui/Button';

describe('Button Component (ui-spec.md:79)', () => {
  it('renders primary button with green background', () => {
    render(<Button variant="primary">Submit</Button>);
    const button = screen.getByRole('button', { name: 'Submit' });
    expect(button).toHaveStyle({
      backgroundColor: '#006B3C',
    });
    expect(button).not.toBeDisabled();
  });

  it('applies busy state styles with opacity 0.75, pointer-events: none, and spinner (ui-spec.md:79)', () => {
    render(<Button variant="primary" isLoading={true}>Submit</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('is-busy');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveStyle({
      backgroundColor: '#006B3C',
      opacity: '0.75',
      pointerEvents: 'none',
    });
    expect(button.querySelector('.spinner-border')).toBeInTheDocument();
    expect(getComputedStyle(button).backgroundColor).toBe('rgb(0, 107, 60)');
  });
});

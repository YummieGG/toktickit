import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { Badge } from '../../src/components/ui/Badge';

describe('Badge Component (ui-spec.md:192-196)', () => {
  it('renders Priority: LOW badge with pale blue background and dark blue text', () => {
    render(<Badge type="priority" value="LOW" />);
    const badge = screen.getByText('LOW');
    expect(badge).toHaveStyle({
      backgroundColor: '#E3F2FD',
      color: '#0D47A1',
    });
  });

  it('renders Priority: MEDIUM badge with pale yellow background and dark amber text', () => {
    render(<Badge type="priority" value="MEDIUM" />);
    const badge = screen.getByText('MEDIUM');
    expect(badge).toHaveStyle({
      backgroundColor: '#FFF9C4',
      color: '#F57F17',
    });
  });

  it('renders Priority: HIGH badge with pale orange background and dark orange text', () => {
    render(<Badge type="priority" value="HIGH" />);
    const badge = screen.getByText('HIGH');
    expect(badge).toHaveStyle({
      backgroundColor: '#FFE0B2',
      color: '#E65100',
    });
  });

  it('renders Priority: CRITICAL badge with pale red background and dark red text', () => {
    render(<Badge type="priority" value="CRITICAL" />);
    const badge = screen.getByText('CRITICAL');
    expect(badge).toHaveStyle({
      backgroundColor: '#FFCDD2',
      color: '#B71C1C',
    });
  });

  it('renders Status: NEW badge with pale green background, dark green text, and 1px border', () => {
    render(<Badge type="status" value="NEW" />);
    const badge = screen.getByText('NEW');
    expect(badge).toHaveStyle({
      backgroundColor: '#E8F5E9',
      color: '#1B5E20',
      border: '1px solid #A5D6A7',
    });
  });
});

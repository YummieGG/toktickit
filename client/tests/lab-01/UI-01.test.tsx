import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../../src/App';
import React from 'react';

// Mock the global fetch API
global.fetch = vi.fn();

describe('UI-01: TokTickIT heading renders', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders TokTickIT IT Service Desk heading', () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<App />);

    // Check if main heading is rendered
    expect(screen.getByRole('heading', { level: 1, name: /TokTickIT IT Service Desk/i })).toBeInTheDocument();
  });
});

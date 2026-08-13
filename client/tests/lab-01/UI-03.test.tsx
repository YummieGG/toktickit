import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../../src/App';
import React from 'react';

// Mock the global fetch API
global.fetch = vi.fn();

describe('UI-03: API failure displays a useful error message', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('displays an error message when API fails to load categories', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<App />);

    // Wait for the error message to render
    await waitFor(() => {
      expect(screen.getByText('Unable to load categories')).toBeInTheDocument();
    });
  });
});

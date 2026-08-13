import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../../src/App';
import React from 'react';

// Mock the global fetch API
global.fetch = vi.fn();

describe('UI-02: Loading state changes to category list', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows loading state initially, then renders categories', async () => {
    const mockCategories = [
      { id: 1, name: 'Account and Access' },
      { id: 2, name: 'Hardware' },
      { id: 3, name: 'Software' },
      { id: 4, name: 'Network' },
    ];

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockCategories,
    });

    render(<App />);

    // Check if loading state is rendered
    expect(screen.getByText('Loading categories...')).toBeInTheDocument();

    // Wait for the categories to render
    await waitFor(() => {
      expect(screen.queryByText('Loading categories...')).not.toBeInTheDocument();
    });

    // Check if categories are rendered in the list
    expect(screen.getByText('1. Account and Access')).toBeInTheDocument();
    expect(screen.getByText('2. Hardware')).toBeInTheDocument();
    expect(screen.getByText('3. Software')).toBeInTheDocument();
    expect(screen.getByText('4. Network')).toBeInTheDocument();
  });
});

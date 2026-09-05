import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../../src/App';
import React from 'react';

// Mock fetch globally
global.fetch = vi.fn();

describe('Requester Context Feature', () => {
      
  beforeEach(() => {
    vi.resetAllMocks();
    sessionStorage.clear();
    window.history.pushState({}, "", "/");
  });

  it('displays warning text in the App Shell', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<App />);
    expect(screen.getByText('⚠️ This is for testing only, not actual authentication')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Loading requesters...')).not.toBeInTheDocument();
    });
  });

  it('handles loading state and fetches requesters', async () => {
    const mockRequesters = [
      { id: 1, name: 'Somchai Prasert', email: 'somchai@example.com' },
      { id: 2, name: 'Suda Srisawat', email: 'suda@example.com' },
    ];

    (global.fetch as any).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/requesters') {
        return Promise.resolve({ ok: true, json: async () => ({ data: mockRequesters }) });
      }
      if (url === '/api/categories') {
        return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: [],
          pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
        }),
      });
    });

    render(<App />);

    // Initially loading
    expect(screen.getByText('Loading requesters...')).toBeInTheDocument();

    // Wait for fetch to complete and dropdown to appear
    await waitFor(() => {
      expect(screen.queryByText('Loading requesters...')).not.toBeInTheDocument();
    });

    // Verify dropdown contains options
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Somchai Prasert (somchai@example.com)')).toBeInTheDocument();
  });

  it('saves selected requester to context and navigates to tickets', async () => {
    const mockRequesters = [
      { id: 1, name: 'Somchai Prasert', email: 'somchai@example.com' }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockRequesters }),
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    // Select requester
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
    
    // Click continue
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // Should navigate and display requester name in App Shell
    await waitFor(() => {
      expect(screen.getByText('Logged in as: Somchai Prasert')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Change Requester' })).toBeInTheDocument();
    });
    
    // Should show the selected requester's ticket list.
    expect(screen.getByRole('heading', { name: 'My Tickets' })).toBeInTheDocument();
  });

  it('handles error state', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network Error'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Network Error')).toBeInTheDocument();
    });
  });
});

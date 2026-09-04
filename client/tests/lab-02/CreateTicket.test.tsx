import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../../src/App';
import React from 'react';

// Mock fetch globally
global.fetch = vi.fn();

describe('Create Ticket Feature', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    sessionStorage.setItem('toktickit_requester', JSON.stringify({ id: 1, name: 'Somchai Prasert', email: 'somchai@example.com' }));
    window.history.pushState({}, "", "/tickets/create");
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('renders form and loads master data', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 1, name: 'Hardware' }] }) }) // categories
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 2, name: 'Email' }] }) }); // systems

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
      expect(screen.getByText('Hardware')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });
  });

  it('shows frontend validation errors on empty submission', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Summary/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit Ticket' }));

    await waitFor(() => {
      expect(screen.getByText('Category is required')).toBeInTheDocument();
      expect(screen.getByText('Summary must be between 5 and 200 characters')).toBeInTheDocument();
      expect(screen.getByText('Description must be between 10 and 2000 characters')).toBeInTheDocument();
    });
    
    // API should not have been called
    expect(global.fetch).toHaveBeenCalledTimes(2); // Only the 2 initial loads
  });

  it('submits successfully and shows ticket number, and allows creating another ticket', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 1, name: 'Hardware' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 2, name: 'Email' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { ticketNumber: 'TK-0005' } }) }); // POST response

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Summary/), { target: { value: 'My issue summary' } });
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'Detailed description of the issue' } });

    fireEvent.click(screen.getByRole('button', { name: 'Submit Ticket' }));

    await waitFor(() => {
      expect(screen.getByText('Ticket Created Successfully')).toBeInTheDocument();
      expect(screen.getByText('TK-0005')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'View My Tickets' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Another Ticket' })).toBeInTheDocument();
    });

    // Click Create Another Ticket to verify form reset
    fireEvent.click(screen.getByRole('button', { name: 'Create Another Ticket' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
      expect((screen.getByLabelText(/Summary/) as HTMLInputElement).value).toBe('');
    });
  });
});

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

  it('displays loading state while fetching master data (ui-spec.md §7.2)', async () => {
    let resolveCategories: any;
    const catPromise = new Promise((resolve) => {
      resolveCategories = resolve;
    });

    (global.fetch as any)
      .mockImplementationOnce(() => catPromise)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Loading...' })).toBeInTheDocument();

    resolveCategories({ ok: true, json: async () => ({ data: [{ id: 1, name: 'Software' }] }) });

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Loading...' })).not.toBeInTheDocument();
      expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
    });
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
      expect(screen.getByText('Priority is required')).toBeInTheDocument();
      expect(screen.getByText('Summary must be between 5 and 200 characters')).toBeInTheDocument();
      expect(screen.getByText('Description must be between 10 and 2000 characters')).toBeInTheDocument();
    });
    
    // API should not have been called
    expect(global.fetch).toHaveBeenCalledTimes(2); // Only the 2 initial loads
  });

  it('submits successfully using FormData and shows ticket number, and allows creating another ticket', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 1, name: 'Hardware' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 2, name: 'Email' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { ticketNumber: 'TK-0005' } }) }); // POST response

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Priority/), { target: { value: 'LOW' } });
    fireEvent.change(screen.getByLabelText(/Summary/), { target: { value: 'My issue summary' } });
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'Detailed description of the issue' } });

    fireEvent.click(screen.getByRole('button', { name: 'Submit Ticket' }));

    await waitFor(() => {
      expect(screen.getByText('Ticket Created Successfully')).toBeInTheDocument();
      expect(screen.getByText('TK-0005')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'View My Tickets' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Another Ticket' })).toBeInTheDocument();
    });

    // Verify FormData was used (no Content-Type header — browser sets it automatically)
    const submitCall = (global.fetch as any).mock.calls[2];
    expect(submitCall[0]).toBe('/api/tickets');
    expect(submitCall[1].body).toBeInstanceOf(FormData);

    // Click Create Another Ticket to verify form reset
    fireEvent.click(screen.getByRole('button', { name: 'Create Another Ticket' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
      expect((screen.getByLabelText(/Summary/) as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText(/Priority/) as HTMLSelectElement).value).toBe('');
    });
  });

  it('renders the attachments section with format/size caption (ui-spec §6)', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Choose File/)).toBeInTheDocument();
      expect(screen.getByText('Supported formats: JPG, PNG, WEBP, PDF. Max size: 5 MB per file.')).toBeInTheDocument();
    });
  });

  it('rejects oversized files immediately with inline error (BR-09, ui-spec §6)', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Choose File/)).toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText(/Choose File/) as HTMLInputElement;
    const oversizedFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.png', { type: 'image/png' });
    // Override size since jsdom doesn't compute from content
    Object.defineProperty(oversizedFile, 'size', { value: 6 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    await waitFor(() => {
      expect(screen.getByText(/exceeds the 5 MB limit/)).toBeInTheDocument();
    });
  });

  it('rejects invalid file extensions immediately with inline error (BR-08, ui-spec §6)', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Choose File/)).toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText(/Choose File/) as HTMLInputElement;
    const exeFile = new File(['binary'], 'malware.exe', { type: 'application/x-msdownload' });

    fireEvent.change(fileInput, { target: { files: [exeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/\.exe is not permitted/)).toBeInTheDocument();
    });
  });

  it('accepts valid files and displays them in a list with remove buttons', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Choose File/)).toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText(/Choose File/) as HTMLInputElement;
    const validFile = new File(['data'], 'screenshot.png', { type: 'image/png' });
    Object.defineProperty(validFile, 'size', { value: 1024 * 100 }); // 100 KB

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByText(/screenshot\.png/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Remove screenshot\.png/ })).toBeInTheDocument();
    });

    // Remove the file
    fireEvent.click(screen.getByRole('button', { name: /Remove screenshot\.png/ }));

    await waitFor(() => {
      expect(screen.queryByText(/screenshot\.png/)).not.toBeInTheDocument();
    });
  });

  it('keeps valid files when the same selection also contains an invalid file', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });

    render(<App />);

    const fileInput = await screen.findByLabelText(/Choose File/);
    const validFile = new File(['image'], 'valid.png', { type: 'image/png' });
    const invalidFile = new File(['program'], 'invalid.exe', { type: 'application/x-msdownload' });
    fireEvent.change(fileInput, { target: { files: [validFile, invalidFile] } });

    expect(await screen.findByText(/valid\.png/)).toBeInTheDocument();
    expect(await screen.findByText(/\.exe is not permitted/)).toBeInTheDocument();
    expect(screen.queryByText(/invalid\.exe \(/)).not.toBeInTheDocument();
  });

  it('rejects spoofed file with invalid MIME type even if extension is allowed (api-spec.md:150)', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Choose File/)).toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText(/Choose File/) as HTMLInputElement;
    // An executable file renamed with a .png extension
    const spoofedFile = new File(['fake-binary'], 'image.png', { type: 'application/x-dosexec' });

    fireEvent.change(fileInput, { target: { files: [spoofedFile] } });

    await waitFor(() => {
      expect(screen.getByText(/File type "application\/x-dosexec" is not permitted/)).toBeInTheDocument();
    });
  });

  it('rejects a file with an empty MIME type even if its extension is allowed', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });

    render(<App />);

    const fileInput = await screen.findByLabelText(/Choose File/);
    const unknownTypeFile = new File(['data'], 'image.png', { type: '' });
    fireEvent.change(fileInput, { target: { files: [unknownTypeFile] } });

    expect(await screen.findByText(/File type "" is not permitted/)).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('aria-describedby', 'attachments-error attachments-help');
  });

  it('renders green confirmation banner with success token background on ticket creation (ui-spec.md:99, 23-24)', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 1, name: 'Hardware' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { ticketNumber: 'TK-0007' } }) });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Priority/), { target: { value: 'HIGH' } });
    fireEvent.change(screen.getByLabelText(/Summary/), { target: { value: 'Printer not printing' } });
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'Need help to configure the printer' } });

    fireEvent.click(screen.getByRole('button', { name: 'Submit Ticket' }));

    await waitFor(() => {
      const banner = screen.getByRole('alert');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveStyle({ backgroundColor: '#E8F5E9' });
      expect(screen.getByText('TK-0007')).toBeInTheDocument();
    });
  });

  it('links error message to input via aria-describedby for accessibility (ui-spec.md §4, §9)', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Summary/)).toBeInTheDocument();
    });

    const summaryInput = screen.getByLabelText(/Summary/);
    expect(summaryInput).not.toHaveAttribute('aria-describedby');

    fireEvent.click(screen.getByRole('button', { name: 'Submit Ticket' }));

    await waitFor(() => {
      expect(summaryInput).toHaveAttribute('aria-describedby', 'summary-error');
      const errorDiv = document.getElementById('summary-error');
      expect(errorDiv).toBeInTheDocument();
      expect(errorDiv).toHaveAttribute('role', 'alert');
      expect(errorDiv).toHaveTextContent('Summary must be between 5 and 200 characters');
    });
  });

  it('clears field error immediately when user begins typing (ui-spec.md §7.3)', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Summary/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit Ticket' }));

    await waitFor(() => {
      expect(screen.getByText('Summary must be between 5 and 200 characters')).toBeInTheDocument();
    });

    // User starts typing
    fireEvent.change(screen.getByLabelText(/Summary/), { target: { value: 'Fixing network issues' } });

    await waitFor(() => {
      expect(screen.queryByText('Summary must be between 5 and 200 characters')).not.toBeInTheDocument();
    });
  });

  it('trims leading/trailing whitespace before sending to backend (BR-14, BR-15)', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 1, name: 'Hardware' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { ticketNumber: 'TK-0008' } }) });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Priority/), { target: { value: 'LOW' } });
    fireEvent.change(screen.getByLabelText(/Summary/), { target: { value: '   Trimmed Summary   ' } });
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: '   Detailed description with padding   ' } });

    fireEvent.click(screen.getByRole('button', { name: 'Submit Ticket' }));

    await waitFor(() => {
      expect(screen.getByText('TK-0008')).toBeInTheDocument();
    });

    const submitCall = (global.fetch as any).mock.calls[2];
    const formData = submitCall[1].body as FormData;
    expect(formData.get('summary')).toBe('Trimmed Summary');
    expect(formData.get('description')).toBe('Detailed description with padding');
  });

  it('surfaces non-form backend validation errors in danger banner (ui-spec.md §7.6)', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 1, name: 'Hardware' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Validation failed',
          details: [{ field: 'requesterId', message: 'Requester not found or is inactive' }]
        })
      });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Priority/), { target: { value: 'LOW' } });
    fireEvent.change(screen.getByLabelText(/Summary/), { target: { value: 'Valid Summary Text' } });
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'Valid Description Text Long Enough' } });

    fireEvent.click(screen.getByRole('button', { name: 'Submit Ticket' }));

    await waitFor(() => {
      expect(screen.getByText(/Requester not found or is inactive/)).toBeInTheDocument();
    });
  });
});

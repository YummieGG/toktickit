import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../src/App';

const requester = { id: 7, name: 'Somchai Prasert', email: 'somchai@example.com' };

const ticket = {
  id: 8,
  ticketNumber: 'TK-0008',
  summary: 'VPN access unavailable',
  description: 'VPN disconnects after login.\n\n  Keep this indentation.',
  requestedPriority: 'HIGH',
  currentStatus: 'NEW',
  ticketDate: '2026-09-05T08:30:00.000Z',
  category: { id: 2, name: 'Network' },
  relatedSystem: { id: 3, name: 'VPN Gateway' },
  requester,
  attachments: [
    {
      id: 11,
      originalName: 'vpn error screenshot with a long filename.png',
      mimeType: 'image/png',
      sizeBytes: 204800,
      isRemoved: false,
      removalReason: null,
      removedAt: null,
      createdAt: '2026-09-05T08:35:00.000Z',
    },
    {
      id: 12,
      originalName: 'old-log.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1048576,
      isRemoved: true,
      removalReason: 'Contains outdated information',
      removedAt: '2026-09-05T09:00:00.000Z',
      createdAt: '2026-09-05T08:40:00.000Z',
    },
  ],
  createdAt: '2026-09-05T08:30:00.000Z',
  updatedAt: '2026-09-05T09:00:00.000Z',
};

function jsonResponse(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

describe('Requester Ticket Detail screen', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    sessionStorage.setItem('toktickit_requester', JSON.stringify(requester));
    window.history.pushState({}, '', '/tickets/8');
  });

  it('loads and renders all ticket information as selectable read-only content (UI-20)', async () => {
    global.fetch = vi.fn(() => jsonResponse({ data: ticket }));
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'TK-0008' })).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/tickets/8?requesterId=7',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('NEW')).toBeInTheDocument();
    expect(screen.getByText('2026-09-05 08:30')).toBeInTheDocument();
    expect(screen.queryByText('Last Updated')).not.toBeInTheDocument();
    expect(screen.getByText('Network')).toBeInTheDocument();
    expect(screen.getByText('VPN Gateway')).toBeInTheDocument();
    expect(screen.getByText('VPN access unavailable')).toHaveClass('ticket-detail-summary');
    expect(screen.getByText('Somchai Prasert')).toBeInTheDocument();
    expect(screen.getByText('somchai@example.com')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();

    const description = document.querySelector('.ticket-detail-description');
    expect(description).toHaveTextContent(ticket.description, { normalizeWhitespace: false });
    expect(description).toHaveClass('ticket-detail-description');

    const backLink = screen.getByRole('link', { name: '← Back to My Tickets' });
    expect(backLink).toHaveAttribute('href', '/tickets');
  });

  it('shows active and removed attachment metadata without hiding the audit trail (UI-21, UI-24)', async () => {
    global.fetch = vi.fn(() => jsonResponse({ data: ticket }));
    render(<App />);

    expect(await screen.findByText(/vpn error screenshot with a long filename\.png/)).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText(/image\/png · 200 KB · Uploaded 2026-09-05 08:35/)).toBeInTheDocument();
    expect(screen.getByText(/old-log\.pdf/)).toHaveClass('text-decoration-line-through');
    expect(screen.getByText('Removed')).toBeInTheDocument();
    expect(screen.getByText('Removal reason:').closest('div')).toHaveTextContent('Contains outdated information');
    expect(screen.getByText('Removed at:').closest('div')).toHaveTextContent('2026-09-05 09:00');
    expect(screen.getByText('Removal reason:').closest('.ticket-attachment-removal-details')).toHaveClass(
      'ticket-attachment-removal-details'
    );
    expect(screen.queryByRole('link', { name: /download/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('represents a missing related system and empty attachments clearly', async () => {
    global.fetch = vi.fn(() => jsonResponse({
      data: { ...ticket, relatedSystem: null, attachments: [] },
    }));
    render(<App />);

    expect(await screen.findByText('Not specified')).toBeInTheDocument();
    expect(screen.getByText('No attachments were submitted with this ticket.')).toBeInTheDocument();
  });

  it('shows a centered loading state while ticket data is pending', () => {
    global.fetch = vi.fn(() => new Promise<Response>(() => undefined));
    render(<App />);

    expect(screen.getByText('Loading...', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('returns to requester selection without fetching when requester context is missing', async () => {
    sessionStorage.clear();
    global.fetch = vi.fn();
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Development Login' })).toBeInTheDocument();
    const requestedUrls = vi.mocked(global.fetch).mock.calls.map(call => String(call[0]));
    expect(requestedUrls.some(url => url.startsWith('/api/tickets/'))).toBe(false);
  });

  it('shows a not-found state without rendering ticket content', async () => {
    global.fetch = vi.fn(() => jsonResponse({ error: 'Ticket not found' }, 404));
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Ticket Not Found' })).toBeInTheDocument();
    expect(screen.getByText('The requested ticket could not be found.')).toBeInTheDocument();
    expect(screen.queryByText('VPN access unavailable')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Back to My Tickets/ })).not.toHaveLength(0);
  });

  it('shows a safe unauthorized state without rendering protected data (UI-25)', async () => {
    global.fetch = vi.fn(() => jsonResponse({ error: 'You do not have access to this ticket' }, 403));
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Access Denied' })).toBeInTheDocument();
    expect(screen.getByText('You do not have permission to view this ticket.')).toBeInTheDocument();
    expect(screen.queryByText('TK-0008')).not.toBeInTheDocument();
    expect(screen.queryByText('VPN access unavailable')).not.toBeInTheDocument();
  });

  it('shows an unexpected failure safely and retries without leaving the page', async () => {
    global.fetch = vi.fn()
      .mockImplementationOnce(() => jsonResponse({ error: 'Internal server error' }, 500))
      .mockImplementationOnce(() => jsonResponse({ data: ticket }));
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Unable to Load Ticket' })).toBeInTheDocument();
    expect(screen.getByText('Internal server error')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('heading', { name: 'TK-0008' })).toBeInTheDocument();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  });
});

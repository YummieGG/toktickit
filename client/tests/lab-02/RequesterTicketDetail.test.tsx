import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    const removedItem = screen.getByText(/old-log\.pdf/).closest('li');
    expect(removedItem).not.toBeNull();
    expect(within(removedItem!).queryByRole('button')).not.toBeInTheDocument();
  });

  it('uploads a valid attachment and adds the returned active metadata to the list', async () => {
    global.fetch = vi.fn()
      .mockImplementationOnce(() => jsonResponse({ data: ticket }))
      .mockImplementationOnce(() => jsonResponse({
        data: {
          id: 13,
          originalName: 'new-proof.pdf',
          storedName: 'uuid.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 4096,
          isRemoved: false,
          createdAt: '2026-09-06T09:00:00.000Z',
          ticketId: 8,
        },
      }, 201));
    render(<App />);

    const picker = await screen.findByLabelText('Add attachment');
    const file = new File(['proof'], 'new-proof.pdf', { type: 'application/pdf' });
    fireEvent.change(picker, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText('📎 new-proof.pdf')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenLastCalledWith('/api/tickets/8/attachments', expect.objectContaining({
      method: 'POST',
      body: expect.any(FormData),
    }));
  });

  it('shows the Uploading state and disables the picker while upload is pending', async () => {
    let resolveUpload!: (response: Response) => void;
    global.fetch = vi.fn()
      .mockImplementationOnce(() => jsonResponse({ data: ticket }))
      .mockImplementationOnce(() => new Promise<Response>(resolve => { resolveUpload = resolve; }));
    render(<App />);

    const picker = await screen.findByLabelText('Add attachment');
    fireEvent.change(picker, {
      target: { files: [new File(['image'], 'pending.png', { type: 'image/png' })] },
    });

    expect(await screen.findByText('Uploading: pending.png')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Uploading pending.png' })).toBeInTheDocument();
    expect(picker).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeDisabled();

    resolveUpload(await jsonResponse({
      data: {
        id: 13,
        originalName: 'pending.png',
        mimeType: 'image/png',
        sizeBytes: 5,
        isRemoved: false,
        createdAt: '2026-09-06T09:00:00.000Z',
      },
    }, 201));
    await waitFor(() => expect(screen.queryByText('Uploading: pending.png')).not.toBeInTheDocument());
  });

  it('shows a dismissible Invalid state for a client-invalid file without uploading', async () => {
    global.fetch = vi.fn(() => jsonResponse({ data: ticket }));
    render(<App />);

    const picker = await screen.findByLabelText('Add attachment');
    fireEvent.change(picker, {
      target: { files: [new File(['bad'], 'malware.exe', { type: 'application/octet-stream' })] },
    });

    expect(screen.getByText('Invalid: malware.exe')).toBeInTheDocument();
    expect(screen.getByText(/Supported formats/)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('Invalid: malware.exe')).not.toBeInTheDocument();
  });

  it('rejects a file over 5 MB on the client before uploading', async () => {
    global.fetch = vi.fn(() => jsonResponse({ data: ticket }));
    render(<App />);

    const picker = await screen.findByLabelText('Add attachment');
    fireEvent.change(picker, {
      target: { files: [new File([new Uint8Array(5_242_881)], 'large.pdf', { type: 'application/pdf' })] },
    });

    expect(screen.getByText('Invalid: large.pdf')).toBeInTheDocument();
    expect(screen.getByText(/exceeds the 5 MB limit/)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('shows a server HTTP 400 upload failure as a dismissible Invalid state', async () => {
    global.fetch = vi.fn()
      .mockImplementationOnce(() => jsonResponse({ data: ticket }))
      .mockImplementationOnce(() => jsonResponse({
        error: 'Validation failed',
        details: [{ field: 'file', message: 'Maximum 5 active attachments allowed per ticket' }],
      }, 400));
    render(<App />);

    const picker = await screen.findByLabelText('Add attachment');
    fireEvent.change(picker, {
      target: { files: [new File(['image'], 'extra.png', { type: 'image/png' })] },
    });

    expect(await screen.findByText('Invalid: extra.png')).toBeInTheDocument();
    expect(screen.getByText(/Maximum 5 active attachments/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('Invalid: extra.png')).not.toBeInTheDocument();
  });

  it('keeps the picker enabled at five active files and reports the sixth selection as Invalid', async () => {
    const fiveActive = Array.from({ length: 5 }, (_, index) => ({
      ...ticket.attachments[0],
      id: 20 + index,
      originalName: `active-${index + 1}.png`,
    }));
    global.fetch = vi.fn(() => jsonResponse({ data: { ...ticket, attachments: fiveActive } }));
    render(<App />);

    const picker = await screen.findByLabelText('Add attachment');
    expect(picker).toBeEnabled();
    fireEvent.change(picker, {
      target: { files: [new File(['image'], 'sixth.png', { type: 'image/png' })] },
    });

    expect(screen.getByText('Invalid: sixth.png')).toBeInTheDocument();
    expect(screen.getByText(/Maximum 5 active attachments/)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('downloads an active attachment through the owned endpoint', async () => {
    const createObjectUrl = vi.fn(() => 'blob:download');
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectUrl });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    global.fetch = vi.fn()
      .mockImplementationOnce(() => jsonResponse({ data: ticket }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        status: 200,
        blob: async () => new Blob(['downloaded']),
      } as Response));
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Download' }));
    await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith('/api/attachments/11/download?requesterId=7'));
    expect(createObjectUrl).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:download');
  });

  it('changes a failed download into the Unavailable state with no actions', async () => {
    global.fetch = vi.fn()
      .mockImplementationOnce(() => jsonResponse({ data: ticket }))
      .mockImplementationOnce(() => jsonResponse({ error: 'File not found on server' }, 404));
    render(<App />);

    const activeItem = (await screen.findByText(/vpn error screenshot/)).closest('li');
    fireEvent.click(within(activeItem!).getByRole('button', { name: 'Download' }));

    expect(await within(activeItem!).findByText('Unavailable')).toBeInTheDocument();
    expect(within(activeItem!).getByText(/File not found on server/)).toBeInTheDocument();
    expect(within(activeItem!).queryByRole('button')).not.toBeInTheDocument();
  });

  it('requires explicit confirmation and a valid reason before soft removal', async () => {
    global.fetch = vi.fn()
      .mockImplementationOnce(() => jsonResponse({ data: ticket }))
      .mockImplementationOnce(() => jsonResponse({
        data: {
          id: 11,
          originalName: 'vpn error screenshot with a long filename.png',
          isRemoved: true,
          removalReason: 'Uploaded the wrong screenshot',
          removedAt: '2026-09-06T10:00:00.000Z',
        },
      }));
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    const dialog = screen.getByRole('dialog', { name: /Remove vpn error screenshot/ });
    expect(dialog).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove Attachment' }));
    expect(within(dialog).getByText(/between 3 and 500 characters/)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    fireEvent.change(within(dialog).getByLabelText(/Removal reason/), {
      target: { value: '  Uploaded the wrong screenshot  ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove Attachment' }));

    await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith('/api/attachments/11/remove', expect.objectContaining({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requesterId: 7, removalReason: 'Uploaded the wrong screenshot' }),
    })));
    const removedItem = screen.getByText(/vpn error screenshot/).closest('li');
    expect(await within(removedItem!).findByText('Removed')).toBeInTheDocument();
    expect(within(removedItem!).getByText(/Uploaded the wrong screenshot/)).toBeInTheDocument();
    expect(within(removedItem!).queryByRole('button')).not.toBeInTheDocument();
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

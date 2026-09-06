import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../../src/App';

const requester = { id: 7, name: 'Somchai Prasert', email: 'somchai@example.com' };
const ticket = {
  id: 12,
  ticketNumber: 'TK-0012',
  summary: 'VPN access unavailable',
  requestedPriority: 'HIGH',
  currentStatus: 'NEW',
  ticketDate: '2026-09-05T08:30:00.000Z',
  category: { id: 2, name: 'Network' },
  updatedAt: '2026-09-05T08:30:00.000Z',
};

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => body });
}

function mockSuccessfulRequests(totalItems = 12) {
  global.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url === '/api/categories') {
      return jsonResponse({ data: [{ id: 2, name: 'Network' }] }) as Promise<Response>;
    }
    return jsonResponse({
      data: [ticket],
      pagination: { page: url.includes('page=2') ? 2 : 1, pageSize: 10, totalItems, totalPages: Math.ceil(totalItems / 10) },
    }) as Promise<Response>;
  });
}

describe('My Tickets screen', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('toktickit_requester', JSON.stringify(requester));
    window.history.pushState({}, '', '/tickets');
    vi.restoreAllMocks();
  });

  it('renders the required ticket information in desktop and mobile layouts', async () => {
    mockSuccessfulRequests();
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'My Tickets' })).toBeInTheDocument();
    expect(screen.getAllByText('TK-0012')).toHaveLength(2);
    expect(screen.getAllByText('VPN access unavailable')).toHaveLength(2);
    expect(screen.getAllByText('Network')).toHaveLength(3);
    expect(screen.getAllByText('HIGH')).toHaveLength(3);
    expect(screen.getAllByText('NEW')).toHaveLength(3);
    expect(screen.getAllByText('2026-09-05 08:30')).toHaveLength(2);
    const ticketLinks = screen.getAllByRole('link', { name: /TK-0012/ });
    expect(ticketLinks.some(link => link.getAttribute('href') === '/tickets/12')).toBe(true);
    expect(screen.getByText('Showing 1-10 of 12 tickets')).toBeInTheDocument();

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/tickets?requesterId=7&sortBy=ticketDate&sortOrder=desc&page=1&pageSize=10',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('sends search and filters to the API and clears them back to defaults', async () => {
    mockSuccessfulRequests();
    render(<App />);
    await screen.findAllByText('TK-0012');

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'vpn' } });
    fireEvent.submit(screen.getByRole('search'));
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'NEW' } });
    fireEvent.change(screen.getByLabelText('Priority'), { target: { value: 'HIGH' } });

    await waitFor(() => {
      const urls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map(call => String(call[0]));
      expect(urls).toContain(
        '/api/tickets?requesterId=7&sortBy=ticketDate&sortOrder=desc&page=1&pageSize=10&search=vpn&category=2&status=NEW&priority=HIGH'
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Clear Filters' })).not.toBeInTheDocument();
      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/tickets?requesterId=7&sortBy=ticketDate&sortOrder=desc&page=1&pageSize=10',
        expect.any(Object)
      );
    });
  });

  it('renders only the category-filtered records returned by the API', async () => {
    const softwareTicket = {
      ...ticket,
      id: 13,
      ticketNumber: 'TK-0013',
      summary: 'Email client setup',
      category: { id: 3, name: 'Software' },
    };
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/categories') {
        return jsonResponse({ data: [ticket.category, softwareTicket.category] }) as Promise<Response>;
      }
      const data = url.includes('category=2') ? [ticket] : [ticket, softwareTicket];
      return jsonResponse({
        data,
        pagination: { page: 1, pageSize: 10, totalItems: data.length, totalPages: 1 },
      }) as Promise<Response>;
    });
    render(<App />);
    await screen.findAllByText('Email client setup');

    fireEvent.change(screen.getByLabelText('Category'), { target: { value: '2' } });

    await waitFor(() => {
      const rows = Array.from(screen.getByRole('table').querySelectorAll('tbody tr'));
      expect(rows).toHaveLength(1);
      expect(rows[0]).toHaveTextContent('VPN access unavailable');
      expect(screen.queryByText('Email client setup')).not.toBeInTheDocument();
    });
  });

  it('renders only the status-filtered records returned by the API', async () => {
    const resolvedTicket = {
      ...ticket,
      id: 14,
      ticketNumber: 'TK-0014',
      summary: 'Resolved printer issue',
      currentStatus: 'RESOLVED',
    };
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/categories') {
        return jsonResponse({ data: [ticket.category] }) as Promise<Response>;
      }
      const data = url.includes('status=NEW') ? [ticket] : [ticket, resolvedTicket];
      return jsonResponse({
        data,
        pagination: { page: 1, pageSize: 10, totalItems: data.length, totalPages: 1 },
      }) as Promise<Response>;
    });
    render(<App />);
    await screen.findAllByText('Resolved printer issue');

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'NEW' } });

    await waitFor(() => {
      const rows = Array.from(screen.getByRole('table').querySelectorAll('tbody tr'));
      expect(rows).toHaveLength(1);
      expect(rows[0]).toHaveTextContent('VPN access unavailable');
      expect(screen.queryByText('Resolved printer issue')).not.toBeInTheDocument();
    });
  });

  it('changes API sorting, page, and page size from the controls', async () => {
    mockSuccessfulRequests(25);
    render(<App />);
    await screen.findAllByText('TK-0012');

    fireEvent.click(screen.getByRole('button', { name: /^Summary/ }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      '/api/tickets?requesterId=7&sortBy=summary&sortOrder=asc&page=1&pageSize=10',
      expect.any(Object)
    ));

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      '/api/tickets?requesterId=7&sortBy=summary&sortOrder=asc&page=2&pageSize=10',
      expect.any(Object)
    ));

    fireEvent.change(screen.getByLabelText('Per page'), { target: { value: '20' } });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      '/api/tickets?requesterId=7&sortBy=summary&sortOrder=asc&page=1&pageSize=20',
      expect.any(Object)
    ));
  });

  it('keeps pagination controls bounded for large result sets', async () => {
    mockSuccessfulRequests(1000);
    render(<App />);
    await screen.findAllByText('TK-0012');

    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '100' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '50' })).not.toBeInTheDocument();
  });

  it('moves to the last available page when the requested page disappears', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/categories') return jsonResponse({ data: [ticket.category] }) as Promise<Response>;
      if (url.includes('page=3')) {
        return jsonResponse({
          data: [],
          pagination: { page: 3, pageSize: 10, totalItems: 12, totalPages: 2 },
        }) as Promise<Response>;
      }
      if (url.includes('page=2')) {
        return jsonResponse({
          data: [ticket],
          pagination: { page: 2, pageSize: 10, totalItems: 12, totalPages: 2 },
        }) as Promise<Response>;
      }
      return jsonResponse({
        data: [ticket],
        pagination: { page: 1, pageSize: 10, totalItems: 21, totalPages: 3 },
      }) as Promise<Response>;
    });
    render(<App />);
    await screen.findAllByText('TK-0012');

    fireEvent.click(screen.getByRole('button', { name: '3' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tickets?requesterId=7&sortBy=ticketDate&sortOrder=desc&page=2&pageSize=10',
        expect.any(Object)
      );
      expect(screen.getByText('Showing 11-12 of 12 tickets')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page');
    });
  });

  it('renders the filtered and sorted data returned by the API', async () => {
    const alphaTicket = { ...ticket, id: 20, ticketNumber: 'TK-0020', summary: 'Alpha issue' };
    const zuluTicket = { ...ticket, id: 21, ticketNumber: 'TK-0021', summary: 'Zulu issue', requestedPriority: 'LOW' };
    const pageTwoTicket = { ...ticket, id: 22, ticketNumber: 'TK-0022', summary: 'Page two issue' };
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/categories') return jsonResponse({ data: [{ id: 2, name: 'Network' }] }) as Promise<Response>;
      if (url.includes('search=Alpha')) {
        return jsonResponse({ data: [alphaTicket], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } }) as Promise<Response>;
      }
      if (url.includes('page=2')) {
        return jsonResponse({ data: [pageTwoTicket], pagination: { page: 2, pageSize: 10, totalItems: 11, totalPages: 2 } }) as Promise<Response>;
      }
      const data = url.includes('priority=HIGH')
        ? [alphaTicket]
        : url.includes('sortBy=summary')
          ? [alphaTicket, zuluTicket]
          : [zuluTicket, alphaTicket];
      return jsonResponse({
        data,
        pagination: { page: 1, pageSize: 10, totalItems: 11, totalPages: 2 },
      }) as Promise<Response>;
    });
    render(<App />);
    await screen.findByRole('table');

    fireEvent.click(within(screen.getByRole('table')).getByRole('button', { name: /^Summary/ }));
    await waitFor(() => {
      const rows = Array.from(screen.getByRole('table').querySelectorAll('tbody tr'));
      expect(rows[0]).toHaveTextContent('Alpha issue');
      expect(rows[1]).toHaveTextContent('Zulu issue');
    });

    fireEvent.change(screen.getByLabelText('Priority'), { target: { value: 'HIGH' } });
    await waitFor(() => {
      const rows = Array.from(screen.getByRole('table').querySelectorAll('tbody tr'));
      expect(rows).toHaveLength(1);
      expect(rows[0]).toHaveTextContent('Alpha issue');
      expect(rows[0]).not.toHaveTextContent('Zulu issue');
    });

    fireEvent.change(screen.getByLabelText('Priority'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'Alpha' } });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() => {
      const rows = Array.from(screen.getByRole('table').querySelectorAll('tbody tr'));
      expect(rows).toHaveLength(1);
      expect(rows[0]).toHaveTextContent('Alpha issue');
      expect(rows[0]).not.toHaveTextContent('Zulu issue');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' }));
    await waitFor(() => {
      const rows = Array.from(screen.getByRole('table').querySelectorAll('tbody tr'));
      expect(rows).toHaveLength(2);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => {
      const rows = Array.from(screen.getByRole('table').querySelectorAll('tbody tr'));
      expect(rows).toHaveLength(1);
      expect(rows[0]).toHaveTextContent('Page two issue');
      expect(screen.getByText('Showing 11-11 of 11 tickets')).toBeInTheDocument();
    });
  });

  it('distinguishes empty requester data from filtered no-results', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      if (String(input) === '/api/categories') return jsonResponse({ data: [] }) as Promise<Response>;
      return jsonResponse({ data: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } }) as Promise<Response>;
    });
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'No Tickets Submitted Yet' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Create Ticket' }).some(link => link.getAttribute('href') === '/tickets/create')).toBe(true);

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'missing' } });
    fireEvent.submit(screen.getByRole('search'));

    expect(await screen.findByRole('heading', { name: 'No Matching Tickets Found' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear All Filters' })).toBeInTheDocument();
  });

  it('shows an API failure with a working retry action', async () => {
    let ticketRequests = 0;
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      if (String(input) === '/api/categories') return jsonResponse({ data: [] }) as Promise<Response>;
      ticketRequests += 1;
      if (ticketRequests === 1) return jsonResponse({}, false) as Promise<Response>;
      return jsonResponse({ data: [ticket], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } }) as Promise<Response>;
    });
    render(<App />);

    expect(await screen.findByText('Unable to load tickets')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findAllByText('TK-0012')).toHaveLength(2);
    expect(ticketRequests).toBe(2);
  });

  it('resets list state and loads new requester tickets when requester changes without leaking previous data', async () => {
    const requesterB = { id: 8, name: 'Suda Srisawat', email: 'suda@example.com' };
    const ticketB = {
      ...ticket,
      id: 99,
      ticketNumber: 'TK-0099',
      summary: 'Printer setup needed',
      requestedPriority: 'LOW',
    };

    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/requesters') {
        return jsonResponse({ data: [requester, requesterB] }) as Promise<Response>;
      }
      if (url === '/api/categories') {
        return jsonResponse({ data: [{ id: 2, name: 'Network' }] }) as Promise<Response>;
      }
      if (url.includes('requesterId=8')) {
        return jsonResponse({
          data: [ticketB],
          pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
        }) as Promise<Response>;
      }
      return jsonResponse({
        data: [ticket],
        pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
      }) as Promise<Response>;
    });

    render(<App />);
    expect(await screen.findByRole('heading', { name: 'My Tickets' })).toBeInTheDocument();
    await screen.findAllByText('VPN access unavailable');

    fireEvent.click(screen.getByRole('button', { name: 'Change Requester' }));
    expect(await screen.findByRole('heading', { name: 'Development Login' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Select Test Requester/), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('heading', { name: 'My Tickets' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('VPN access unavailable')).not.toBeInTheDocument();
      expect(screen.getByText('Support requests submitted by Suda Srisawat')).toBeInTheDocument();
      expect(screen.getAllByText('Printer setup needed')).toHaveLength(2);
    });

    const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map(call => String(call[0]));
    const lastRequesterCall = fetchCalls.reverse().find(url => url.includes('requesterId=8'));
    expect(lastRequesterCall).toBe(
      '/api/tickets?requesterId=8&sortBy=ticketDate&sortOrder=desc&page=1&pageSize=10'
    );
  });

  it('preserves user-selected pageSize when clear filters is clicked', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/categories') return jsonResponse({ data: [] }) as Promise<Response>;
      return jsonResponse({
        data: [ticket],
        pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
      }) as Promise<Response>;
    });

    render(<App />);
    await screen.findByRole('table');

    // Change page size to 20
    fireEvent.change(screen.getByLabelText('Per page'), { target: { value: '20' } });

    // Enter search to make Clear Filters appear
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'VPN' } });
    fireEvent.submit(screen.getByRole('search'));

    const clearBtn = await screen.findByRole('button', { name: 'Clear Filters' });
    fireEvent.click(clearBtn);

    await waitFor(() => {
      const select = screen.getByLabelText('Per page') as HTMLSelectElement;
      expect(select.value).toBe('20');
      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.stringContaining('pageSize=20'),
        expect.any(Object)
      );
    });
  });
});

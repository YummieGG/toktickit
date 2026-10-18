import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffActionsTaken } from '../../src/pages/StaffActionsTaken';
import { StaffTicketQueue } from '../../src/pages/StaffTicketQueue';
import { AuthContext } from '../../src/contexts/auth';
import type { StaffActionListResponse } from '../../src/types/dashboard';

const staffUser = {
  id: 20,
  name: 'Staff One',
  email: 'staff@example.com',
  role: 'IT_STAFF' as const,
  isActive: true,
  mustChangePassword: false,
};

const mockAuthContext = {
  user: staffUser,
  isLoading: false,
  error: null,
  login: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
  clearError: vi.fn(),
};

const mockActionsResponse: StaffActionListResponse = {
  data: [
    {
      id: 501,
      ticketId: 201,
      description: 'Check auxiliary cooling units in server room',
      status: 'IN_PROGRESS',
      createdAt: '2026-10-18T05:10:00.000Z',
      ticket: {
        id: 201,
        ticketNumber: 'TK-0201',
        summary: 'Data center AC failure',
        currentStatus: 'IN_PROGRESS',
      },
    },
    {
      id: 502,
      ticketId: 202,
      description: 'Verify mailbox quota limits',
      status: 'PENDING',
      createdAt: '2026-10-18T05:20:00.000Z',
      ticket: {
        id: 202,
        ticketNumber: 'TK-0202',
        summary: 'Mailbox full warning',
        currentStatus: 'OPEN',
      },
    },
  ],
  pagination: {
    page: 1,
    pageSize: 10,
    totalItems: 2,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

const mockEmptyResponse: StaffActionListResponse = {
  data: [],
  pagination: {
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

function renderPage(initialSearch = '?assignee=me&statuses=PENDING,IN_PROGRESS&page=1&pageSize=10') {
  window.history.pushState({}, '', `/staff/actions-taken${initialSearch}`);
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <BrowserRouter>
        <StaffActionsTaken />
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

describe('UI-04: Actions Taken Drill-down Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders assigned actions and calls API with URL query params', async () => {
    let requestedUrl = '';
    global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/staff/actions-taken')) {
        requestedUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockActionsResponse,
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage('?assignee=me&statuses=PENDING,IN_PROGRESS&page=1&pageSize=10');

    expect(await screen.findByRole('heading', { name: 'My Actions Taken' })).toBeInTheDocument();
    expect(requestedUrl).toContain('assignee=me');
    expect(requestedUrl).toContain('statuses=PENDING%2CIN_PROGRESS');

    // Rows and links
    expect(screen.getAllByRole('link', { name: 'TK-0201' }).length).toBeGreaterThan(0);
    expect(screen.getByText('Check auxiliary cooling units in server room')).toBeInTheDocument();
    expect(screen.getByText('Verify mailbox quota limits')).toBeInTheDocument();

    const ticketLinks = screen.getAllByRole('link', { name: 'TK-0201' });
    expect(ticketLinks.some((l) => l.getAttribute('href') === '/staff/tickets/201')).toBe(true);
  });

  it('toggles status filters and updates URL search params', async () => {
    global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/staff/actions-taken')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockActionsResponse,
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage('?assignee=me&statuses=PENDING,IN_PROGRESS&page=1&pageSize=10');
    await screen.findByRole('heading', { name: 'My Actions Taken' });

    // Toggle COMPLETED filter
    const completedButton = screen.getByRole('button', { name: 'COMPLETED' });
    fireEvent.click(completedButton);

    await waitFor(() => {
      expect(window.location.search).toContain('COMPLETED');
    });
  });

  it('handles empty state when no actions match filters', async () => {
    global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/staff/actions-taken')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockEmptyResponse,
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage('?assignee=me&statuses=COMPLETED&page=1&pageSize=10');

    expect(await screen.findByText('No actions found matching filters.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear Filters' })).toBeInTheDocument();
  });

  it('handles error state and retries successfully', async () => {
    let attempts = 0;
    global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/staff/actions-taken')) {
        attempts += 1;
        if (attempts === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ error: { message: 'Internal server error' } }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockActionsResponse,
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage('?assignee=me&statuses=PENDING&page=1&pageSize=10');

    expect(await screen.findByText('Internal server error')).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: 'Retry' });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.queryByText('Internal server error')).not.toBeInTheDocument();
      expect(screen.getByText('Check auxiliary cooling units in server room')).toBeInTheDocument();
    });
  });

  it('handles pagination controls and page size updates', async () => {
    const multiPageResponse: StaffActionListResponse = {
      ...mockActionsResponse,
      pagination: {
        page: 1,
        pageSize: 5,
        totalItems: 12,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: false,
      },
    };

    global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/staff/actions-taken')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => multiPageResponse,
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage('?assignee=me&statuses=PENDING,IN_PROGRESS&page=1&pageSize=5');
    await screen.findByRole('heading', { name: 'My Actions Taken' });

    expect(screen.getByText(/Showing\s+1\s*[–-]\s*5\s+of\s+12\s+actions/)).toBeInTheDocument();
    const nextButton = screen.getByRole('button', { name: 'Next' });
    expect(nextButton).toBeEnabled();
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(window.location.search).toContain('page=2');
    });
  });

  it('displays active drilldown filter pills in StaffTicketQueue and clears statuses on single status select', async () => {
    let lastUrl = '';
    global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/categories') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: [{ id: 1, name: 'Network' }] }) });
      }
      if (url.startsWith('/api/staff/tickets')) {
        lastUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              {
                id: 101,
                ticketNumber: 'TK-0101',
                summary: 'VPN disconnects frequently',
                ticketDate: '2026-10-18T05:00:00.000Z',
                category: { id: 1, name: 'Network' },
                requestedPriority: 'HIGH',
                itPriority: 'HIGH',
                currentStatus: 'IN_PROGRESS',
                owner: null,
                requester: { id: 7, name: 'Somchai Prasert', email: 'somchai@example.com' },
                updatedAt: '2026-10-18T05:30:00.000Z',
                problemAppearsResolvedAt: null,
              },
            ],
            pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
          }),
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    window.history.pushState({}, '', '/staff/tickets?ownerId=unassigned&statuses=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED');
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <BrowserRouter>
          <StaffTicketQueue />
        </BrowserRouter>
      </AuthContext.Provider>
    );

    expect(await screen.findByRole('heading', { name: 'Staff Ticket Queue' })).toBeInTheDocument();
    expect(screen.getByText(/Statuses: NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED/)).toBeInTheDocument();
    expect(lastUrl).toContain('statuses=NEW%2COPEN%2CIN_PROGRESS%2CWAITING_FOR_REQUESTER%2CREOPENED');

    // Selecting a single status must clear statuses to avoid 400 conflict
    const statusSelect = screen.getByLabelText('Status');
    fireEvent.change(statusSelect, { target: { value: 'IN_PROGRESS' } });

    await waitFor(() => {
      expect(window.location.search).toContain('status=IN_PROGRESS');
      expect(window.location.search).not.toContain('statuses=');
      expect(lastUrl).toContain('status=IN_PROGRESS');
      expect(lastUrl).not.toContain('statuses=');
    });
  });

  it('dismisses active drilldown filter pill when clicking clear button in StaffTicketQueue', async () => {
    global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/categories') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: [] }) });
      }
      if (url.startsWith('/api/staff/tickets')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            data: [],
            pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
          }),
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    window.history.pushState({}, '', '/staff/tickets?itPriorities=HIGH,CRITICAL');
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <BrowserRouter>
          <StaffTicketQueue />
        </BrowserRouter>
      </AuthContext.Provider>
    );

    expect(await screen.findByRole('heading', { name: 'Staff Ticket Queue' })).toBeInTheDocument();
    const clearPillBtn = screen.getByRole('button', { name: 'Clear IT priorities filter' });
    expect(clearPillBtn).toBeInTheDocument();
    fireEvent.click(clearPillBtn);

    await waitFor(() => {
      expect(window.location.search).not.toContain('itPriorities=');
    });
  });
});

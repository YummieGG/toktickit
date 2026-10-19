import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequesterDashboard } from '../../src/pages/RequesterDashboard';
import { AuthContext } from '../../src/contexts/auth';
import type { RequesterDashboardResponse } from '../../src/types/dashboard';

const requesterUser = {
  id: 7,
  name: 'Somchai Prasert',
  email: 'somchai@example.com',
  role: 'REQUESTER' as const,
  isActive: true,
  mustChangePassword: false,
};

const mockAuthContext = {
  user: requesterUser,
  isLoading: false,
  error: null,
  login: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
  clearError: vi.fn(),
};

const mockDashboardData: RequesterDashboardResponse = {
  metrics: {
    openTickets: 5,
    waitingForYou: 2,
    recentlyUpdated: 4,
    recentlyResolved: 3,
  },
  recentTickets: [
    {
      id: 10,
      ticketNumber: 'TK-0010',
      summary: 'Printer network offline',
      currentStatus: 'IN_PROGRESS',
      itPriority: 'HIGH',
      updatedAt: '2026-10-18T05:30:00.000Z',
      resolvedAt: null,
    },
  ],
  attentionTickets: [
    {
      id: 11,
      ticketNumber: 'TK-0011',
      summary: 'Need clarification on VPN error',
      currentStatus: 'WAITING_FOR_REQUESTER',
      itPriority: 'MEDIUM',
      updatedAt: '2026-10-18T04:15:00.000Z',
      resolvedAt: null,
    },
  ],
  resolvedTickets: [
    {
      id: 9,
      ticketNumber: 'TK-0009',
      summary: 'Monitor resolution',
      currentStatus: 'RESOLVED',
      itPriority: 'LOW',
      updatedAt: '2026-10-17T08:00:00.000Z',
      resolvedAt: '2026-10-17T08:00:00.000Z',
    },
  ],
  generatedAt: '2026-10-18T06:00:00.000Z',
  timezone: 'Asia/Bangkok',
  window: {
    from: '2026-10-12T00:00:00.000+07:00',
    to: '2026-10-18T06:00:00.000+07:00',
  },
  listLimit: 5,
};

const mockEmptyDashboardData: RequesterDashboardResponse = {
  metrics: {
    openTickets: 0,
    waitingForYou: 0,
    recentlyUpdated: 0,
    recentlyResolved: 0,
  },
  recentTickets: [],
  attentionTickets: [],
  resolvedTickets: [],
  generatedAt: '2026-10-18T06:00:00.000Z',
  timezone: 'Asia/Bangkok',
  window: {
    from: '2026-10-12T00:00:00.000+07:00',
    to: '2026-10-18T06:00:00.000+07:00',
  },
  listLimit: 5,
};

function renderDashboard() {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <BrowserRouter>
        <RequesterDashboard />
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

describe('UI-03: Requester Dashboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders 4 metric cards with authoritative counts and drill-down links', async () => {
    global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/dashboards/requester') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockDashboardData,
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderDashboard();

    expect(await screen.findByRole('heading', { name: 'Requester Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    const openLink = screen.getByRole('link', { name: 'View Open Tickets' });
    expect(openLink).toHaveAttribute(
      'href',
      '/tickets?statuses=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED'
    );

    const waitingLink = screen.getByRole('link', { name: 'View Waiting Tickets' });
    expect(waitingLink).toHaveAttribute('href', '/tickets?statuses=WAITING_FOR_REQUESTER');

    const updatedLink = screen.getByRole('link', { name: 'View Updated' });
    expect(updatedLink.getAttribute('href')).toContain('/tickets?updatedFrom=');
    expect(updatedLink.getAttribute('href')).toContain('sortBy=updatedAt');

    const resolvedLink = screen.getByRole('link', { name: 'View Resolved' });
    expect(resolvedLink.getAttribute('href')).toContain('/tickets?statuses=RESOLVED,CLOSED');
    expect(resolvedLink.getAttribute('href')).toContain('sortBy=resolvedAt');
  });

  it('renders preview lists with ticket links and badges', async () => {
    global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/dashboards/requester') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockDashboardData,
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderDashboard();

    expect(await screen.findByRole('heading', { name: 'Requester Dashboard' })).toBeInTheDocument();

    // Tickets in lists
    expect(screen.getByRole('link', { name: 'TK-0010' })).toHaveAttribute('href', '/tickets/10');
    expect(screen.getByRole('link', { name: 'TK-0011' })).toHaveAttribute('href', '/tickets/11');
    expect(screen.getByRole('link', { name: 'TK-0009' })).toHaveAttribute('href', '/tickets/9');

    expect(screen.getByText('Printer network offline')).toBeInTheDocument();
    expect(screen.getByText('Need clarification on VPN error')).toBeInTheDocument();
    expect(screen.getByText('Monitor resolution')).toBeInTheDocument();
  });

  it('handles zero states with 0 metric counts and empty preview messages', async () => {
    global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/dashboards/requester') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockEmptyDashboardData,
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderDashboard();

    expect(await screen.findByRole('heading', { name: 'Requester Dashboard' })).toBeInTheDocument();
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(4);

    expect(screen.getByText('No tickets currently waiting for your attention.')).toBeInTheDocument();
    expect(screen.getByText('No recent tickets found.')).toBeInTheDocument();
    expect(screen.getByText('No recently resolved tickets found.')).toBeInTheDocument();
  });

  it('displays error banner and retries successfully', async () => {
    let attempts = 0;
    global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/dashboards/requester') {
        attempts += 1;
        if (attempts === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ error: { message: 'Database temporarily unavailable' } }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockDashboardData,
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderDashboard();

    expect(await screen.findByText('Database temporarily unavailable')).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: 'Retry' });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.queryByText('Database temporarily unavailable')).not.toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });
});

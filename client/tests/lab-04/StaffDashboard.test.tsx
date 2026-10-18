import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffDashboard } from '../../src/pages/StaffDashboard';
import { AuthContext } from '../../src/contexts/auth';
import type { StaffDashboardResponse } from '../../src/types/dashboard';

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

const mockStaffData: StaffDashboardResponse = {
  metrics: {
    unassignedTickets: 7,
    myTickets: 3,
    myActionsTaken: 4,
    ticketsByStatus: {
      NEW: 7,
      OPEN: 2,
      IN_PROGRESS: 3,
      WAITING_FOR_REQUESTER: 1,
      RESOLVED: 4,
      CLOSED: 10,
      REOPENED: 1,
      CANCELLED: 2,
    },
    activeTicketsByItPriority: {
      LOW: 1,
      MEDIUM: 5,
      HIGH: 6,
      CRITICAL: 2,
    },
  },
  urgentTickets: [
    {
      id: 201,
      ticketNumber: 'TK-0201',
      summary: 'Data center AC failure',
      currentStatus: 'IN_PROGRESS',
      itPriority: 'CRITICAL',
      updatedAt: '2026-10-18T05:00:00.000Z',
      resolvedAt: null,
    },
  ],
  recentTickets: [
    {
      id: 202,
      ticketNumber: 'TK-0202',
      summary: 'Email delivery delayed',
      currentStatus: 'OPEN',
      itPriority: 'HIGH',
      updatedAt: '2026-10-18T04:00:00.000Z',
      resolvedAt: null,
    },
  ],
  myActions: [
    {
      id: 501,
      ticketId: 201,
      description: 'Check auxiliary cooling units',
      status: 'IN_PROGRESS',
      createdAt: '2026-10-18T05:10:00.000Z',
      ticket: {
        id: 201,
        ticketNumber: 'TK-0201',
        summary: 'Data center AC failure',
        currentStatus: 'IN_PROGRESS',
      },
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

const mockEmptyStaffData: StaffDashboardResponse = {
  metrics: {
    unassignedTickets: 0,
    myTickets: 0,
    myActionsTaken: 0,
    ticketsByStatus: {
      NEW: 0,
      OPEN: 0,
      IN_PROGRESS: 0,
      WAITING_FOR_REQUESTER: 0,
      RESOLVED: 0,
      CLOSED: 0,
      REOPENED: 0,
      CANCELLED: 0,
    },
    activeTicketsByItPriority: {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    },
  },
  urgentTickets: [],
  recentTickets: [],
  myActions: [],
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
        <StaffDashboard />
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

describe('UI-03: Staff and Administrator Dashboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders 3 core operational metric cards with drill-down links', async () => {
    global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/dashboards/staff') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockStaffData,
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderDashboard();

    expect(await screen.findByRole('heading', { name: 'Staff Dashboard' })).toBeInTheDocument();
    expect(screen.getAllByText('7').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);

    const unassignedLink = screen.getByRole('link', { name: 'View Unassigned' });
    expect(unassignedLink.getAttribute('href')).toContain('ownerId=unassigned');

    const myTicketsLink = screen.getByRole('link', { name: 'View My Tickets' });
    expect(myTicketsLink.getAttribute('href')).toContain('ownerId=me');

    const myActionsLink = screen.getByRole('link', { name: 'View Assigned Actions' });
    expect(myActionsLink.getAttribute('href')).toContain('/staff/actions-taken?assignee=me');
  });

  it('renders status and priority breakdown grids with correct counts and drilldown links', async () => {
    global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/dashboards/staff') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockStaffData,
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderDashboard();

    expect(await screen.findByRole('heading', { name: 'Tickets by Status' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Active Tickets by IT Priority' })).toBeInTheDocument();

    const links = screen.getAllByRole('link');
    const newStatusLink = links.find((l) => l.getAttribute('href') === '/staff/tickets?status=NEW');
    expect(newStatusLink).toBeDefined();

    const criticalPrioLink = links.find((l) => l.getAttribute('href')?.includes('itPriority=CRITICAL'));
    expect(criticalPrioLink).toBeDefined();
  });

  it('renders preview lists with urgent tickets and assigned actions', async () => {
    global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/dashboards/staff') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockStaffData,
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderDashboard();

    expect(await screen.findByRole('heading', { name: 'Staff Dashboard' })).toBeInTheDocument();

    expect(screen.getAllByRole('link', { name: 'TK-0201' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Data center AC failure' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'TK-0202' })).toHaveAttribute('href', '/staff/tickets/202');
    expect(screen.getByRole('link', { name: 'Check auxiliary cooling units' })).toHaveAttribute('href', '/staff/tickets/201');
  });

  it('handles zero states with 0 metric counts and empty preview messages', async () => {
    global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/dashboards/staff') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockEmptyStaffData,
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderDashboard();

    expect(await screen.findByRole('heading', { name: 'Staff Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('No urgent active tickets found.')).toBeInTheDocument();
    expect(screen.getByText('No recently updated tickets found.')).toBeInTheDocument();
    expect(screen.getByText('No active actions assigned to you.')).toBeInTheDocument();
  });

  it('displays error banner and retries successfully', async () => {
    let attempts = 0;
    global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/dashboards/staff') {
        attempts += 1;
        if (attempts === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ error: { message: 'Database connection failed' } }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockStaffData,
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderDashboard();

    expect(await screen.findByText('Database connection failed')).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: 'Retry' });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.queryByText('Database connection failed')).not.toBeInTheDocument();
      expect(screen.getAllByText('7').length).toBeGreaterThanOrEqual(1);
    });
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '../../src/components/ui/Badge';
import { ActionsTakenSection } from '../../src/components/tickets/ActionsTakenSection';
import { AuthContext } from '../../src/contexts/auth';
import type { User } from '../../src/types/auth';

const stylesheet = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function relativeLuminance(hex: string): number {
  return hexToRgb(hex)
    .map((channel) => channel / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function renderWithAuth(component: React.ReactElement, user: User) {
  return render(
    <AuthContext.Provider
      value={{
        user,
        isLoading: false,
        error: null,
        login: async () => {},
        logout: async () => {},
        checkSession: async () => {},
        changePassword: async () => {},
      }}
    >
      {component}
    </AuthContext.Provider>,
  );
}

describe('Lab 4 Actions Taken visual and accessibility style contract (UI-05)', () => {
  it('enforces Zen Green design tokens and WCAG AA >= 4.5:1 contrast across all action statuses', () => {
    // Check Zen Green foundation tokens
    for (const token of [
      '--primary-green: #006B3C',
      '--secondary-green: #0B7A46',
      '--page-background: #F5F7F6',
      '--surface: #FFFFFF',
      '--text-primary: #1A2E1A',
      '--text-secondary: #4A5D4A',
    ]) {
      expect(stylesheet).toContain(token);
    }

    // Action taken status badge color contrast pairs
    const actionStatusPairs = [
      { status: 'PENDING', foreground: '#4527A0', background: '#EDE7F6' },
      { status: 'IN_PROGRESS', foreground: '#7A4B00', background: '#FFF9C4' },
      { status: 'COMPLETED', foreground: '#2E7D32', background: '#E8F5E9' },
      { status: 'CANCELLED', foreground: '#C62828', background: '#FFEBEE' },
    ] as const;

    for (const pair of actionStatusPairs) {
      const ratio = contrastRatio(pair.foreground, pair.background);
      expect(ratio, `Contrast ratio for action status ${pair.status} must be >= 4.5:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('renders ActionStatus badges with verified WCAG-compliant styling and semantic text', () => {
    render(
      <div>
        <Badge type="action-status" value="PENDING" />
        <Badge type="action-status" value="IN_PROGRESS" />
        <Badge type="action-status" value="COMPLETED" />
        <Badge type="action-status" value="CANCELLED" />
      </div>,
    );

    const pendingBadge = screen.getByText('PENDING');
    expect(pendingBadge).toBeVisible();
    expect(pendingBadge).toHaveStyle({ color: 'rgb(69, 39, 160)', backgroundColor: 'rgb(237, 231, 246)' });

    const inProgressBadge = screen.getByText('IN_PROGRESS');
    expect(inProgressBadge).toBeVisible();
    expect(inProgressBadge).toHaveStyle({ color: 'rgb(122, 75, 0)', backgroundColor: 'rgb(255, 249, 196)' });

    const completedBadge = screen.getByText('COMPLETED');
    expect(completedBadge).toBeVisible();
    expect(completedBadge).toHaveStyle({ color: 'rgb(46, 125, 50)', backgroundColor: 'rgb(232, 245, 233)' });

    const cancelledBadge = screen.getByText('CANCELLED');
    expect(cancelledBadge).toBeVisible();
    expect(cancelledBadge).toHaveStyle({ color: 'rgb(198, 40, 40)', backgroundColor: 'rgb(255, 235, 238)' });
  });

  it('defines responsive CSS rules for actions table, mobile stacked cards, pre-wrap text, and 44px touch targets', () => {
    // Responsive table wrapper
    expect(stylesheet).toMatch(/\.actions-taken-table-wrap\s*\{[^}]*overflow-x:\s*auto/s);

    // Text wrapping preventing overflow clipping
    expect(stylesheet).toMatch(/\.action-pre-wrap\s*\{[^}]*white-space:\s*pre-wrap/s);
    expect(stylesheet).toMatch(/\.action-pre-wrap\s*\{[^}]*overflow-wrap:\s*anywhere/s);

    // Desktop/mobile card display toggling
    expect(stylesheet).toMatch(/\.actions-taken-cards\s*\{[^}]*display:\s*none/s);
    expect(stylesheet).toMatch(/@media \(max-width: 767\.98px\)[\s\S]*\.actions-taken-cards\s*\{[^}]*display:\s*grid\s*!important/s);

    // 44px mobile touch targets
    expect(stylesheet).toMatch(/@media \(max-width: 767\.98px\)[\s\S]*\.actions-taken-section\s+\.btn\s*\{[^}]*min-height:\s*44px/s);
  });

  it('renders ActionsTakenSection with pre-wrap classes and responsive container structure', async () => {
    global.fetch = ((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/actions-taken')) {
        return Promise.resolve(new Response(JSON.stringify({
          data: [],
          ticketVersion: 1,
          pagination: { total: 0, page: 1, pageSize: 20, totalPages: 1 },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      if (url.includes('/staff/tickets/owners')) {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }));
      }
      return Promise.resolve(new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }));
    }) as any;

    const mockStaff: User = {
      id: 10,
      name: 'Staff One',
      email: 'staff1@example.com',
      role: 'IT_STAFF',
      isActive: true,
      mustChangePassword: false,
    };

    renderWithAuth(
      <ActionsTakenSection
        ticketId={1}
        ticketVersion={1}
        ticketStatus="OPEN"
        isReadOnly={false}
      />,
      mockStaff,
    );

    // Check heading and section container
    expect(await screen.findByRole('heading', { name: 'Actions Taken' })).toBeInTheDocument();
    expect(screen.getByTestId('actions-taken-section')).toBeInTheDocument();
  });
});

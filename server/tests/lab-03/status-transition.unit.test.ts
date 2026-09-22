import { describe, expect, it } from 'vitest';
import {
  ALL_STATUSES,
  CONFIRMATION_REQUIRED_STATUSES,
  isAllowedTransition,
  requiresConfirmation,
  STATUS_TRANSITIONS,
} from '../../src/lib/status-transition';
import type { TicketStatus } from '../../generated/prisma';

describe('UNIT-02: Status transition matrix and edge enforcement (BR-13)', () => {
  it('covers all 8 statuses defined in domain enum', () => {
    expect(ALL_STATUSES).toEqual([
      'NEW',
      'OPEN',
      'IN_PROGRESS',
      'WAITING_FOR_REQUESTER',
      'RESOLVED',
      'CLOSED',
      'REOPENED',
      'CANCELLED',
    ]);
  });

  describe('Allowed transition edges', () => {
    const allowedEdges: Array<[TicketStatus, TicketStatus]> = [
      ['NEW', 'OPEN'],
      ['NEW', 'CANCELLED'],
      ['OPEN', 'IN_PROGRESS'],
      ['OPEN', 'WAITING_FOR_REQUESTER'],
      ['OPEN', 'CANCELLED'],
      ['IN_PROGRESS', 'WAITING_FOR_REQUESTER'],
      ['IN_PROGRESS', 'RESOLVED'],
      ['IN_PROGRESS', 'CANCELLED'],
      ['WAITING_FOR_REQUESTER', 'IN_PROGRESS'],
      ['WAITING_FOR_REQUESTER', 'CANCELLED'],
      ['RESOLVED', 'CLOSED'],
      ['RESOLVED', 'REOPENED'],
      ['CLOSED', 'REOPENED'],
      ['REOPENED', 'IN_PROGRESS'],
      ['REOPENED', 'CANCELLED'],
      ['CANCELLED', 'REOPENED'],
    ];

    it('has exactly 16 allowed transition edges matching BR-13', () => {
      const totalConfigured = Object.values(STATUS_TRANSITIONS).reduce(
        (sum, list) => sum + list.length,
        0,
      );
      expect(totalConfigured).toBe(16);
      expect(allowedEdges.length).toBe(16);
    });

    it.each(allowedEdges)('allows transition from %s to %s', (from, to) => {
      expect(isAllowedTransition(from, to)).toBe(true);
    });
  });

  describe('Disallowed transition edges', () => {
    const disallowedEdges: Array<[TicketStatus, TicketStatus]> = [];

    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        if (!STATUS_TRANSITIONS[from].includes(to)) {
          disallowedEdges.push([from, to]);
        }
      }
    }

    it('identifies exactly 48 disallowed edges (8x8 - 16 = 48)', () => {
      expect(disallowedEdges.length).toBe(48);
    });

    it.each(disallowedEdges)('rejects invalid transition from %s to %s', (from, to) => {
      expect(isAllowedTransition(from, to)).toBe(false);
    });
  });

  describe('Confirmation rules', () => {
    it('requires explicit confirmation only for CANCELLED, RESOLVED, CLOSED, and REOPENED', () => {
      expect(Array.from(CONFIRMATION_REQUIRED_STATUSES).sort()).toEqual(
        ['CANCELLED', 'CLOSED', 'REOPENED', 'RESOLVED'].sort(),
      );

      expect(requiresConfirmation('CANCELLED')).toBe(true);
      expect(requiresConfirmation('RESOLVED')).toBe(true);
      expect(requiresConfirmation('CLOSED')).toBe(true);
      expect(requiresConfirmation('REOPENED')).toBe(true);

      expect(requiresConfirmation('NEW')).toBe(false);
      expect(requiresConfirmation('OPEN')).toBe(false);
      expect(requiresConfirmation('IN_PROGRESS')).toBe(false);
      expect(requiresConfirmation('WAITING_FOR_REQUESTER')).toBe(false);
    });
  });
});

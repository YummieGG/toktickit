import { describe, expect, it } from 'vitest';
import {
  computeActionFingerprint,
  evaluateResolutionGate,
  isActionParentReadOnly,
  isAllowedActionTransition,
  isEligibleActionAssignee,
  isValidIdempotencyKey,
  mapActionStatusToEventType,
  normalizeActionText,
  projectAction,
  type ActionProjection,
} from '../../src/lib/action-rules';
import {
  ALL_STATUSES,
  isAllowedTransition,
  requiresConfirmation,
  STATUS_TRANSITIONS,
} from '../../src/lib/status-transition';

describe('UNIT-01: Action Taken Business Rules & Utilities (FR-04-06, BR-05, BR-06, BR-07, AC-04)', () => {
  describe('Text Normalization (BR-05)', () => {
    it('normalizes CRLF and CR to LF and trims outer whitespace', () => {
      const input = '  First line\r\nSecond line\rThird line  ';
      const normalized = normalizeActionText(input);
      expect(normalized).toBe('First line\nSecond line\nThird line');
    });

    it('returns null for empty strings or strings containing only whitespace', () => {
      expect(normalizeActionText('')).toBeNull();
      expect(normalizeActionText('   \t  \r\n  ')).toBeNull();
      expect(normalizeActionText(null)).toBeNull();
      expect(normalizeActionText(undefined)).toBeNull();
    });

    it('preserves single-line trimmed text untouched', () => {
      expect(normalizeActionText('Replaced network switch')).toBe('Replaced network switch');
    });
  });

  describe('Idempotency Key Validation (BR-18, IDEMPOTENCY-01)', () => {
    it('accepts valid ASCII keys between 8 and 128 characters', () => {
      expect(isValidIdempotencyKey('key-12345678')).toBe(true);
      expect(isValidIdempotencyKey('req_action_001_abcXYZ')).toBe(true);
      expect(isValidIdempotencyKey('a'.repeat(128))).toBe(true);
    });

    it('rejects keys shorter than 8 characters or longer than 128 characters', () => {
      expect(isValidIdempotencyKey('short')).toBe(false);
      expect(isValidIdempotencyKey('a'.repeat(7))).toBe(false);
      expect(isValidIdempotencyKey('a'.repeat(129))).toBe(false);
    });

    it('rejects non-ASCII or invalid punctuation characters', () => {
      expect(isValidIdempotencyKey('key with spaces')).toBe(false);
      expect(isValidIdempotencyKey('key@action#123')).toBe(false);
      expect(isValidIdempotencyKey('key/slash/fail')).toBe(false);
      expect(isValidIdempotencyKey(null)).toBe(false);
      expect(isValidIdempotencyKey(12345678)).toBe(false);
    });
  });

  describe('Action Lifecycle Transitions (BR-08, ACTION-01)', () => {
    it('allows valid transitions from PENDING', () => {
      expect(isAllowedActionTransition('PENDING', 'IN_PROGRESS')).toBe(true);
      expect(isAllowedActionTransition('PENDING', 'COMPLETED')).toBe(true);
      expect(isAllowedActionTransition('PENDING', 'CANCELLED')).toBe(true);
    });

    it('allows valid transitions from IN_PROGRESS', () => {
      expect(isAllowedActionTransition('IN_PROGRESS', 'COMPLETED')).toBe(true);
      expect(isAllowedActionTransition('IN_PROGRESS', 'CANCELLED')).toBe(true);
      expect(isAllowedActionTransition('IN_PROGRESS', 'PENDING')).toBe(false);
    });

    it('rejects any transition from terminal states COMPLETED and CANCELLED', () => {
      expect(isAllowedActionTransition('COMPLETED', 'PENDING')).toBe(false);
      expect(isAllowedActionTransition('COMPLETED', 'IN_PROGRESS')).toBe(false);
      expect(isAllowedActionTransition('COMPLETED', 'CANCELLED')).toBe(false);
      expect(isAllowedActionTransition('CANCELLED', 'PENDING')).toBe(false);
      expect(isAllowedActionTransition('CANCELLED', 'IN_PROGRESS')).toBe(false);
      expect(isAllowedActionTransition('CANCELLED', 'COMPLETED')).toBe(false);
    });

    it('rejects self-transitions', () => {
      expect(isAllowedActionTransition('PENDING', 'PENDING')).toBe(false);
      expect(isAllowedActionTransition('IN_PROGRESS', 'IN_PROGRESS')).toBe(false);
      expect(isAllowedActionTransition('COMPLETED', 'COMPLETED')).toBe(false);
      expect(isAllowedActionTransition('CANCELLED', 'CANCELLED')).toBe(false);
    });
  });

  describe('Parent Ticket Read-Only Checks (PARENT-04, BR-15)', () => {
    it('identifies terminal ticket statuses as read-only for action modifications', () => {
      expect(isActionParentReadOnly('RESOLVED')).toBe(true);
      expect(isActionParentReadOnly('CLOSED')).toBe(true);
      expect(isActionParentReadOnly('CANCELLED')).toBe(true);
    });

    it('identifies active ticket statuses as writable for action modifications', () => {
      expect(isActionParentReadOnly('NEW')).toBe(false);
      expect(isActionParentReadOnly('OPEN')).toBe(false);
      expect(isActionParentReadOnly('IN_PROGRESS')).toBe(false);
      expect(isActionParentReadOnly('WAITING_FOR_REQUESTER')).toBe(false);
      expect(isActionParentReadOnly('REOPENED')).toBe(false);
    });
  });

  describe('Payload Fingerprinting (BR-18, IDEMPOTENCY-01)', () => {
    it('produces identical fingerprints for identical normalized payloads', () => {
      const payload1 = {
        description: '  Diagnosed router \r\n port issue  ',
        assigneeId: 10,
        followUpRequired: true,
        followUpNote: 'Check again tomorrow',
      };
      const payload2 = {
        description: 'Diagnosed router \n port issue',
        assigneeId: 10,
        followUpRequired: true,
        followUpNote: 'Check again tomorrow',
      };
      expect(computeActionFingerprint(payload1)).toBe(computeActionFingerprint(payload2));
    });

    it('produces different fingerprints when content changes', () => {
      const payload1 = {
        description: 'Diagnosed router port issue',
        assigneeId: 10,
      };
      const payload2 = {
        description: 'Replaced fiber optical cable',
        assigneeId: 10,
      };
      expect(computeActionFingerprint(payload1)).not.toBe(computeActionFingerprint(payload2));
    });
  });

  describe('Action Projection (BR-20)', () => {
    it('sanitizes action records without leaking internal creation keys or passwords', () => {
      const dbRecord = {
        id: 1,
        ticketId: 10,
        description: 'Inspected switch port',
        result: 'Port operational',
        status: 'COMPLETED' as const,
        performedBy: { id: 2, name: 'Pimchanok Support', role: 'IT_STAFF' as const },
        assignee: { id: 2, name: 'Pimchanok Support', role: 'IT_STAFF' as const, isActive: true },
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: null,
        cancelReason: null,
        createdAt: new Date('2026-10-13T10:00:00.000Z'),
        updatedAt: new Date('2026-10-13T10:30:00.000Z'),
        version: 2,
        creationKey: 'internal-creation-key',
        creationFingerprint: 'internal-sha-fingerprint',
      };

      const projected: ActionProjection = projectAction(dbRecord);

      expect(projected).toEqual({
        id: 1,
        ticketId: 10,
        description: 'Inspected switch port',
        result: 'Port operational',
        status: 'COMPLETED',
        performedBy: { id: 2, name: 'Pimchanok Support', role: 'IT_STAFF' },
        assignee: { id: 2, name: 'Pimchanok Support', role: 'IT_STAFF', isActive: true },
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: null,
        cancelReason: null,
        createdAt: '2026-10-13T10:00:00.000Z',
        updatedAt: '2026-10-13T10:30:00.000Z',
        version: 2,
      });

      expect(projected).not.toHaveProperty('creationKey');
      expect(projected).not.toHaveProperty('creationFingerprint');
    });
  });

  describe('Assignee Eligibility (BR-04, ELIGIBILITY-04)', () => {
    it('accepts active IT Staff and active Administrator as eligible assignees', () => {
      expect(isEligibleActionAssignee({ role: 'IT_STAFF', isActive: true })).toBe(true);
      expect(isEligibleActionAssignee({ role: 'ADMINISTRATOR', isActive: true })).toBe(true);
    });

    it('rejects inactive Staff and inactive Administrator', () => {
      expect(isEligibleActionAssignee({ role: 'IT_STAFF', isActive: false })).toBe(false);
      expect(isEligibleActionAssignee({ role: 'ADMINISTRATOR', isActive: false })).toBe(false);
    });

    it('rejects Requester even if active', () => {
      expect(isEligibleActionAssignee({ role: 'REQUESTER', isActive: true })).toBe(false);
      expect(isEligibleActionAssignee({ role: 'REQUESTER', isActive: false })).toBe(false);
    });

    it('rejects null and undefined users', () => {
      expect(isEligibleActionAssignee(null)).toBe(false);
      expect(isEligibleActionAssignee(undefined)).toBe(false);
    });
  });

  describe('Status to Event Type Mapping (BR-08)', () => {
    it('maps COMPLETED to COMPLETED event type', () => {
      expect(mapActionStatusToEventType('COMPLETED')).toBe('COMPLETED');
    });

    it('maps CANCELLED to CANCELLED event type', () => {
      expect(mapActionStatusToEventType('CANCELLED')).toBe('CANCELLED');
    });

    it('maps PENDING and IN_PROGRESS to STARTED event type', () => {
      expect(mapActionStatusToEventType('IN_PROGRESS')).toBe('STARTED');
      expect(mapActionStatusToEventType('PENDING')).toBe('STARTED');
    });
  });
});

describe('UNIT-02: Ticket Lifecycle Transitions & Resolution Gate (FR-04-08, BR-12, BR-13, BR-14, AC-06)', () => {
  describe('Resolution Gate Evaluation (BR-14)', () => {
    it('blocks resolution when ticket has zero actions', () => {
      const result = evaluateResolutionGate([]);
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toBe('At least one completed action with a recorded result is required before resolution');
      }
    });

    it('blocks resolution when all actions are cancelled', () => {
      const result = evaluateResolutionGate([
        { status: 'CANCELLED', result: null, followUpRequired: false },
        { status: 'CANCELLED', result: 'Did not finish', followUpRequired: false },
      ]);
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toBe('At least one completed action with a recorded result is required before resolution');
      }
    });

    it('blocks resolution when completed action has empty or whitespace-only result', () => {
      expect(evaluateResolutionGate([
        { status: 'COMPLETED', result: null, followUpRequired: false },
      ]).allowed).toBe(false);

      expect(evaluateResolutionGate([
        { status: 'COMPLETED', result: '   ', followUpRequired: false },
      ]).allowed).toBe(false);
    });

    it('blocks resolution when active actions (PENDING or IN_PROGRESS) are present', () => {
      const resultPending = evaluateResolutionGate([
        { status: 'COMPLETED', result: 'Replaced switch', followUpRequired: false },
        { status: 'PENDING', result: null, followUpRequired: false },
      ]);
      expect(resultPending.allowed).toBe(false);
      if (!resultPending.allowed) {
        expect(resultPending.reason).toBe('All actions must be completed or cancelled before resolution');
      }

      const resultInProgress = evaluateResolutionGate([
        { status: 'COMPLETED', result: 'Replaced switch', followUpRequired: false },
        { status: 'IN_PROGRESS', result: null, followUpRequired: false },
      ]);
      expect(resultInProgress.allowed).toBe(false);
      if (!resultInProgress.allowed) {
        expect(resultInProgress.reason).toBe('All actions must be completed or cancelled before resolution');
      }

      // Prioritize active action warning even if no completed action exists yet
      const resultActiveOnly = evaluateResolutionGate([
        { status: 'IN_PROGRESS', result: null, followUpRequired: false },
      ]);
      expect(resultActiveOnly.allowed).toBe(false);
      if (!resultActiveOnly.allowed) {
        expect(resultActiveOnly.reason).toBe('All actions must be completed or cancelled before resolution');
      }
    });

    it('blocks resolution when any non-cancelled action has followUpRequired=true', () => {
      const result = evaluateResolutionGate([
        { status: 'COMPLETED', result: 'Replaced switch', followUpRequired: true },
      ]);
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toBe('All follow-up requirements must be resolved before resolution');
      }
    });

    it('allows resolution when followUpRequired=true is on a CANCELLED action', () => {
      const result = evaluateResolutionGate([
        { status: 'COMPLETED', result: 'Fixed issue', followUpRequired: false },
        { status: 'CANCELLED', result: null, followUpRequired: true },
      ]);
      expect(result.allowed).toBe(true);
    });

    it('allows resolution when at least one completed action has result and no blockers exist', () => {
      const result = evaluateResolutionGate([
        { status: 'COMPLETED', result: 'Replaced bad RAM module', followUpRequired: false },
        { status: 'CANCELLED', result: null, followUpRequired: false },
      ]);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Ticket 8-State Transition Matrix (BR-13)', () => {
    it('enforces exact allowed transitions for NEW', () => {
      expect(STATUS_TRANSITIONS.NEW).toEqual(['OPEN', 'CANCELLED']);
      expect(isAllowedTransition('NEW', 'OPEN')).toBe(true);
      expect(isAllowedTransition('NEW', 'CANCELLED')).toBe(true);
      expect(isAllowedTransition('NEW', 'IN_PROGRESS')).toBe(false);
      expect(isAllowedTransition('NEW', 'RESOLVED')).toBe(false);
    });

    it('enforces exact allowed transitions for OPEN', () => {
      expect(STATUS_TRANSITIONS.OPEN).toEqual(['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'CANCELLED']);
      expect(isAllowedTransition('OPEN', 'IN_PROGRESS')).toBe(true);
      expect(isAllowedTransition('OPEN', 'WAITING_FOR_REQUESTER')).toBe(true);
      expect(isAllowedTransition('OPEN', 'CANCELLED')).toBe(true);
      expect(isAllowedTransition('OPEN', 'RESOLVED')).toBe(false);
    });

    it('enforces exact allowed transitions for IN_PROGRESS', () => {
      expect(STATUS_TRANSITIONS.IN_PROGRESS).toEqual(['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED']);
      expect(isAllowedTransition('IN_PROGRESS', 'WAITING_FOR_REQUESTER')).toBe(true);
      expect(isAllowedTransition('IN_PROGRESS', 'RESOLVED')).toBe(true);
      expect(isAllowedTransition('IN_PROGRESS', 'CANCELLED')).toBe(true);
      expect(isAllowedTransition('IN_PROGRESS', 'OPEN')).toBe(false);
    });

    it('enforces exact allowed transitions for WAITING_FOR_REQUESTER', () => {
      expect(STATUS_TRANSITIONS.WAITING_FOR_REQUESTER).toEqual(['IN_PROGRESS', 'CANCELLED']);
      expect(isAllowedTransition('WAITING_FOR_REQUESTER', 'IN_PROGRESS')).toBe(true);
      expect(isAllowedTransition('WAITING_FOR_REQUESTER', 'CANCELLED')).toBe(true);
      expect(isAllowedTransition('WAITING_FOR_REQUESTER', 'RESOLVED')).toBe(false);
    });

    it('enforces exact allowed transitions for RESOLVED', () => {
      expect(STATUS_TRANSITIONS.RESOLVED).toEqual(['CLOSED', 'REOPENED']);
      expect(isAllowedTransition('RESOLVED', 'CLOSED')).toBe(true);
      expect(isAllowedTransition('RESOLVED', 'REOPENED')).toBe(true);
      expect(isAllowedTransition('RESOLVED', 'CANCELLED')).toBe(false);
    });

    it('enforces exact allowed transitions for CLOSED', () => {
      expect(STATUS_TRANSITIONS.CLOSED).toEqual(['REOPENED']);
      expect(isAllowedTransition('CLOSED', 'REOPENED')).toBe(true);
      expect(isAllowedTransition('CLOSED', 'RESOLVED')).toBe(false);
    });

    it('enforces exact allowed transitions for REOPENED', () => {
      expect(STATUS_TRANSITIONS.REOPENED).toEqual(['IN_PROGRESS', 'CANCELLED']);
      expect(isAllowedTransition('REOPENED', 'IN_PROGRESS')).toBe(true);
      expect(isAllowedTransition('REOPENED', 'CANCELLED')).toBe(true);
      expect(isAllowedTransition('REOPENED', 'RESOLVED')).toBe(false);
    });

    it('enforces exact allowed transitions for CANCELLED', () => {
      expect(STATUS_TRANSITIONS.CANCELLED).toEqual(['REOPENED']);
      expect(isAllowedTransition('CANCELLED', 'REOPENED')).toBe(true);
      expect(isAllowedTransition('CANCELLED', 'IN_PROGRESS')).toBe(false);
    });

    it('rejects self-transitions for all 8 statuses', () => {
      for (const status of ALL_STATUSES) {
        expect(isAllowedTransition(status, status)).toBe(false);
      }
    });

    it('enforces confirmation requirements for CANCELLED, RESOLVED, CLOSED, REOPENED', () => {
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

  describe('UNIT-03: Bangkok 7-Day Calendar Window & Dashboard Calculations (DASHBOARD-01, DATE-01, AC-07)', () => {
    it('calculates the 7-day calendar window from 00:00:00 Bangkok time 6 days ago', async () => {
      const { getBangkokSevenDayWindow } = await import('../../src/lib/dashboard-rules');
      // 2026-10-18 19:00:00 in Bangkok (UTC+7) = 2026-10-18 12:00:00 UTC
      const now = new Date('2026-10-18T12:00:00.000Z');
      const window = getBangkokSevenDayWindow(now);

      expect(window.to).toBe('2026-10-18T12:00:00.000Z');
      // 6 calendar days ago in Bangkok is 2026-10-12 00:00:00+07:00 = 2026-10-11 17:00:00 UTC
      expect(window.from).toBe('2026-10-11T17:00:00.000Z');
      expect(window.start.toISOString()).toBe('2026-10-11T17:00:00.000Z');
      expect(window.end.toISOString()).toBe('2026-10-18T12:00:00.000Z');
    });

    it('correctly handles time right after Bangkok midnight', async () => {
      const { getBangkokSevenDayWindow } = await import('../../src/lib/dashboard-rules');
      // 2026-10-18 00:05:00 in Bangkok = 2026-10-17 17:05:00 UTC
      const now = new Date('2026-10-17T17:05:00.000Z');
      const window = getBangkokSevenDayWindow(now);

      expect(window.to).toBe('2026-10-17T17:05:00.000Z');
      // Bangkok is on Oct 18, so 6 days ago is Oct 12 00:00:00+07:00 = 2026-10-11 17:00:00 UTC
      expect(window.from).toBe('2026-10-11T17:00:00.000Z');
    });

    it('correctly crosses month boundary', async () => {
      const { getBangkokSevenDayWindow } = await import('../../src/lib/dashboard-rules');
      // 2026-03-03 10:00:00 Bangkok = 2026-03-03 03:00:00 UTC
      const now = new Date('2026-03-03T03:00:00.000Z');
      const window = getBangkokSevenDayWindow(now);

      // March 3 minus 6 days is February 25 (2026 is non-leap year: Feb has 28 days: Feb 25, 26, 27, 28, Mar 1, 2, 3 = 7 days)
      // 2026-02-25 00:00:00+07:00 = 2026-02-24 17:00:00 UTC
      expect(window.from).toBe('2026-02-24T17:00:00.000Z');
    });

    it('maps ticket and staff action rows into standard dashboard projections', async () => {
      const { mapTicketDashboardRow, mapStaffActionRow } = await import('../../src/lib/dashboard-rules');

      const ticketRow = mapTicketDashboardRow({
        id: 1,
        ticketNumber: 'TK-0001',
        summary: 'Server failure',
        currentStatus: 'RESOLVED',
        itPriority: 'HIGH',
        updatedAt: new Date('2026-10-18T10:00:00.000Z'),
        resolvedAt: new Date('2026-10-18T10:30:00.000Z'),
      });
      expect(ticketRow).toEqual({
        id: 1,
        ticketNumber: 'TK-0001',
        summary: 'Server failure',
        currentStatus: 'RESOLVED',
        itPriority: 'HIGH',
        updatedAt: '2026-10-18T10:00:00.000Z',
        resolvedAt: '2026-10-18T10:30:00.000Z',
      });

      const actionRow = mapStaffActionRow({
        id: 10,
        ticketId: 1,
        description: 'Replaced PSU',
        result: 'Operating normally',
        status: 'COMPLETED',
        performedBy: { id: 2, name: 'Staff', role: 'IT_STAFF' },
        assignee: { id: 2, name: 'Staff', role: 'IT_STAFF', isActive: true },
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: null,
        cancelReason: null,
        createdAt: new Date('2026-10-18T10:00:00.000Z'),
        updatedAt: new Date('2026-10-18T10:15:00.000Z'),
        version: 2,
        ticket: {
          id: 1,
          ticketNumber: 'TK-0001',
          summary: 'Server failure',
          currentStatus: 'RESOLVED',
        },
      });
      expect(actionRow.ticket.ticketNumber).toBe('TK-0001');
      expect(actionRow.status).toBe('COMPLETED');
      expect(actionRow.result).toBe('Operating normally');
    });
  });
});

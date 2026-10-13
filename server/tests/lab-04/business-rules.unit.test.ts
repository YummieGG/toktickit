import { describe, expect, it } from 'vitest';
import {
  computeActionFingerprint,
  isActionParentReadOnly,
  isAllowedActionTransition,
  isEligibleActionAssignee,
  isValidIdempotencyKey,
  mapActionStatusToEventType,
  normalizeActionText,
  projectAction,
  type ActionProjection,
} from '../../src/lib/action-rules';

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

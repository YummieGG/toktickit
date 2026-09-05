import { describe, it, expect, vi } from 'vitest';
import { generateTicketNumber, TICKET_NUMBER_ADVISORY_LOCK_ID } from '../../src/lib/ticket-number';
import { Prisma } from '../../generated/prisma';

describe('generateTicketNumber (Unit Test - BR-01)', () => {
  it('acquires the PostgreSQL advisory transaction lock and generates TK-0001 when no tickets exist', async () => {
    const mockTx = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      $queryRaw: vi.fn().mockResolvedValue([]),
    } as unknown as Prisma.TransactionClient;

    const ticketNumber = await generateTicketNumber(mockTx);

    expect(mockTx.$executeRaw).toHaveBeenCalled();
    expect(mockTx.$queryRaw).toHaveBeenCalled();
    expect(ticketNumber).toBe('TK-0001');
  });

  it('increments monotonic sequence when last ticket exists', async () => {
    const mockTx = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      $queryRaw: vi.fn().mockResolvedValue([{ ticketNumber: 'TK-0001' }]),
    } as unknown as Prisma.TransactionClient;

    const ticketNumber = await generateTicketNumber(mockTx);
    expect(ticketNumber).toBe('TK-0002');
  });

  it('correctly zero-pads 4 digits for double and triple digit numbers', async () => {
    const mockTx41 = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      $queryRaw: vi.fn().mockResolvedValue([{ ticketNumber: 'TK-0041' }]),
    } as unknown as Prisma.TransactionClient;

    const ticketNumber42 = await generateTicketNumber(mockTx41);
    expect(ticketNumber42).toBe('TK-0042');

    const mockTx999 = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      $queryRaw: vi.fn().mockResolvedValue([{ ticketNumber: 'TK-0999' }]),
    } as unknown as Prisma.TransactionClient;

    const ticketNumber1000 = await generateTicketNumber(mockTx999);
    expect(ticketNumber1000).toBe('TK-1000');
  });

  it('correctly increments past TK-9999 to TK-10000 and TK-10001', async () => {
    const mockTx9999 = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      $queryRaw: vi.fn().mockResolvedValue([{ ticketNumber: 'TK-9999' }]),
    } as unknown as Prisma.TransactionClient;

    const ticketNumber10000 = await generateTicketNumber(mockTx9999);
    expect(ticketNumber10000).toBe('TK-10000');

    const mockTx10000 = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      $queryRaw: vi.fn().mockResolvedValue([{ ticketNumber: 'TK-10000' }]),
    } as unknown as Prisma.TransactionClient;

    const ticketNumber10001 = await generateTicketNumber(mockTx10000);
    expect(ticketNumber10001).toBe('TK-10001');
  });

  it('uses constant TICKET_NUMBER_ADVISORY_LOCK_ID equal to 888334', () => {
    expect(TICKET_NUMBER_ADVISORY_LOCK_ID).toBe(888334);
  });
});

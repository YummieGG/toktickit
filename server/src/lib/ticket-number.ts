import { Prisma } from '../../generated/prisma';

export const TICKET_NUMBER_ADVISORY_LOCK_ID = 888334;

/**
 * Generates the next ticket number in the format TK-XXXX
 * Uses an advisory transaction lock to serialize generation and prevent race conditions (BR-01).
 * Finds the highest existing ticketNumber to avoid collisions from out-of-order IDs or deletions.
 */
export async function generateTicketNumber(dbClient: Prisma.TransactionClient): Promise<string> {
  // Acquire PostgreSQL advisory transaction lock to prevent concurrent duplicate generation
  await dbClient.$executeRaw`SELECT pg_advisory_xact_lock(${TICKET_NUMBER_ADVISORY_LOCK_ID});`;

  // Find the ticket with the highest ticketNumber (not highest id) to avoid collision
  const lastTicket = await dbClient.ticket.findFirst({
    orderBy: {
      ticketNumber: 'desc'
    },
    select: {
      ticketNumber: true,
    }
  });

  let nextNum = 1;
  if (lastTicket && lastTicket.ticketNumber.startsWith('TK-')) {
    const numericPart = parseInt(lastTicket.ticketNumber.substring(3), 10);
    if (!isNaN(numericPart)) {
      nextNum = numericPart + 1;
    }
  }

  // Format as TK-XXXX (zero-padded to 4 digits)
  return `TK-${nextNum.toString().padStart(4, '0')}`;
}

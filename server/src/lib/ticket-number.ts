import { prisma } from './prisma';

export const TICKET_NUMBER_ADVISORY_LOCK_ID = 888334;

/**
 * Generates the next ticket number in the format TK-XXXX
 * Uses an advisory transaction lock to serialize generation and prevent race conditions (BR-01).
 */
export async function generateTicketNumber(dbClient: any = prisma): Promise<string> {
  // Acquire PostgreSQL advisory transaction lock to prevent concurrent duplicate generation
  await dbClient.$executeRaw`SELECT pg_advisory_xact_lock(${TICKET_NUMBER_ADVISORY_LOCK_ID});`;

  const lastTicket = await dbClient.ticket.findFirst({
    orderBy: {
      id: 'desc'
    }
  });

  let nextId = 1;
  if (lastTicket && lastTicket.ticketNumber.startsWith('TK-')) {
    const numericPart = parseInt(lastTicket.ticketNumber.substring(3), 10);
    if (!isNaN(numericPart)) {
      nextId = numericPart + 1;
    } else {
      // Fallback: Just use database id + 1 if format is weird
      nextId = lastTicket.id + 1;
    }
  } else if (lastTicket) {
    nextId = lastTicket.id + 1;
  }

  // Format as TK-XXXX (zero-padded to 4 digits)
  return `TK-${nextId.toString().padStart(4, '0')}`;
}

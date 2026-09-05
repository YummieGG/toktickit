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

  // Find the ticket with the highest numerical sequence.
  // Order by LENGTH first so 'TK-10000' (length 8) ranks above 'TK-9999' (length 7).
  // Filter by regex '^TK-[0-9]+$' to ignore malformed numbers and ensure safe parsing.
  let lastTicketNumber: string | undefined;

  if (typeof dbClient.$queryRaw === 'function') {
    const rows = await dbClient.$queryRaw<{ ticketNumber: string }[]>`
      SELECT "ticketNumber"
      FROM "Ticket"
      WHERE "ticketNumber" ~ '^TK-[0-9]+$'
      ORDER BY LENGTH("ticketNumber") DESC, "ticketNumber" DESC
      LIMIT 1;
    `;
    if (rows && rows.length > 0) {
      lastTicketNumber = rows[0].ticketNumber;
    }
  } else if (dbClient.ticket && typeof dbClient.ticket.findFirst === 'function') {
    const fallbackTicket = await dbClient.ticket.findFirst({
      orderBy: { ticketNumber: 'desc' },
      select: { ticketNumber: true }
    });
    lastTicketNumber = fallbackTicket?.ticketNumber;
  }

  let nextNum = 1;
  if (lastTicketNumber && lastTicketNumber.startsWith('TK-')) {
    const numericPart = parseInt(lastTicketNumber.substring(3), 10);
    if (!isNaN(numericPart)) {
      nextNum = numericPart + 1;
    }
  }

  // Format as TK-XXXX (zero-padded to 4 digits)
  return `TK-${nextNum.toString().padStart(4, '0')}`;
}

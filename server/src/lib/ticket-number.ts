import { prisma } from './prisma';

/**
 * Generates the next ticket number in the format TK-XXXX
 * Uses the maximum ID from the database to ensure a unique increment.
 */
export async function generateTicketNumber(): Promise<string> {
  // Find the ticket with the highest ID (which corresponds to the latest created usually)
  const lastTicket = await prisma.ticket.findFirst({
    orderBy: {
      id: 'desc'
    }
  });

  // Extract the number from TK-XXXX or start with 1
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

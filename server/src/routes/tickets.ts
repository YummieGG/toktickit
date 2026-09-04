import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma } from '../../generated/prisma';
import { generateTicketNumber } from '../lib/ticket-number';

export const ticketsRouter = Router();

// POST /api/tickets
ticketsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      requesterId, 
      categoryId, 
      relatedSystemId, 
      summary, 
      description, 
      requestedPriority 
    } = req.body;

    const details: Array<{ field: string; message: string }> = [];

    const parseIntField = (value: any, fieldName: string, isRequired: boolean) => {
      if (value === undefined || value === null || value === '') {
        if (isRequired) {
          details.push({ field: fieldName, message: `${fieldName} is required` });
        }
        return isRequired ? undefined : null;
      }
      const parsed = Number(value);
      if (isNaN(parsed)) {
        details.push({ field: fieldName, message: `${fieldName} must be a valid integer` });
        return isRequired ? undefined : null;
      }
      return parsed;
    };

    const requesterIdInt = parseIntField(requesterId, 'requesterId', true) as number | undefined;
    const categoryIdInt = parseIntField(categoryId, 'categoryId', true) as number | undefined;
    const relatedSystemIdInt = parseIntField(relatedSystemId, 'relatedSystemId', false) as number | null;

    if (!summary || typeof summary !== 'string' || summary.trim().length < 5 || summary.trim().length > 200) {
      details.push({ field: 'summary', message: 'Summary must be between 5 and 200 characters' });
    }
    
    if (!description || typeof description !== 'string' || description.trim().length < 10 || description.trim().length > 2000) {
      details.push({ field: 'description', message: 'Description must be between 10 and 2000 characters' });
    }

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    if (!requestedPriority || !validPriorities.includes(requestedPriority)) {
      details.push({ field: 'requestedPriority', message: 'Invalid requested priority. Must be one of LOW, MEDIUM, HIGH, CRITICAL' });
    }

    // If basic validation failed, return 400 immediately
    if (details.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details });
    }

    // Foreign Key existence and isActive checks (BR-05, BR-24, BR-25)
    const [requester, category, system] = await Promise.all([
      requesterIdInt !== undefined ? prisma.requesterUser.findUnique({ where: { id: requesterIdInt } }) : null,
      categoryIdInt !== undefined ? prisma.category.findUnique({ where: { id: categoryIdInt } }) : null,
      relatedSystemIdInt !== null ? prisma.relatedSystem.findUnique({ where: { id: relatedSystemIdInt } }) : null
    ]);

    if (!requester || !requester.isActive) {
      details.push({ field: 'requesterId', message: 'Requester not found or is inactive' });
    }

    if (!category || !category.isActive) {
      details.push({ field: 'categoryId', message: 'Category not found or is inactive' });
    }

    if (relatedSystemIdInt !== null && (!system || !system.isActive)) {
      details.push({ field: 'relatedSystemId', message: 'Related system not found or is inactive' });
    }

    if (details.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details });
    }

    // Atomic transaction for ticket number generation and creation (BR-01 concurrency safety)
    // Retry up to 3 times on unique constraint violation (P2002) as a safety net
    const MAX_RETRIES = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const newTicket = await prisma.$transaction(async (tx) => {
          const ticketNumber = await generateTicketNumber(tx);

          return tx.ticket.create({
            data: {
              ticketNumber,
              summary: summary.trim(),
              description: description.trim(),
              requestedPriority,
              currentStatus: 'NEW',
              ticketDate: new Date(), // Set server-side (BR-23)
              requesterId: requesterIdInt!,
              categoryId: categoryIdInt!,
              relatedSystemId: relatedSystemIdInt
            },
            include: {
              category: { select: { id: true, name: true } },
              relatedSystem: { select: { id: true, name: true } },
              requester: { select: { id: true, name: true } }
            }
          });
        });

        return res.status(201).json({ 
          data: newTicket 
        });
      } catch (error) {
        // If it's a unique constraint violation on ticketNumber, retry
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          attempt < MAX_RETRIES
        ) {
          lastError = error;
          continue;
        }
        // Non-retryable error or max retries exhausted
        lastError = error;
        break;
      }
    }

    console.error('Error creating ticket:', lastError);
    res.status(500).json({ error: 'Internal server error' });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

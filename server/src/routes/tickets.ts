import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
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

    // Validation
    if (!requesterId) return res.status(400).json({ error: 'requesterId is required' });
    if (!categoryId) return res.status(400).json({ error: 'categoryId is required' });
    
    if (!summary || summary.trim().length < 5 || summary.trim().length > 200) {
      return res.status(400).json({ error: 'Summary must be between 5 and 200 characters' });
    }
    
    if (!description || description.trim().length < 10 || description.trim().length > 2000) {
      return res.status(400).json({ error: 'Description must be between 10 and 2000 characters' });
    }

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    if (!requestedPriority || !validPriorities.includes(requestedPriority)) {
      return res.status(400).json({ error: 'Invalid requested priority' });
    }

    const ticketNumber = await generateTicketNumber();

    // Create the ticket
    const newTicket = await prisma.ticket.create({
      data: {
        ticketNumber,
        summary: summary.trim(),
        description: description.trim(),
        requestedPriority,
        currentStatus: 'NEW',
        ticketDate: new Date(), // Set server-side
        requesterId: parseInt(requesterId),
        categoryId: parseInt(categoryId),
        relatedSystemId: relatedSystemId ? parseInt(relatedSystemId) : undefined
      }
    });

    res.status(201).json({ 
      message: 'Ticket created successfully',
      data: newTicket 
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

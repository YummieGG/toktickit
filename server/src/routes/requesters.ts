import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const requestersRouter = Router();

// GET /api/requesters
requestersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const requesters = await prisma.requesterUser.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({ data: requesters });
  } catch (error) {
    console.error('Error fetching requesters:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

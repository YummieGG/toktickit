import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requirePasswordChanged } from '../middleware/auth';

export const relatedSystemsRouter = Router();

// GET /api/related-systems
relatedSystemsRouter.get('/', requireAuth, requirePasswordChanged, async (req: Request, res: Response) => {
  try {
    const systems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ data: systems });
  } catch (error) {
    console.error('Error fetching related systems:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Unable to process the request' },
    });
  }
});

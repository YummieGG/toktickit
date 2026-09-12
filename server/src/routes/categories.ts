import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requirePasswordChanged } from '../middleware/auth';

export const categoriesRouter = Router();

// GET /api/categories
categoriesRouter.get('/', requireAuth, requirePasswordChanged, async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Unable to process the request' },
    });
  }
});

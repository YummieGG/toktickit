import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const categoriesRouter = Router();

// GET /api/categories
categoriesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

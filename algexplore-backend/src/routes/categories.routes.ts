import { Router } from 'express';
import { prisma } from '../prisma';
import { AppError } from '../errors/AppError';

const router = Router();

// GET /categories
router.get('/', async (_req, res, next) => {
  try {
    const categories = await prisma.categorie.findMany({
      select: { id: true, nom: true },
      orderBy: { nom: 'asc' },
    });

    return res.status(200).json(categories);
  } catch {
    return next(new AppError(500, 'INTERNAL_SERVER_ERROR', 'Unexpected error'));
  }
});

export default router;

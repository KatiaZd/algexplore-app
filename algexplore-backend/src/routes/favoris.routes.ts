import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth } from '../middlewares/requireAuth';
import { validate } from '../middlewares/validate';
import { AppError } from '../errors/AppError';

const router = Router();

const FavoriToggleSchema = z.object({
  lieuId: z.number().int().positive(),
});

/**
 * GET /favoris/me
 * Protégé : liste des favoris de l'utilisateur connecté
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const favoris = await prisma.favori.findMany({
      where: { utilisateurId: userId },
      orderBy: { lieuId: 'desc' },
      select: {
        lieuId: true,
        lieu: {
          select: {
            id: true,
            nom: true,
            adresse: true,
            categoriePrincipale: true,
            photos: { select: { url: true } },
          },
        },
      },
    });

    return res.json({ favoris });
  } catch {
    return next(new AppError(500, 'INTERNAL_SERVER_ERROR', 'Unexpected error'));
  }
});

/**
 * POST /favoris/toggle
 * Protégé : ajoute/retire un favori
 * body: { lieuId: number }
 */
router.post('/toggle', requireAuth, validate(FavoriToggleSchema), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { lieuId } = req.body as z.infer<typeof FavoriToggleSchema>;

    // Vérifier si le favori existe déjà
    const existing = await prisma.favori.findUnique({
      where: { utilisateurId_lieuId: { utilisateurId: userId, lieuId } },
      select: { utilisateurId: true, lieuId: true },
    });

    // Si existe => remove
    if (existing) {
      await prisma.favori.delete({
        where: { utilisateurId_lieuId: { utilisateurId: userId, lieuId } },
      });
      return res.json({ isFavorite: false });
    }

    // Sinon => add
    await prisma.favori.create({
      data: { utilisateurId: userId, lieuId },
    });

    return res.status(201).json({ isFavorite: true });
  } catch {
    return next(new AppError(500, 'INTERNAL_SERVER_ERROR', 'Unexpected error'));
  }
});

export default router;

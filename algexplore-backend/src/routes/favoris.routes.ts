import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../middlewares/requireAuth';

const router = Router();

/**
 * GET /favoris/me
 * Protégé : liste des favoris de l'utilisateur connecté
 */
router.get('/me', requireAuth, async (req, res) => {
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
          photos: { select: { url: true } }, // si tu veux afficher une image
        },
      },
    },
  });

  return res.json({ favoris });
});

/**
 * POST /favoris/toggle
 * Protégé : ajoute/retire un favori
 * body: { lieuId: number }
 */
router.post('/toggle', requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const { lieuId } = req.body as { lieuId?: number };

  if (typeof lieuId !== 'number' || Number.isNaN(lieuId)) {
    return res.status(400).json({ message: 'lieuId est requis et doit être un nombre' });
  }

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
});

export default router;

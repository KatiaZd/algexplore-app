import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../middlewares/requireAuth';

const router = Router();

/**
 * GET /avis/me
 * Protégé : récupérer les avis de l'utilisateur connecté
 */
router.get('/me', requireAuth, async (req, res) => {
  const userId = req.user!.id;

  const avis = await prisma.avis.findMany({
    where: { utilisateurId: userId },
    orderBy: { id: 'desc' },
    select: {
      id: true,
      note: true,
      commentaire: true,
      lieuId: true,
      lieu: { select: { id: true, nom: true } }, // pratique pour l'espace perso
    },
  });

  return res.json({ avis });
});


/**
 * GET /avis?lieuId=123
 * Public : liste des avis d'un lieu
 */
router.get('/', async (req, res) => {
  const lieuIdRaw = req.query.lieuId as string | undefined;

  if (!lieuIdRaw) {
    return res.status(400).json({ message: 'lieuId est requis en query param' });
  }

  const lieuId = Number(lieuIdRaw);
  if (Number.isNaN(lieuId)) {
    return res.status(400).json({ message: 'lieuId invalide' });
  }

  const avis = await prisma.avis.findMany({
    where: { lieuId },
    orderBy: { id: 'desc' },
    select: {
      id: true,
      note: true,
      commentaire: true,
      lieuId: true,
      utilisateurId: true,
      utilisateur: {
        select: { id: true, prenom: true, nom: true },
      },
    },
  });

  return res.json({ avis });
});

/**
 * POST /avis
 * Protégé : créer un avis (user connecté)
 * body: { lieuId: number, note: number, commentaire?: string }
 */
router.post('/', requireAuth, async (req, res) => {
  const userId = req.user!.id;

  const { lieuId, note, commentaire } = req.body as {
    lieuId?: number;
    note?: number;
    commentaire?: string;
  };

  if (typeof lieuId !== 'number' || Number.isNaN(lieuId)) {
    return res.status(400).json({ message: 'lieuId est requis et doit être un nombre' });
  }

  if (typeof note !== 'number' || Number.isNaN(note) || note < 1 || note > 5) {
    return res.status(400).json({ message: 'note doit être un nombre entre 1 et 5' });
  }

  const lieu = await prisma.lieu.findUnique({ where: { id: lieuId }, select: { id: true } });
  if (!lieu) {
    return res.status(404).json({ message: 'Lieu introuvable' });
  }

  const avis = await prisma.avis.create({
    data: {
      lieuId,
      utilisateurId: userId,
      note,
      commentaire: commentaire?.trim() ? commentaire.trim() : null,
    },
    select: {
      id: true,
      note: true,
      commentaire: true,
      lieuId: true,
      utilisateurId: true,
    },
  });

  return res.status(201).json({ avis });
});

/**
 * PATCH /avis/:id
 * Protégé : modifier SON avis uniquement
 * body: { note?: number, commentaire?: string }
 */
router.patch('/:id', requireAuth, async (req, res) => {
  const userId = req.user!.id;

  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: 'id avis invalide' });
  }

  const { note, commentaire } = req.body as {
    note?: number;
    commentaire?: string;
  };

  // Au moins un champ à modifier
  if (note === undefined && commentaire === undefined) {
    return res.status(400).json({ message: 'Aucun champ à mettre à jour' });
  }

  // Validation note si fournie
  if (note !== undefined) {
    if (typeof note !== 'number' || Number.isNaN(note) || note < 1 || note > 5) {
      return res.status(400).json({ message: 'note doit être un nombre entre 1 et 5' });
    }
  }

  const avis = await prisma.avis.findUnique({
    where: { id },
    select: { id: true, utilisateurId: true },
  });

  if (!avis) {
    return res.status(404).json({ message: 'Avis introuvable' });
  }

  if (avis.utilisateurId !== userId) {
    return res.status(403).json({ message: 'Interdit : vous ne pouvez modifier que vos avis' });
  }

  const updated = await prisma.avis.update({
    where: { id },
    data: {
      ...(note !== undefined ? { note } : {}),
      ...(commentaire !== undefined
        ? { commentaire: commentaire?.trim() ? commentaire.trim() : null }
        : {}),
    },
    select: {
      id: true,
      note: true,
      commentaire: true,
      lieuId: true,
      utilisateurId: true,
    },
  });

  return res.json({ avis: updated });
});


/**
 * DELETE /avis/:id
 * Protégé : supprimer SON avis uniquement
 */
router.delete('/:id', requireAuth, async (req, res) => {
  const userId = req.user!.id;

  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: 'id avis invalide' });
  }

  const avis = await prisma.avis.findUnique({
    where: { id },
    select: { id: true, utilisateurId: true },
  });

  if (!avis) {
    return res.status(404).json({ message: 'Avis introuvable' });
  }

  if (avis.utilisateurId !== userId) {
    return res.status(403).json({ message: 'Interdit : vous ne pouvez supprimer que vos avis' });
  }

  await prisma.avis.delete({ where: { id } });

  return res.status(204).send();
});

export default router;
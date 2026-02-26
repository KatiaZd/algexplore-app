import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth } from '../middlewares/requireAuth';
import { validate } from '../middlewares/validate';
import { AppError } from '../errors/AppError';

const router = Router();

/** Helpers */
/** Helpers */
function parseId(raw: string | string[]): number {
  const value = Array.isArray(raw) ? raw[0] : raw;

  const n = Number(value);

  if (!Number.isInteger(n) || n <= 0) {
    throw new AppError(400, 'BAD_REQUEST', 'Identifiant invalide');
  }

  return n;
}

/** Schemas */
const AvisCreateSchema = z.object({
  lieuId: z.number().int().positive(),
  note: z.number().int().min(1).max(5),
  commentaire: z.string().trim().min(1).max(2000).optional(),
});

const AvisUpdateSchema = z
  .object({
    note: z.number().int().min(1).max(5).optional(),
    commentaire: z.string().trim().min(1).max(2000).optional(),
  })
  .refine(data => data.note !== undefined || data.commentaire !== undefined, {
    message: 'Aucun champ à mettre à jour',
  });

/**
 * GET /avis/me
 * Protégé : récupérer les avis de l'utilisateur connecté
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const avis = await prisma.avis.findMany({
      where: { utilisateurId: userId },
      orderBy: { id: 'desc' },
      select: {
        id: true,
        note: true,
        commentaire: true,
        lieuId: true,
        lieu: { select: { id: true, nom: true } },
      },
    });

    return res.json({ avis });
  } catch {
    return next(new AppError(500, 'INTERNAL_SERVER_ERROR', 'Unexpected error'));
  }
});

/**
 * GET /avis?lieuId=123
 * Public : liste des avis d'un lieu
 */
router.get('/', async (req, res, next) => {
  try {
    const lieuIdRaw = req.query.lieuId;

    if (typeof lieuIdRaw !== 'string') {
      return next(new AppError(400, 'BAD_REQUEST', 'lieuId est requis en query param'));
    }

    const lieuId = Number(lieuIdRaw);
    if (!Number.isInteger(lieuId) || lieuId <= 0) {
      return next(new AppError(400, 'BAD_REQUEST', 'lieuId invalide'));
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
        utilisateur: { select: { id: true, prenom: true, nom: true } },
      },
    });

    return res.json({ avis });
  } catch {
    return next(new AppError(500, 'INTERNAL_SERVER_ERROR', 'Unexpected error'));
  }
});

/**
 * POST /avis
 * Protégé : créer un avis
 */
router.post('/', requireAuth, validate(AvisCreateSchema), async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const { lieuId, note, commentaire } = req.body as z.infer<typeof AvisCreateSchema>;

    const lieu = await prisma.lieu.findUnique({ where: { id: lieuId }, select: { id: true } });
    if (!lieu) {
      return next(new AppError(404, 'NOT_FOUND', 'Lieu introuvable'));
    }

    const avis = await prisma.avis.create({
      data: {
        lieuId,
        utilisateurId: userId,
        note,
        commentaire: commentaire?.trim() ? commentaire.trim() : null,
      },
      select: { id: true, note: true, commentaire: true, lieuId: true, utilisateurId: true },
    });

    return res.status(201).json({ avis });
  } catch {
    return next(new AppError(500, 'INTERNAL_SERVER_ERROR', 'Unexpected error'));
  }
});

/**
 * PATCH /avis/:id
 * Protégé : modifier SON avis uniquement
 */
router.patch('/:id', requireAuth, validate(AvisUpdateSchema), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = parseId(req.params.id);

    const existing = await prisma.avis.findUnique({
      where: { id },
      select: { id: true, utilisateurId: true },
    });

    if (!existing) {
      return next(new AppError(404, 'NOT_FOUND', 'Avis introuvable'));
    }

    if (existing.utilisateurId !== userId) {
      return next(new AppError(403, 'FORBIDDEN', 'Interdit'));
    }

    const { note, commentaire } = req.body as z.infer<typeof AvisUpdateSchema>;

    const updated = await prisma.avis.update({
      where: { id },
      data: {
        ...(note !== undefined ? { note } : {}),
        ...(commentaire !== undefined
          ? { commentaire: commentaire?.trim() ? commentaire.trim() : null }
          : {}),
      },
      select: { id: true, note: true, commentaire: true, lieuId: true, utilisateurId: true },
    });

    return res.json({ avis: updated });
  } catch (err) {
    // parseId peut throw AppError
    return next(err instanceof AppError ? err : new AppError(500, 'INTERNAL_SERVER_ERROR', 'Unexpected error'));
  }
});

/**
 * DELETE /avis/:id
 * Protégé : supprimer SON avis uniquement
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = parseId(req.params.id);

    const existing = await prisma.avis.findUnique({
      where: { id },
      select: { id: true, utilisateurId: true },
    });

    if (!existing) {
      return next(new AppError(404, 'NOT_FOUND', 'Avis introuvable'));
    }

    if (existing.utilisateurId !== userId) {
      return next(new AppError(403, 'FORBIDDEN', 'Interdit'));
    }

    await prisma.avis.delete({ where: { id } });

    return res.status(204).send();
  } catch (err) {
    return next(err instanceof AppError ? err : new AppError(500, 'INTERNAL_SERVER_ERROR', 'Unexpected error'));
  }
});

export default router;

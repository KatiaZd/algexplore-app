import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { validate } from '../middlewares/validate';
import { LieuCreateSchema } from '../validation/lieu.schema';
import { LieuUpdateSchema } from '../validation/lieuUpdate.schema';

// Image par défaut si un lieu n’a aucune photo
const DEFAULT_COVER = '/uploads/default-lieu-cover.jpg';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const abs = (url: string | null) =>
  url ? (url.startsWith('http') ? url : `${BASE_URL}${url}`) : null;

// normalisation (sans accents) pour les comparaisons "catégories".
// Important: `mode: 'insensitive'` gère la casse, PAS les accents.
const normalize = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const router = Router();

/**
 * Helper: transforme un lieu Prisma en DTO “front”
 * -> categoriePrincipale = colonne BDD
 */
function toLieuItem(l: any, avgNote = 0) {
  const photos = (l.photos ?? []).map((p: any) => ({
    id: p.id,
    url: abs(p.url),
    description: p.description,
  }));

  return {
    id: l.id,
    nom: l.nom,
    description: l.description,
    adresse: l.adresse,
    isPermanent: l.isPermanent ?? false,
    dateDebut: l.dateDebut,
    dateFin: l.dateFin,
    prixAdulte: l.prixAdulte,
    prixEnfant: l.prixEnfant,
    latitude: l.latitude ? Number(l.latitude) : null,
    longitude: l.longitude ? Number(l.longitude) : null,
    publicCible: l.publicCible,
    urlInfos: l.urlInfos,
    infosAcces: l.infosAcces,
    quartier: l.quartier?.nom ?? null,

    // tags/pivot (secondaires)
    categories: (l.categories ?? []).map((c: any) => c.categorie.nom),

    // colonne BDD
    categoriePrincipale: l.categoriePrincipale ?? null,

    photos,
    coverUrl: photos[0]?.url ?? abs(DEFAULT_COVER),

    stats: l._count
      ? {
          avisCount: l._count.avis ?? 0,
          favorisCount: l._count.favoris ?? 0,
          avgNote,
        }
      : undefined,
  };
}

/**
 * GET /lieux
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt(String(req.query.page ?? '1'), 10), 1);
    const pageSizeRaw = Math.max(parseInt(String(req.query.pageSize ?? '10'), 10), 1);
    const pageSize = Math.min(pageSizeRaw, 50);

    const q = (req.query.q as string | undefined)?.trim();
    const quartier = (req.query.quartier as string | undefined)?.trim();

    // pivot (tags)
    const categorie = (req.query.categorie as string | undefined)?.trim();
    const categorieIdRaw = (req.query.categorieId as string | undefined)?.trim();
    const categorieId = categorieIdRaw ? Number(categorieIdRaw) : undefined;

    // colonne
    const categoriePrincipale = (req.query.categoriePrincipale as string | undefined)?.trim();

    const where: any = {};

    // préparer les versions normalisées (sans accents) pour les filtres catégories
    const qNorm = q ? normalize(q) : undefined;
    const categorieNorm = categorie ? normalize(categorie) : undefined;
    const categoriePrincipaleNorm = categoriePrincipale ? normalize(categoriePrincipale) : undefined;

    // on utilise qNorm uniquement si présent
    if (q && qNorm) {
      where.OR = [
        // Recherche texte libre -> on garde q (avec accents) + mode insensitive
        { nom: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { adresse: { contains: q, mode: 'insensitive' } },

        // recherche dans tags -> utiliser qNorm (sans accents)
        // Sinon "Café" ne matche pas "cafe" en BDD.
        {
          categories: {
            some: {
              categorie: {
                nom: { contains: qNorm, mode: 'insensitive' },
              },
            },
          },
        },

        // recherche dans categoriePrincipale (colonne) -> utiliser qNorm (sans accents)
        { categoriePrincipale: { contains: qNorm, mode: 'insensitive' } },
      ];
    }

    if (quartier) {
      where.quartier = { nom: { equals: quartier } };
    }

    // 'insensitive' peut être refusé/ignoré selon setup Prisma.
    // Ici on normalise déjà (lowercase + sans accents), donc `mode` n’est plus nécessaire.
    if (categoriePrincipaleNorm) {
      where.categoriePrincipale = { equals: categoriePrincipaleNorm };
    }

    // idem -> on enlève `mode: 'insensitive'` sur equals
    if (categorieId !== undefined && Number.isFinite(categorieId)) {
      where.categories = { some: { categorieId } };
    } else if (categorieNorm) {
      where.categories = {
        some: {
          categorie: { nom: { equals: categorieNorm } },
        },
      };
    }

    const [total, lieux] = await Promise.all([
      prisma.lieu.count({ where }),
      prisma.lieu.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          quartier: true,
          photos: { orderBy: { id: 'asc' } },
          categories: { include: { categorie: true } },
          _count: { select: { avis: true, favoris: true } },
        },
        orderBy: { id: 'asc' },
      }),
    ]);

    // Moyenne notes (groupBy)
    const lieuIds = lieux.map((l) => l.id);
    const notes = lieuIds.length
      ? await prisma.avis.groupBy({
          by: ['lieuId'],
          where: { lieuId: { in: lieuIds } },
          _avg: { note: true },
        })
      : [];

    const avgByLieuId = new Map<number, number>();
    for (const n of notes) avgByLieuId.set(n.lieuId, n._avg.note ?? 0);

    const items = lieux.map((l) => toLieuItem(l, avgByLieuId.get(l.id) ?? 0));

    return res.json({ page, pageSize, total, items });
  } catch (err) {
    console.error('GET /lieux error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /lieux/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id invalide' });

    const lieu = await prisma.lieu.findUnique({
      where: { id },
      include: {
        quartier: true,
        photos: { orderBy: { id: 'asc' } },
        categories: { include: { categorie: true } },
        _count: { select: { avis: true, favoris: true } },
      },
    });

    if (!lieu) return res.status(404).json({ error: 'Lieu introuvable' });

    const notes = await prisma.avis.groupBy({
      by: ['lieuId'],
      where: { lieuId: id },
      _avg: { note: true },
    });

    const avgNote = notes[0]?._avg?.note ?? 0;

    return res.status(200).json(toLieuItem(lieu, avgNote));
  } catch (err) {
    console.error('GET /lieux/:id error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /lieux
 */
router.post('/', validate(LieuCreateSchema), async (req: Request, res: Response) => {
  try {
    const {
      nom,
      description,
      adresse,
      isPermanent,
      dateDebut,
      dateFin,
      prixAdulte,
      prixEnfant,
      latitude,
      longitude,
      publicCible,
      urlInfos,
      infosAcces,
      quartierNom,
      categories,
      categoriePrincipale,
    } = req.body;

    const quartier = await prisma.quartier.upsert({
      where: { nom: quartierNom },
      update: {},
      create: { nom: quartierNom },
    });

    const created = await prisma.lieu.create({
      data: {
        nom,
        description,
        adresse,
        isPermanent: isPermanent ?? false,
        dateDebut: dateDebut ? new Date(dateDebut) : null,
        dateFin: dateFin ? new Date(dateFin) : null,
        prixAdulte: prixAdulte ?? null,
        prixEnfant: prixEnfant ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        publicCible: publicCible ?? null,
        urlInfos: urlInfos ?? null,
        infosAcces: infosAcces ?? null,

        // normaliser la categoriePrincipale stockée si fournie
        // (évite d'avoir "Café" en BDD au lieu de "cafe")
        categoriePrincipale: categoriePrincipale ? normalize(String(categoriePrincipale)) : null,

        quartier: { connect: { id: quartier.id } },
      },
    });

    if (Array.isArray(categories) && categories.length) {
      for (const nomCat of categories) {
        // normaliser les noms de catégories enregistrées en BDD
        const nomCatNorm = normalize(String(nomCat));

        const cat = await prisma.categorie.upsert({
          where: { nom: nomCatNorm },
          update: {},
          create: { nom: nomCatNorm },
        });

        await prisma.lieuCategorie.upsert({
          where: { lieuId_categorieId: { lieuId: created.id, categorieId: cat.id } },
          update: {},
          create: { lieuId: created.id, categorieId: cat.id },
        });
      }
    }

    const full = await prisma.lieu.findUnique({
      where: { id: created.id },
      include: {
        quartier: true,
        photos: { orderBy: { id: 'asc' } },
        categories: { include: { categorie: true } },
        _count: { select: { avis: true, favoris: true } },
      },
    });

    return res.status(201).json(toLieuItem(full, 0));
  } catch (err) {
    console.error('POST /lieux error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * PUT /lieux/:id
 */
router.put('/:id', validate(LieuUpdateSchema), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id invalide' });

    const existing = await prisma.lieu.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Lieu introuvable' });

    const { quartierNom, categories, dateDebut, dateFin, latitude, longitude, ...rest } = req.body;

    const dataToUpdate: any = { ...rest };

    if (dateDebut !== undefined) dataToUpdate.dateDebut = dateDebut ? new Date(dateDebut) : null;
    if (dateFin !== undefined) dataToUpdate.dateFin = dateFin ? new Date(dateFin) : null;

    if (latitude !== undefined) dataToUpdate.latitude = latitude ?? null;
    if (longitude !== undefined) dataToUpdate.longitude = longitude ?? null;

    // normaliser categoriePrincipale si elle est envoyée au PUT
    if (dataToUpdate.categoriePrincipale !== undefined) {
      dataToUpdate.categoriePrincipale = dataToUpdate.categoriePrincipale
        ? normalize(String(dataToUpdate.categoriePrincipale))
        : null;
    }

    if (quartierNom !== undefined) {
      const quartier = await prisma.quartier.upsert({
        where: { nom: quartierNom },
        update: {},
        create: { nom: quartierNom },
      });
      dataToUpdate.quartier = { connect: { id: quartier.id } };
    }

    await prisma.lieu.update({ where: { id }, data: dataToUpdate });

    // tags/pivot : remplace toutes les catégories si fourni
    if (categories !== undefined) {
      await prisma.lieuCategorie.deleteMany({ where: { lieuId: id } });

      for (const nomCat of categories) {
        // normaliser les catégories
        const nomCatNorm = normalize(String(nomCat));

        const cat = await prisma.categorie.upsert({
          where: { nom: nomCatNorm },
          update: {},
          create: { nom: nomCatNorm },
        });

        await prisma.lieuCategorie.create({
          data: { lieuId: id, categorieId: cat.id },
        });
      }
    }

    const full = await prisma.lieu.findUnique({
      where: { id },
      include: {
        quartier: true,
        photos: { orderBy: { id: 'asc' } },
        categories: { include: { categorie: true } },
        _count: { select: { avis: true, favoris: true } },
      },
    });

    return res.status(200).json(toLieuItem(full, 0));
  } catch (err) {
    console.error('PUT /lieux/:id error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * DELETE /lieux/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id invalide' });

    const existing = await prisma.lieu.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return res.status(404).json({ error: 'Lieu introuvable' });

    await prisma.avis.deleteMany({ where: { lieuId: id } });
    await prisma.favori.deleteMany({ where: { lieuId: id } });
    await prisma.photo.deleteMany({ where: { lieuId: id } });
    await prisma.lieuCategorie.deleteMany({ where: { lieuId: id } });

    await prisma.lieu.delete({ where: { id } });

    return res.status(204).send();
  } catch (err) {
    console.error('DELETE /lieux/:id error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
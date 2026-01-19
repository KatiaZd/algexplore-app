import { z } from 'zod';

// Tous les champs sont optionnels => modification partielle
export const LieuUpdateSchema = z.object({
  nom: z.string().trim().min(2, 'Le nom est trop court').max(250).optional(),
  description: z.string().trim().optional(),
  adresse: z.string().trim().max(255).optional(),

  dateDebut: z.coerce.date().nullable().optional(),
  dateFin: z.coerce.date().nullable().optional(),

  prixAdulte: z.string().trim().max(50).nullable().optional(),
  prixEnfant: z.string().trim().max(50).nullable().optional(),

  // Decimal Prisma: on accepte string/number, mais on normalise en string côté API
  latitude: z.union([z.string(), z.number()]).nullable().optional(),
  longitude: z.union([z.string(), z.number()]).nullable().optional(),

  publicCible: z.string().trim().max(100).nullable().optional(),
  urlInfos: z.string().trim().url().max(255).nullable().optional(),
  infosAcces: z.string().trim().nullable().optional(),

  // entités liées (FK)
  categoriePrincipale: z.string().trim().min(1).nullable().optional(),

  // relations
  quartierNom: z.string().trim().min(1).optional(),
  categories: z.array(z.string().trim().min(1)).optional(), // si présent -> on remplace
});

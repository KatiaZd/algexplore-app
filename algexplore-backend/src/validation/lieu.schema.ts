import { z } from 'zod';

export const LieuCreateSchema = z.object({
  nom: z.string().trim().min(2).max(250),
  description: z.string().trim().min(5),
  adresse: z.string().trim().min(2).max(255),
  
  dateCreation: z.coerce.date().optional(),

  dateDebut: z.coerce.date().nullable().optional(),
  dateFin: z.coerce.date().nullable().optional(),

  prixAdulte: z.string().trim().max(50).nullable().optional(),
  prixEnfant: z.string().trim().max(50).nullable().optional(),

  latitude: z.string().trim().nullable().optional(),
  longitude: z.string().trim().nullable().optional(),

  publicCible: z.string().trim().max(100).nullable().optional(),
  urlInfos: z.string().trim().url().max(255).nullable().optional(),
  infosAcces: z.string().trim().nullable().optional(),

  quartierNom: z.string().trim().min(1),

  categories: z.array(z.string().trim().min(1)).default([]),

  categoriePrincipale: z.string().trim().min(1).nullable().optional(),
});

import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Base de données
  DATABASE_URL: z.string().url('DATABASE_URL doit être une URL valide'),

  // Optionnel (Prisma shadow DB)
  SHADOW_DATABASE_URL: z.string().url().optional(),

  // JWT
  JWT_SECRET: z.string().min(1, 'JWT_SECRET est requis'),

  // URL publique de l’API 
  BASE_URL: z.string().url().default('http://localhost:3000'),

  // CORS (liste séparée par des virgules)
  CORS_ORIGINS: z.string().default('http://localhost:4200'),

  // Rate limit basique (pour futurs tickets Sécurité)
  RATE_WINDOW_MIN: z.coerce.number().int().positive().default(15),
  RATE_MAX_REQ: z.coerce.number().int().positive().default(200),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // Arrêt propre si la config est invalide
  process.exit(1);
}

export const ENV = {
  ...parsed.data,
  CORS_ORIGIN_LIST: parsed.data.CORS_ORIGINS.split(',')
    .map(o => o.trim())
    .filter(Boolean),
};

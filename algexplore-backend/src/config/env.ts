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

  // Rate limit basique
  RATE_WINDOW_MIN: z.coerce.number().int().positive().default(15),
  RATE_MAX_REQ: z.coerce.number().int().positive().default(200),
});

const isTest = (process.env.NODE_ENV ?? 'development') === 'test';

// Valeurs “safe” uniquement pour permettre aux tests/CI de charger l’app.
// On n’utilise pas la DB dans les tests (Prisma mocké), mais le schéma exige une URL valide.
const testFallback = {
  DATABASE_URL: 'http://localhost:5432/testdb',
  JWT_SECRET: 'test-secret',
  NODE_ENV: 'test' as const,
};

const mergedEnv = isTest ? { ...testFallback, ...process.env, NODE_ENV: 'test' } : process.env;

const parsed = EnvSchema.safeParse(mergedEnv);

let data: z.infer<typeof EnvSchema>;

if (!parsed.success) {
  // En dev/prod : on refuse de démarrer si la config est invalide
  if (!isTest) {
    process.exit(1);
  }
  // En test : on force un ENV minimal pour ne pas casser Jest/CI
  data = EnvSchema.parse(testFallback);
} else {
  data = parsed.data;
}

export const ENV = {
  ...data,
  CORS_ORIGIN_LIST: data.CORS_ORIGINS.split(',')
    .map(o => o.trim())
    .filter(Boolean),
};

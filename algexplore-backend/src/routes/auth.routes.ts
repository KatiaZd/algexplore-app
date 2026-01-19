import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

import { prisma } from '../prisma';
import { requireAuth } from '../middlewares/requireAuth';
import { validate } from '../middlewares/validate';
import { RegisterSchema, LoginSchema } from '../validation/auth.schema';
import { AppError } from '../errors/AppError';
import { ENV } from '../config/env';

const router = Router();

router.get('/ping', (_req, res) => {
  return res.status(200).json({ ok: true });
});

/**
 * Rate limit spécifique pour /auth/login
 * Objectif: limiter les tentatives de connexion (anti brute-force)
 */
const loginLimiter = rateLimit({
  windowMs: ENV.RATE_WINDOW_MIN * 60 * 1000, // basé sur env
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    return next(new AppError(429, 'RATE_LIMITED', 'Trop de tentatives. Réessaie dans quelques minutes.'));
  },
});

// limiter aussi /register (anti spam)
const registerLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    return next(new AppError(429, 'RATE_LIMITED', 'Trop de créations de compte. Réessaie dans quelques minutes.'));
  },
});

function signToken(user: { id: number; email: string; role: string }) {
  // JWT_SECRET est validé dans env.ts, donc présent ici
  const secret = ENV.JWT_SECRET;

  const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'];

  return jwt.sign({ id: user.id, email: user.email, role: user.role }, secret, { expiresIn });
}

// POST /auth/register
router.post('/register', registerLimiter, validate(RegisterSchema), async (req, res, next) => {
  try {
    const { email, password, nom, prenom } = req.body as {
      email: string;
      password: string;
      nom: string;
      prenom: string;
    };

    const existing = await prisma.utilisateur.findUnique({ where: { email } });
    if (existing) {
      return next(new AppError(409, 'EMAIL_ALREADY_USED', 'Email déjà utilisé'));
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.utilisateur.create({
      data: {
        email,
        motDePasse: passwordHash,
        nom,
        prenom,
        role: 'user',
        dateInscription: new Date(),
      },
      select: { id: true, email: true, role: true, nom: true, prenom: true, dateInscription: true },
    });

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    return res.status(201).json({ token, user });
  } catch {
    return next(new AppError(500, 'INTERNAL_SERVER_ERROR', 'Unexpected error'));
  }
});

// POST /auth/login
router.post('/login', loginLimiter, validate(LoginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const user = await prisma.utilisateur.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, motDePasse: true, nom: true, prenom: true, dateInscription: true },
    });

    // Message volontairement identique (anti user enumeration)
    if (!user) {
      return next(new AppError(401, 'INVALID_CREDENTIALS', 'Identifiants invalides'));
    }

    const ok = await bcrypt.compare(password, user.motDePasse);
    if (!ok) {
      return next(new AppError(401, 'INVALID_CREDENTIALS', 'Identifiants invalides'));
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    const { motDePasse, ...safeUser } = user;

    return res.json({ token, user: safeUser });
  } catch {
    return next(new AppError(500, 'INTERNAL_SERVER_ERROR', 'Unexpected error'));
  }
});

// GET /auth/me (protégé)
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.utilisateur.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, nom: true, prenom: true, dateInscription: true },
    });

    if (!user) {
      return next(new AppError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable'));
    }

    return res.json({ user });
  } catch {
    return next(new AppError(500, 'INTERNAL_SERVER_ERROR', 'Unexpected error'));
  }
});

export default router;

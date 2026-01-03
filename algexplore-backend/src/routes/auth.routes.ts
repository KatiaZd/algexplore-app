import { Router } from 'express';
import bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { prisma } from '../prisma'; // adapte si ton import Prisma est ailleurs
import { requireAuth } from '../middlewares/requireAuth';


const router = Router();
router.get('/ping', (_req, res) => {
  res.status(200).json({ ok: true });
});


const signToken = (user: { id: number; email: string; role: string }) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET manquant');

  const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'];

  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    secret,
    { expiresIn }
  );
};


// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, nom, prenom } = req.body as {
      email?: string;
      password?: string;
      nom?: string;
      prenom?: string;
    };

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    const existing = await prisma.utilisateur.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Email déjà utilisé' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.utilisateur.create({
      data: {
        email,
        motDePasse: passwordHash,
        nom: nom ?? '',
        prenom: prenom ?? '',
        role: 'user',
        dateInscription: new Date(),
      },
      select: { id: true, email: true, role: true, nom: true, prenom: true, dateInscription: true },
    });

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    return res.status(201).json({ token, user });
  } catch (e) {
    return res.status(500).json({ message: 'Erreur serveur', error: String(e) });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    const user = await prisma.utilisateur.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, motDePasse: true, nom: true, prenom: true, dateInscription: true },
    });

    if (!user) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    const ok = await bcrypt.compare(password, user.motDePasse);
    if (!ok) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    // On ne renvoie jamais le hash
    const { motDePasse, ...safeUser } = user;

    return res.json({ token, user: safeUser });
  } catch (e) {
    return res.status(500).json({ message: 'Erreur serveur', error: String(e) });
  }
});

// GET /auth/me (protégé)
router.get('/me', requireAuth, async (req, res) => {
  const userId = req.user!.id;

  const user = await prisma.utilisateur.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, nom: true, prenom: true, dateInscription: true },
  });

  return res.json({ user });
});

export default router;
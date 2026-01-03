import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type AuthUser = {
  id: number;
  email: string;
  role: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Non authentifié' });
  }

  const token = header.slice('Bearer '.length);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({ message: 'JWT_SECRET manquant côté serveur' });
  }

  try {
    const payload = jwt.verify(token, secret) as AuthUser;
    req.user = { id: payload.id, email: payload.email, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ message: 'Token invalide ou expiré' });
  }
}
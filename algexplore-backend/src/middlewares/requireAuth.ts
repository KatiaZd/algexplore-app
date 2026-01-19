import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors/AppError';
import { ENV } from '../config/env';

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

/** Extrait le token d'un header "Bearer <token>" */
function extractBearerToken(header?: string): string | null {
  if (!header) return null;

  const parts = header.trim().split(/\s+/); // gère plusieurs espaces
  if (parts.length !== 2) return null;

  const [scheme, token] = parts;
  if (scheme !== 'Bearer' || !token) return null;

  return token;
}

/** Vérifie que le payload JWT contient bien les champs attendus */
function isAuthUserPayload(payload: unknown): payload is AuthUser {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;

  return (
    typeof p.id === 'number' &&
    Number.isInteger(p.id) &&
    typeof p.email === 'string' &&
    p.email.length > 0 &&
    typeof p.role === 'string' &&
    p.role.length > 0
  );
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Non authentifié'));
  }

  // JWT_SECRET est validé au démarrage dans env.ts
  const secret = ENV.JWT_SECRET;

  try {
    const decoded: unknown = jwt.verify(token, secret);

    // jsonwebtoken peut renvoyer une string si le token a été signé différemment
    if (typeof decoded === 'string' || !isAuthUserPayload(decoded)) {
      return next(new AppError(401, 'INVALID_TOKEN', 'Token invalide ou expiré'));
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    return next();
  } catch {
    return next(new AppError(401, 'INVALID_TOKEN', 'Token invalide ou expiré'));
  }
}

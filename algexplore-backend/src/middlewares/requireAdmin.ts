import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(AppError.unauthorized('Non authentifié'));
  }

  if (req.user.role !== 'admin') {
    return next(AppError.forbidden('Accès réservé aux administrateurs'));
  }

  return next();
}


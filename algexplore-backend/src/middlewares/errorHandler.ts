import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Erreurs connues (métier / validation)
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  // Erreurs inattendues (technique) : réponse générique
  return res.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unexpected error' },
  });
}

import type { Request, Response, NextFunction } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../errors/AppError';

export const validate =
  (schema: ZodTypeAny) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Validation failed', {
          issues: parsed.error.issues.map(i => ({
            path: i.path,
            message: i.message,
          })),
        })
      );
    }

    req.body = parsed.data;
    return next();
  };

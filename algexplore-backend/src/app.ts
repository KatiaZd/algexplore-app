import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import cookieParser from 'cookie-parser';

import { ENV } from './config/env';
import { AppError } from './errors/AppError';
import { errorHandler } from './middlewares/errorHandler';

import lieuxRouter from './routes/lieux.routes';
import categoriesRouter from './routes/categories.routes';
import authRouter from './routes/auth.routes';
import avisRouter from './routes/avis.routes';
import favorisRouter from './routes/favoris.routes';

const app = express();
app.set('trust proxy', 1);

// Sécurité : masque Express
app.disable('x-powered-by');

// Sécurité headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS
app.use(
  cors({
    origin: (origin, cb) => {
      // Postman/curl (pas d'origin)
      if (!origin) return cb(null, true);

      if (ENV.CORS_ORIGIN_LIST.includes(origin)) return cb(null, true);

      // gérée par errorHandler
      return cb(AppError.forbidden('Origin not allowed by CORS'));
    },
    credentials: true,
  })
);

// Parsing
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Logs HTTP (pas de console.log)
app.use(pinoHttp());

// Rate limiting global
app.use(
  rateLimit({
    windowMs: ENV.RATE_WINDOW_MIN * 60 * 1000,
    max: ENV.RATE_MAX_REQ,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      return res.status(429).json({
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Trop de requêtes. Réessaie dans quelques minutes.',
        },
      });
    },
  })
);

// Static uploads
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'public', 'uploads')));

// Healthcheck
app.get('/health', (_req, res) => {
  return res.status(200).json({ status: 'ok' });
});

// Routes
app.use('/lieux', lieuxRouter);
app.use('/categories', categoriesRouter);
app.use('/auth', authRouter);
app.use('/avis', avisRouter);
app.use('/favoris', favorisRouter);

// Route de test (optionnel, à garder seulement en dev)
if (ENV.NODE_ENV !== 'production') {
  app.get('/boom', (_req, _res) => {
    throw new Error('Boom');
  });
}

// 404
app.use((_req, _res, next) => next(AppError.notFound()));

// Error handler (toujours en dernier)
app.use(errorHandler);

export default app;

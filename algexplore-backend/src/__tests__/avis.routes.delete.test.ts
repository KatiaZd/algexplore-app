import request from 'supertest';
import express from 'express';

// -------- Mocks --------
const prismaMock = {
  avis: {
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('../prisma', () => ({ prisma: prismaMock }));

// Mock auth : utilisateur connecté
jest.mock('../middlewares/requireAuth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 42 };
    next();
  },
}));

import avisRouter from '../routes/avis.routes';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/avis', avisRouter);
  return app;
}

describe('DELETE /avis/:id (Delete avis)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 204 when user is owner and delete succeeds', async () => {
    prismaMock.avis.findUnique.mockResolvedValue({
      id: 10,
      utilisateurId: 42,
    });

    prismaMock.avis.delete.mockResolvedValue({});

    const app = makeApp();

    const res = await request(app).delete('/avis/10');

    expect(res.status).toBe(204);

    expect(prismaMock.avis.findUnique).toHaveBeenCalledWith({
      where: { id: 10 },
      select: { id: true, utilisateurId: true },
    });

    expect(prismaMock.avis.delete).toHaveBeenCalledWith({
      where: { id: 10 },
    });
  });

  it('should return 403 when user is not owner', async () => {
    prismaMock.avis.findUnique.mockResolvedValue({
      id: 10,
      utilisateurId: 999,
    });

    const app = makeApp();

    const res = await request(app).delete('/avis/10');

    expect(res.status).toBe(403);
    expect(prismaMock.avis.delete).not.toHaveBeenCalled();
  });

  it('should return 404 when avis does not exist', async () => {
    prismaMock.avis.findUnique.mockResolvedValue(null);

    const app = makeApp();

    const res = await request(app).delete('/avis/999');

    expect(res.status).toBe(404);
    expect(prismaMock.avis.delete).not.toHaveBeenCalled();
  });
});

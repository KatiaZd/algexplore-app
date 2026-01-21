import request from 'supertest';
import express from 'express';

// ---------- Mocks ----------
const prismaMock = {
  avis: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../prisma', () => ({ prisma: prismaMock }));

// Mock requireAuth pour simuler un user connecté
jest.mock('../middlewares/requireAuth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 42 }; // user connecté
    next();
  },
}));

// Import router après les mocks
import avisRouter from '../routes/avis.routes';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/avis', avisRouter);
  return app;
}

describe('PATCH /avis/:id (Update avis)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 when user is owner and update succeeds', async () => {
    prismaMock.avis.findUnique.mockResolvedValue({ id: 10, utilisateurId: 42 });
    prismaMock.avis.update.mockResolvedValue({
      id: 10,
      note: 4,
      commentaire: 'Modifié',
      lieuId: 1,
      utilisateurId: 42,
    });

    const app = makeApp();

    const res = await request(app)
      .patch('/avis/10')
      .send({ note: 4, commentaire: 'Modifié' });

    expect(res.status).toBe(200);

    expect(prismaMock.avis.findUnique).toHaveBeenCalledWith({
      where: { id: 10 },
      select: { id: true, utilisateurId: true },
    });

    expect(prismaMock.avis.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: expect.objectContaining({
          note: 4,
          commentaire: 'Modifié',
        }),
      })
    );

    expect(res.body.avis).toBeDefined();
    expect(res.body.avis.id).toBe(10);
    expect(res.body.avis.note).toBe(4);
  });

  it('should return 403 when user is not owner', async () => {
    prismaMock.avis.findUnique.mockResolvedValue({ id: 10, utilisateurId: 999 });

    const app = makeApp();

    const res = await request(app).patch('/avis/10').send({ note: 5 });

    expect(res.status).toBe(403);
    expect(prismaMock.avis.update).not.toHaveBeenCalled();
  });

  it('should return 404 when avis does not exist', async () => {
    prismaMock.avis.findUnique.mockResolvedValue(null);

    const app = makeApp();

    const res = await request(app).patch('/avis/999').send({ note: 3 });

    expect(res.status).toBe(404);
    expect(prismaMock.avis.update).not.toHaveBeenCalled();
  });
});

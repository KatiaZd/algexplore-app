import request from 'supertest';
import express from 'express';

// 1) Mock requireAuth: injecte un user connecté
jest.mock('../middlewares/requireAuth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 42 };
    next();
  },
}));

// 2) Mock prisma: on évite la DB
const prismaMock = {
  lieu: { findUnique: jest.fn() },
  avis: { create: jest.fn() },
};
jest.mock('../prisma', () => ({ prisma: prismaMock }));

// 3) Import du router APRÈS les mocks
import avisRouter from '../routes/avis.routes';

describe('POST /avis (Create Avis)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 201 and create avis when lieu exists', async () => {
    prismaMock.lieu.findUnique.mockResolvedValue({ id: 10 });
    prismaMock.avis.create.mockResolvedValue({
      id: 1,
      note: 5,
      commentaire: 'Super',
      lieuId: 10,
      utilisateurId: 42,
    });

    const app = express();
    app.use(express.json());
    app.use('/avis', avisRouter);

    const res = await request(app)
      .post('/avis')
      .send({ lieuId: 10, note: 5, commentaire: '  Super  ' });

    expect(res.status).toBe(201);

    // Vérifie que le lieu a bien été checké
    expect(prismaMock.lieu.findUnique).toHaveBeenCalledWith({
      where: { id: 10 },
      select: { id: true },
    });

    // Vérifie que la création est appelée avec trimming + userId
    expect(prismaMock.avis.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lieuId: 10,
          utilisateurId: 42,
          note: 5,
          commentaire: 'Super',
        }),
      })
    );

    expect(res.body.avis).toBeDefined();
    expect(res.body.avis.note).toBe(5);
  });

  it('should return 404 if lieu does not exist', async () => {
    prismaMock.lieu.findUnique.mockResolvedValue(null);

    const app = express();
    app.use(express.json());
    app.use('/avis', avisRouter);

    const res = await request(app)
      .post('/avis')
      .send({ lieuId: 999, note: 4, commentaire: 'ok' });

    expect(res.status).toBe(404);
    expect(prismaMock.avis.create).not.toHaveBeenCalled();
  });
});

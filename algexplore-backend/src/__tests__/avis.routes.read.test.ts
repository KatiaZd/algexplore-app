import request from 'supertest';
import express from 'express';

// Mock prisma
const prismaMock = {
  avis: { findMany: jest.fn() },
};
jest.mock('../prisma', () => ({ prisma: prismaMock }));

// Import router après les mocks
import avisRouter from '../routes/avis.routes';

describe('GET /avis?lieuId= (Read avis by lieu)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 and list avis when lieuId is valid', async () => {
    prismaMock.avis.findMany.mockResolvedValue([
      {
        id: 1,
        note: 5,
        commentaire: 'Top',
        lieuId: 10,
        utilisateurId: 42,
        utilisateur: { id: 42, prenom: 'Katia', nom: 'Zouad' },
      },
    ]);

    const app = express();
    app.use(express.json());
    app.use('/avis', avisRouter);

    const res = await request(app).get('/avis').query({ lieuId: '10' });

    expect(res.status).toBe(200);
    expect(prismaMock.avis.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { lieuId: 10 },
        orderBy: { id: 'desc' },
      })
    );
    expect(res.body.avis).toBeDefined();
    expect(Array.isArray(res.body.avis)).toBe(true);
    expect(res.body.avis[0].lieuId).toBe(10);
  });

  it('should return 400 when lieuId is missing', async () => {
    const app = express();
    app.use(express.json());
    app.use('/avis', avisRouter);

    const res = await request(app).get('/avis');

    expect(res.status).toBe(400);
    expect(prismaMock.avis.findMany).not.toHaveBeenCalled();
  });

  it('should return 400 when lieuId is invalid', async () => {
    const app = express();
    app.use(express.json());
    app.use('/avis', avisRouter);

    const res = await request(app).get('/avis').query({ lieuId: 'abc' });

    expect(res.status).toBe(400);
    expect(prismaMock.avis.findMany).not.toHaveBeenCalled();
  });
});

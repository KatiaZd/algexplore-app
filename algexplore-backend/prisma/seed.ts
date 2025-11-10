/**
 * Seed AlgExplore
 * - Idempotent (rejouable sans doublons)
 * - Crée : quartiers, catégories, 2 lieux d'exemple, liaisons pivot, 1 photo/lieu,
 *   1 utilisateur de démo, 1 avis et 1 favori.
 *
 *   Côté serveur Express :
 *   app.use('/uploads', express.static(path.resolve(process.cwd(), 'public', 'uploads')))
 *   + images locales : public/uploads/lieux/1.jpg, 2.jpg, ...
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Helpers "ensure" (crée si absent, sinon renvoie l’existant)
 * → ici je peut utiliser upsert car Quartier.nom et Categorie.nom sont @unique.
 */
async function ensureQuartier(nom: string) {
  return prisma.quartier.upsert({
    where: { nom }, // Quartier.nom est @unique
    update: {},
    create: { nom },
  });
}

async function ensureCategorie(nom: string) {
  return prisma.categorie.upsert({
    where: { nom }, // Categorie.nom est @unique
    update: {},
    create: { nom },
  });
}

/**
 * Utilisateur : email est @unique → upsert OK.
 * motDePasse : mettre un vrai hash bcrypt au moment de l’auth.
 */
async function ensureUtilisateur(email: string, data: {
  nom: string;
  prenom: string;
  motDePasse: string;
  role: string;                 // 'admin' | 'user'
  dateInscription?: Date | null;
}) {
  return prisma.utilisateur.upsert({
    where: { email }, // Utilisateur.email est @unique
    update: {},
    create: {
      email,
      nom: data.nom,
      prenom: data.prenom,
      motDePasse: data.motDePasse,
      role: data.role,
      dateInscription: data.dateInscription ?? new Date(),
    },
  });
}

/**
 * Helper pour créer un lieu + rattacher quartier + catégories (table pivot).
 * - Crée le quartier/catégories si absents
 * - Si un lieu existe déjà (même nom + même quartierId), on le réutilise
 */
async function ensureLieuAvecCategories(input: {
  nom: string;
  description: string;
  adresse: string;
  dateCreation: Date;
  dateDebut?: Date | null;
  dateFin?: Date | null;
  prixAdulte?: string | null;
  prixEnfant?: string | null;
  latitude?: string | null;    // Decimal accepté en string
  longitude?: string | null;   // Decimal accepté en string
  publicCible?: string | null;
  urlInfos?: string | null;
  infosAcces?: string | null;
  quartierNom: string;         // Quartier.nom
  categories: string[];        // Categorie.nom
}) {
  const q = await ensureQuartier(input.quartierNom);

  // 1) Cherche un lieu existant sur le couple (nom + quartierId)
  let lieu = await prisma.lieu.findFirst({
    where: { nom: input.nom, quartierId: q.id },
  });

  // 2) Sinon, crée le lieu
  if (!lieu) {
    lieu = await prisma.lieu.create({
      data: {
        nom: input.nom,
        description: input.description,
        adresse: input.adresse,
        dateCreation: input.dateCreation,
        dateDebut: input.dateDebut ?? null,
        dateFin: input.dateFin ?? null,
        prixAdulte: input.prixAdulte ?? null,
        prixEnfant: input.prixEnfant ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        publicCible: input.publicCible ?? null,
        urlInfos: input.urlInfos ?? null,
        infosAcces: input.infosAcces ?? null,
        quartier: { connect: { id: q.id } },
      },
    });
  }

  // 3) Rattache les catégories via la table pivot (LieuCategorie)
  for (const nomCat of input.categories) {
    const cat = await ensureCategorie(nomCat);
    await prisma.lieuCategorie.upsert({
      where: {
        // @@id([lieuId, categorieId]) → sélecteur composite
        lieuId_categorieId: { lieuId: lieu.id, categorieId: cat.id },
      },
      update: {},
      create: { lieuId: lieu.id, categorieId: cat.id },
    });
  }

  return lieu;
}

async function main() {
  // --- Utilisateur de démo ---
  const user = await ensureUtilisateur('algexplore@gmail.com', {
    nom: 'Demo',
    prenom: 'User',
    motDePasse: 'algexplore', // à remplacer par bcrypt plus tard
    role: 'user',
  });

  // --- Catégories de base ---
  const baseCats = [
    'musée', 'restaurant', 'parc', 'architecture', 'histoire',
    'famille', 'café', 'concept-store', 'enfant', 'culture', 'nature', 'zoo', 'salon', 
  ];
  await Promise.all(baseCats.map(ensureCategorie));

  // --- Lieux 
  const lieu1 = await ensureLieuAvecCategories({
    nom: 'Musée National des Beaux-Arts',
    description:
      `Situé sur les hauteurs d’Alger, le Musée National des Beaux-Arts abrite une collection remarquable d’œuvres
       algériennes et internationales. L’espace mêle peintures, sculptures et arts décoratifs, dans un cadre apaisant
       propice à la découverte et à l’apprentissage. Incontournable pour les passionnés d’art comme pour les curieux.`,
    adresse: 'Rue Mohamed Belouizdad, Alger',
    dateCreation: new Date('1930-05-05'),
    prixAdulte: '500 DA',
    prixEnfant: '0-200 DA',
    latitude: '36.76600000',
    longitude: '3.06100000',
    publicCible: 'Adultes, familles, étudiants, amateurs d’art',
    urlInfos: 'https://exemple.dz/mnba',
    infosAcces: 'Bus, taxi, accès piéton facile',
    quartierNom: 'El Madania',
    categories: ['musée', 'histoire', 'architecture'],
  });

  const lieu2 = await ensureLieuAvecCategories({
    nom: 'Jardin d’Essai du Hamma',
    description:
      `Véritable poumon vert de la capitale, le Jardin d’Essai du Hamma séduit par ses allées ombragées,
       ses bassins et sa diversité botanique. On y vient pour se promener en famille, se ressourcer,
       photographier les paysages et découvrir une richesse végétale unique.`,
    adresse: 'Hamma, Alger',
    dateCreation: new Date('1832-01-01'),
    prixAdulte: '200 DA',
    prixEnfant: '100 DA',
    latitude: '36.74850000',
    longitude: '3.07110000',
    publicCible: 'Familles, touristes, scolaires',
    urlInfos: 'https://exemple.dz/hamma',
    infosAcces: 'Métro Jardin d’Essai + tram/bus',
    quartierNom: 'Hamma',
    categories: ['parc', 'histoire', 'famille'],
  });

  // --- Photos (V1 : 1 photo par lieu) ---
  await prisma.photo.upsert({
    where: { id: 1 }, // upsert sur PK arbitraire → idempotent minimal
    update: {
      url: `/uploads/lieux/${lieu1.id}.jpg`,
      description: 'Façade principale du musée',
      lieuId: lieu1.id,
    },
    create: {
      url: `/uploads/lieux/${lieu1.id}.jpg`,
      description: 'Façade principale du musée',
      lieuId: lieu1.id,
    },
  });

  await prisma.photo.upsert({
    where: { id: 2 },
    update: {
      url: `/uploads/lieux/${lieu2.id}.jpg`,
      description: 'Allée centrale du jardin',
      lieuId: lieu2.id,
    },
    create: {
      url: `/uploads/lieux/${lieu2.id}.jpg`,
      description: 'Allée centrale du jardin',
      lieuId: lieu2.id,
    },
  });

  // --- Avis (sur lieu1) ---
  const avisExist = await prisma.avis.findFirst({
    where: { utilisateurId: user.id, lieuId: lieu1.id },
  });
  if (!avisExist) {
    await prisma.avis.create({
      data: {
        note: 5,
        commentaire: 'Super visite, très riche et inspirante !',
        utilisateurId: user.id,
        lieuId: lieu1.id,
      },
    });
  }

  // --- Favori (clé primaire composite) ---
  await prisma.favori.upsert({
    where: { utilisateurId_lieuId: { utilisateurId: user.id, lieuId: lieu1.id } },
    update: {},
    create: { utilisateurId: user.id, lieuId: lieu1.id },
  });

  console.log('Seed terminé. Place les images : public/uploads/lieux/{id}.jpg');
}

main()
  .catch((e) => {
    console.error('Seed échoué', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

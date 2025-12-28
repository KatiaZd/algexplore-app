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
  isPermanent?: boolean;
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
  categoriePrincipale: string; 
}) {
  const q = await ensureQuartier(input.quartierNom);

  // 1) Cherche un lieu existant sur le couple (nom + quartierId)
  let lieu = await prisma.lieu.findFirst({
    where: { nom: input.nom, quartierId: q.id },
  });

  // 2) Si le lieu existe -> on le met à jour (sinon tes modifs de seed ne se verront jamais)
  if (lieu) {
    lieu = await prisma.lieu.update({
      where: { id: lieu.id },
      data: {
        nom: input.nom,
        description: input.description,
        adresse: input.adresse,
        categoriePrincipale: input.categoriePrincipale,
        isPermanent: input.isPermanent ?? false,
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
  } else {
    // 3) Sinon -> crée le lieu
    lieu = await prisma.lieu.create({
      data: {
        nom: input.nom,
        description: input.description,
        adresse: input.adresse,
        categoriePrincipale: input.categoriePrincipale,
        isPermanent: input.isPermanent ?? false,
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

  // 4) Rattache les catégories via la table pivot (LieuCategorie)
  for (const nomCat of input.categories) {
    const cat = await ensureCategorie(nomCat);
    await prisma.lieuCategorie.upsert({
      where: {
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
    'evenement', 'balades', 'patrimoine', 'culture', 'cafe',
    'artisanat', 'enfant', 
  ];
  await Promise.all(baseCats.map(ensureCategorie));

  // --- Lieux 
  const parcZoologique = await ensureLieuAvecCategories({
    nom: 'Parc Zoologique de Ben Aknoun',
    description:
      `Le Parc Zoologique et des Loisirs de Ben Aknoun est l'un des lieux emblématiques d'Alger, niché entre la verdure de Ben Aknoun et les hauteurs d'Hydra.  Véritable poumon vert de la capitale, il s'étend sur plus de 300 hectares mêlant espaces boisés, zones de détente et aires dédiées à la découverte animale. Inauguré au début des années 1980, le parc a longtemps été un lieu incontournable pour les familles algéroises, attirées par son ambiance à la fois éducative et récréative. On y croise des girafes, des lions, des zèbres, des singes ou encore des autruches, répartis dans de vastes enclos ombragés. L'endroit accueille aujourd'hui plus d'un millier d'animaux issus d'une centaine d'espèces différentes, offrant aux visiteurs un aperçu de la faune africaine et mondiale.
      Outre la partie zoologique, le site comprend un grand espace de loisirs avec des manèges, un petit train touristique et des coins pique-nique aménagés, faisant du parc un lieu privilégié pour les sorties en famille ou entre amis. Malgré une période de déclin, marquée par un manque d'entretien et des installations vieillissantes, le Parc de Ben Aknoun connaît depuis peu un projet de rénovation d'envergure, avec la création d'un parc safari moderne et la réhabilitation progressive des infrastructures.
      Facilement accessible depuis le centre d'Alger, il offre une parenthèse nature au cœur de la ville et demeure un lieu chargé de nostalgie pour plusieurs générations. Entre balade sous les pins, observation des animaux et moments de détente en plein air, le Parc Zoologique de Ben Aknoun continue de séduire ceux qui recherchent un contact authentique avec la nature, à quelques minutes seulement de l'agitation urbaine.`,
    adresse: 'Route du Zoo, Ben Aknoun, Alger',
    isPermanent: true,
    prixAdulte: '200 DA',
    prixEnfant: '100 DA',
    latitude: '36.74500000',
    longitude: '3.00300000',
    publicCible: 'Familles, enfants, amoureux de la nature',
    urlInfos: 'https://www.parcbenaknoun.dz/',
    infosAcces: "Accès en bus via la station « Ben Aknoun Zoo » desservie par les lignes 6 et 51, ou en taxi depuis le centre-ville (15 min environ). Parking disponible sur place.",
    quartierNom: 'Ben Aknoun',
    categoriePrincipale: 'balades',
    categories: ['parc', 'zoo', 'loisirs', 'famille', 'enfants', 'nature'],
  });

  const jardinDessai = await ensureLieuAvecCategories({
    nom: 'Jardin d’Essai du Hamma',
    description:
      `Véritable poumon vert de la capitale, le Jardin d'Essai du Hamma séduit par ses allées ombragées,
       ses bassins et sa diversité botanique. On y vient pour se promener en famille, se ressourcer,
       photographier les paysages et découvrir une richesse végétale unique.`,
    adresse: 'Hamma, Alger',
    isPermanent: true,
    prixAdulte: '200 DA',
    prixEnfant: '100 DA',
    latitude: '36.74850000',
    longitude: '3.07110000',
    publicCible: 'Familles, touristes, scolaires',
    urlInfos: 'https://exemple.dz/hamma',
    infosAcces: 'Métro Jardin d’Essai + tram/bus',
    quartierNom: 'Hamma',
    categoriePrincipale: 'balades',
    categories: ['parc', 'histoire', 'famille'],
  });

  const algerire = await ensureLieuAvecCategories({
  nom: "Alge’Rire",
  description: 
    `Alge’Rire est un festival de l’humour incontournable à Alger, réunissant chaque année
     des humoristes algériens et internationaux. Pendant plusieurs jours, le public assiste
     à des spectacles variés mêlant stand-up, théâtre comique et one-man-shows, dans une
     ambiance festive et conviviale. L’événement attire un public large et contribue
     au dynamisme culturel de la capitale.`,
  adresse: 'Opéra d’Alger Boualem Bessaïh, Ouled Fayet',
  isPermanent: false,
  dateDebut: new Date('2026-03-15'),
  dateFin: new Date('2026-04-01'),
  prixAdulte: '1500 DA',
  prixEnfant: '700 DA',
  latitude: '36.73390000',
  longitude: '2.94460000',
  publicCible: 'Adultes, jeunes adultes, amateurs de spectacles',
  urlInfos: 'https://www.algerire.dz',
  infosAcces: 'Accès en voiture ou taxi depuis le centre-ville. Parking disponible à proximité.',
  quartierNom: 'Ouled Fayet',
  categoriePrincipale: 'evenement',
  categories: ['culture', 'festival', 'spectacle'],
});

const atelierElFen = await ensureLieuAvecCategories({
  nom: 'Atelier El Fen',
  description:
    `Atelier El Fen est un atelier de céramique artisanale situé au cœur d’Alger Centre.
     Ce lieu propose des initiations et des ateliers créatifs autour du modelage,
     du tournage et de l’émaillage, dans une ambiance conviviale et intimiste.
     Ouvert aussi bien aux débutants qu’aux amateurs confirmés, l’atelier valorise
     le travail manuel, la transmission du savoir-faire et la création locale.`,
  adresse: 'Rue Didouche Mourad, Alger Centre',
  isPermanent: true,
  prixAdulte: '3000 DA',
  prixEnfant: '1500 DA',
  latitude: '36.77090000',
  longitude: '3.05890000',
  publicCible: 'Adultes, adolescents, amateurs d’art et de loisirs créatifs',
  urlInfos: 'https://atelier-elfen.dz',
  infosAcces: 'Accessible à pied depuis la Grande Poste. Bus et métro à proximité.',
  quartierNom: 'Alger Centre',
  categoriePrincipale: 'artisanat',
  categories: ['artisanat', 'atelier', 'creatif'],
});

const bloomConceptStore = await ensureLieuAvecCategories({
  nom: 'Bloom Concept Store',
  description:
    `Bloom Concept Store est un concept-store artisanal situé à Alger Centre, dédié aux objets de
     décoration et à la céramique contemporaine. Le lieu propose une sélection de pièces uniques
     et de petites séries réalisées par des artisans et créateurs locaux : vaisselle en céramique,
     objets décoratifs, accessoires pour la maison et idées cadeaux. Bloom se veut un espace
     chaleureux et inspirant, favorisant la découverte, le fait-main et le savoir-faire algérien.`,
  adresse: '12 rue Didouche Mourad, Alger Centre',
  isPermanent: true,
  prixAdulte: null,
  prixEnfant: null,
  latitude: '36.77180000',
  longitude: '3.05860000',
  publicCible: 'Amateurs de design, décoration, artisanat, cadeaux',
  urlInfos: 'https://bloom-conceptstore.dz',
  infosAcces: 'Situé à proximité de la Grande Poste. Accès facile à pied, métro Tafourah–Grande Poste et bus.',
  quartierNom: 'Alger Centre',
  categoriePrincipale: 'artisanat',
  categories: ['concept-store', 'artisanat', 'culture', 'shopping'],
});

const sunnyBrunch = await ensureLieuAvecCategories({
  nom: 'Sunny Brunch',
  description:
    `Sunny Brunch est une adresse conviviale située à Alger Centre, spécialisée dans les brunchs
     faits maison et les petits-déjeuners tardifs. Le lieu propose une carte mêlant classiques
     revisités, options sucrées et salées, jus frais et boissons chaudes, dans une ambiance
     lumineuse et décontractée. Sunny Brunch est apprécié pour ses assiettes généreuses,
     son décor épuré et son accueil chaleureux.`,
  adresse: '8 rue Pasteur, Alger Centre',
  isPermanent: true,
  prixAdulte: null,
  prixEnfant: null,
  latitude: '36.77240000',
  longitude: '3.06020000',
  publicCible: 'Jeunes adultes, familles, amateurs de brunch et cafés',
  urlInfos: 'https://sunnybrunch.dz',
  infosAcces: 'À quelques minutes à pied de la Grande Poste. Métro Tafourah–Grande Poste et lignes de bus à proximité.',
  quartierNom: 'Alger Centre',
  categoriePrincipale: 'cafe',
  categories: ['restaurant', 'brunch', 'cafe'],
});

const lesPagesVagabondes = await ensureLieuAvecCategories({
  nom: 'Les Pages Vagabondes',
  description:
    `Les Pages Vagabondes est un café-librairie niché à El Madania, pensé comme un lieu de rencontre
     autour de la lecture, de l’écriture et de la culture. On y trouve une sélection de romans,
     essais, livres jeunesse et ouvrages indépendants, accompagnée d’une petite carte de cafés,
     thés et pâtisseries. Le lieu accueille régulièrement des rencontres littéraires, lectures
     et échanges culturels dans une ambiance chaleureuse et intimiste.`,
  adresse: '18 rue Larbi Ben M’hidi, El Madania, Alger',
  isPermanent: true,
  prixAdulte: null,
  prixEnfant: null,
  latitude: '36.75460000',
  longitude: '3.06090000',
  publicCible: 'Lecteurs, étudiants, amateurs de culture, écrivains',
  urlInfos: 'https://lespagesvagabondes.dz',
  infosAcces: 'Accessible en bus et taxi depuis le centre-ville. Quartier calme et résidentiel.',
  quartierNom: 'El Madania',
  categoriePrincipale: 'cafe',
  categories: ['cafe', 'librairie', 'culture', 'lecture'],
});

const focusCafe = await ensureLieuAvecCategories({
  nom: 'Focus Café',
  description:
    `Focus Café est un café dédié aux télétravailleurs et freelances, situé à Bir Mourad Raïs.
     Le lieu propose un environnement calme et fonctionnel, avec Wi-Fi haut débit, prises
     électriques à chaque table et espaces adaptés au travail individuel. La carte met à
     l’honneur cafés de spécialité, boissons chaudes et encas légers, permettant de travailler
     confortablement tout au long de la journée.`,
  adresse: '3 rue des Frères Bouadou, Bir Mourad Raïs, Alger',
  isPermanent: true,
  prixAdulte: null,
  prixEnfant: null,
  latitude: '36.73820000',
  longitude: '3.03140000',
  publicCible: 'Télétravailleurs, freelances, étudiants, entrepreneurs',
  urlInfos: 'https://focuscafe.dz',
  infosAcces: 'Accès facile en voiture ou taxi. Stationnement possible à proximité.',
  quartierNom: 'Bir Mourad Raïs',
  categoriePrincipale: 'cafe',
  categories: ['cafe', 'coworking', 'teletravail', 'calme'],
});

const capCaxine = await ensureLieuAvecCategories({
  nom: 'Cap Caxine',
  description:
    `Cap Caxine est un site naturel situé sur le littoral ouest d’Alger, offrant une vue dégagée
     sur la mer Méditerranée. Apprécié pour ses falaises, ses sentiers et ses panoramas, le lieu
     attire les amateurs de balades, de photographie et de couchers de soleil. Cap Caxine est
     un espace de respiration prisé par les habitants, idéal pour une sortie nature à proximité
     de la ville.`,
  adresse: 'Cap Caxine, Alger',
  isPermanent: true,
  prixAdulte: null,
  prixEnfant: null,
  latitude: '36.76420000',
  longitude: '2.95230000',
  publicCible: 'Promeneurs, amateurs de nature, photographes, familles',
  urlInfos: null,
  infosAcces: 'Accessible en voiture ou taxi depuis le centre-ville. Stationnement possible à proximité.',
  quartierNom: 'Caxine',
  categoriePrincipale: 'balades',
  categories: ['nature', 'balades', 'vue', 'mer'],
});

const casbahAlger = await ensureLieuAvecCategories({
  nom: 'La Casbah d’Alger',
  description:
    `Classée au patrimoine mondial de l’UNESCO, la Casbah d’Alger est le cœur historique
     et culturel de la capitale. Ce labyrinthe de ruelles, de maisons traditionnelles,
     de palais et de mosquées témoigne de plusieurs siècles d’histoire et d’architecture.
     La Casbah est un lieu vivant, mêlant patrimoine, artisanat, mémoire collective et
     vie quotidienne, offrant une immersion unique dans l’histoire d’Alger.`,
  adresse: 'Casbah d’Alger',
  isPermanent: true,
  prixAdulte: null,
  prixEnfant: null,
  latitude: '36.78600000',
  longitude: '3.05880000',
  publicCible: 'Touristes, passionnés d’histoire, habitants, scolaires',
  urlInfos: 'https://whc.unesco.org/fr/list/565',
  infosAcces: 'Accessible à pied depuis la Grande Poste ou en taxi. Visites guidées recommandées.',
  quartierNom: 'Casbah',
  categoriePrincipale: 'patrimoine',
  categories: ['histoire', 'patrimoine', 'culture', 'architecture'],
});

const terraVerde = await ensureLieuAvecCategories({
  nom: 'Terra Verde – Centre Éducatif Environnemental',
  description:
    `Terra Verde est un centre éducatif environnemental situé à Ben Aknoun, dédié à la
     sensibilisation des enfants à la nature et à l’écologie. Le lieu propose des activités
     ludiques et pédagogiques autour du jardinage, du recyclage, de la biodiversité et de
     la protection de l’environnement. Ateliers créatifs, parcours nature et animations
     encadrées permettent aux enfants d’apprendre en s’amusant, dans un cadre sécurisé
     et verdoyant.`,
  adresse: 'Chemin forestier de Ben Aknoun, Alger',
  isPermanent: true,
  prixAdulte: null,
  prixEnfant: '500 DA',
  latitude: '36.74590000',
  longitude: '3.00480000',
  publicCible: 'Enfants, familles, groupes scolaires',
  urlInfos: 'https://terraverde-alger.dz',
  infosAcces: 'Accès en bus ou taxi depuis Ben Aknoun. Parking disponible à proximité.',
  quartierNom: 'Ben Aknoun',
  categoriePrincipale: 'enfant',
  categories: ['enfant', 'nature', 'education', 'famille', 'ecologie'],
});

const cinemaDesRivages = await ensureLieuAvecCategories({
  nom: 'Cinéma des Rivages',
  description:
    `Cinéma des Rivages est un festival annuel dédié au cinéma d’auteur et aux productions
     méditerranéennes, organisé à Sidi Fredj. Projections en plein air, rencontres avec des
     réalisateurs, ateliers et débats rythment plusieurs jours de programmation dans un
     cadre maritime unique. Le festival vise à rendre le cinéma accessible à tous et à
     favoriser les échanges culturels autour de l’image.`,
  adresse: 'Esplanade de Sidi Fredj, Alger',
  isPermanent: false,
  dateDebut: new Date('2026-06-20'),
  dateFin: new Date('2026-06-27'),
  prixAdulte: '1000 DA',
  prixEnfant: '500 DA',
  latitude: '36.74890000',
  longitude: '2.83560000',
  publicCible: 'Amateurs de cinéma, étudiants, familles, professionnels de la culture',
  urlInfos: 'https://cinemadesrivages.dz',
  infosAcces: 'Accès en voiture ou bus depuis Alger. Parking disponible à Sidi Fredj.',
  quartierNom: 'Sidi Fredj',
  categoriePrincipale: 'evenement',
  categories: ['culture', 'cinema', 'festival', 'evenement'],
});

const nuitsDuChaabi = await ensureLieuAvecCategories({
  nom: 'Nuits du Chaâbi',
  description:
    `Nuits du Chaâbi est un festival dédié à la chanson chaâbi algéroise, célébrant
     ce patrimoine musical emblématique à travers des concerts, hommages et rencontres
     artistiques. Organisé à Bab El Oued, le festival met à l’honneur les grandes figures
     du chaâbi ainsi que la nouvelle génération d’artistes, dans une ambiance populaire
     et conviviale, ouverte à tous.`,
  adresse: 'Théâtre de Verdure de Bab El Oued, Alger',
  isPermanent: false,
  dateDebut: new Date('2026-07-05'),
  dateFin: new Date('2026-07-09'),
  prixAdulte: '800 DA',
  prixEnfant: '400 DA',
  latitude: '36.79540000',
  longitude: '3.04920000',
  publicCible: 'Amateurs de musique chaâbi, familles, passionnés de culture algérienne',
  urlInfos: 'https://nuits-du-chaabi.dz',
  infosAcces: 'Accessible en bus et taxi depuis le centre-ville. Ambiance populaire, arrivée conseillée en avance.',
  quartierNom: 'Bab El Oued',
  categoriePrincipale: 'evenement',
  categories: ['musique', 'chaabi', 'culture', 'festival'],
});

const foretDeBainem = await ensureLieuAvecCategories({
  nom: 'Forêt de Bainem',
  description:
    `La Forêt de Bainem est l’un des principaux espaces naturels de l’ouest algérois.
     Étendue sur les hauteurs surplombant la Méditerranée, elle offre de vastes zones boisées,
     des sentiers de promenade et des points de vue remarquables. Le site est apprécié pour
     les balades en famille, les activités de plein air et les moments de détente au cœur
     de la nature, à quelques minutes seulement de la ville.`,
  adresse: 'Forêt de Bainem, Alger',
  isPermanent: true,
  prixAdulte: null,
  prixEnfant: null,
  latitude: '36.78750000',
  longitude: '2.90360000',
  publicCible: 'Familles, randonneurs, sportifs, amateurs de nature',
  urlInfos: null,
  infosAcces: 'Accessible en voiture ou taxi depuis Alger Ouest. Aires de stationnement à proximité.',
  quartierNom: 'Bainem',
  categoriePrincipale: 'balades',
  categories: ['nature', 'foret', 'balades', 'famille'],
});

const lesSablettes = await ensureLieuAvecCategories({
  nom: 'Les Sablettes',
  description:
    `Les Sablettes est un vaste espace de loisirs aménagé en bord de mer à l’est d’Alger.
     Le site propose des promenades en front de mer, des aires de jeux pour enfants,
     des espaces sportifs, des cafés et des zones de détente. Très fréquenté par les
     familles et les jeunes, Les Sablettes est un lieu idéal pour profiter du littoral,
     se promener, faire du sport ou passer un moment convivial en plein air.`,
  adresse: 'Les Sablettes, Alger',
  isPermanent: true,
  prixAdulte: null,
  prixEnfant: null,
  latitude: '36.76180000',
  longitude: '3.10990000',
  publicCible: 'Familles, jeunes, sportifs, promeneurs',
  urlInfos: 'https://lessablettes.dz',
  infosAcces: 'Accessible en tramway (station Les Sablettes), bus et voiture. Parking disponible.',
  quartierNom: 'Les Sablettes',
  categoriePrincipale: 'balades',
  categories: ['mer', 'loisirs', 'famille', 'balades'],
});

const ramadanCreatif = await ensureLieuAvecCategories({
  nom: 'Ramadan Créatif – Marché des Créateurs',
  description:
    `Ramadan Créatif est un marché éphémère organisé aux Sablettes pendant le mois de
     Ramadan 2026. Le marché met à l’honneur les créateurs et artisans locaux à travers
     des stands de céramique, décoration, accessoires, artisanat textile et produits faits
     main. L’événement se déroule en fin de journée et en soirée, dans une ambiance conviviale
     et familiale, propice à la découverte et au partage.`,
  adresse: 'Les Sablettes, Alger',
  isPermanent: false,
  dateDebut: new Date('2026-02-17'),
  dateFin: new Date('2026-03-18'),
  prixAdulte: null,
  prixEnfant: null,
  latitude: '36.76180000',
  longitude: '3.10990000',
  publicCible: 'Familles, amateurs d’artisanat, visiteurs, touristes',
  urlInfos: 'https://ramadan-creatif.dz',
  infosAcces: 'Accessible en tramway, bus et voiture. Activités principalement en soirée.',
  quartierNom: 'Les Sablettes',
  categoriePrincipale: 'artisanat',
  categories: ['artisanat', 'marche', 'ramadan', 'evenement', 'famille'],
});

const maqamEchahid = await ensureLieuAvecCategories({
  nom: 'Maqam Echahid (Monument des Martyrs)',
  description:
    `Le Maqam Echahid, également appelé Monument des Martyrs, est l’un des symboles les plus
     emblématiques d’Alger et de l’histoire algérienne. Inauguré en 1982, le monument rend
     hommage aux martyrs de la guerre de libération nationale. Situé sur les hauteurs d’El
     Madania, il offre une vue panoramique sur la ville et constitue un lieu de mémoire,
     de recueillement et de transmission de l’histoire.`,
  adresse: 'Maqam Echahid, El Madania, Alger',
  isPermanent: true,
  prixAdulte: '500 DA',
  prixEnfant: '250 DA',
  latitude: '36.74530000',
  longitude: '3.06660000',
  publicCible: 'Familles, scolaires, touristes, citoyens',
  urlInfos: 'https://www.algeria.com/maqam-echahid',
  infosAcces: 'Accessible en voiture, bus ou téléphérique depuis différents quartiers d’Alger.',
  quartierNom: 'El Madania',
  categoriePrincipale: 'patrimoine',
  categories: ['histoire', 'memoire', 'patrimoine', 'monument', 'culture'],
});

const museeBeauxArts = await ensureLieuAvecCategories({
  nom: 'Musée National des Beaux-Arts d’Alger',
  description:
    `Le Musée National des Beaux-Arts d’Alger est l’un des plus importants musées d’Afrique
     et du monde arabe. Situé sur les hauteurs du Hamma, à proximité du Jardin d’Essai,
     il abrite une riche collection d’œuvres algériennes et internationales : peintures,
     sculptures, arts graphiques et expositions temporaires. Le musée constitue un lieu
     majeur de diffusion culturelle, de découverte artistique et de médiation pour tous
     les publics.`,
  adresse: 'Rue Mohamed Belouizdad, Hamma, Alger',
  isPermanent: true,
  prixAdulte: '200 DA',
  prixEnfant: '100 DA',
  latitude: '36.74800000',
  longitude: '3.07180000',
  publicCible: 'Amateurs d’art, étudiants, familles, touristes, scolaires',
  urlInfos: 'https://www.museebeauxarts-alger.dz',
  infosAcces: 'Accessible via le Jardin d’Essai du Hamma. Bus et métro à proximité.',
  quartierNom: 'Hamma',
  categoriePrincipale: 'culture',
  categories: ['musee', 'art', 'culture', 'patrimoine'],
});

const museeDesEnfants = await ensureLieuAvecCategories({
  nom: 'Le Petit Explorateur – Musée des Enfants',
  description:
    `Le Petit Explorateur est un musée interactif dédié aux enfants, situé à Ben Aknoun.
     Pensé comme un espace ludique et éducatif, le musée propose des parcours thématiques,
     des ateliers pratiques et des installations interactives autour de la science,
     de la nature, de l’art et de la découverte du monde. Le lieu encourage l’apprentissage
     par le jeu et la curiosité, dans un environnement sécurisé et adapté aux plus jeunes.`,
  adresse: 'Parc éducatif de Ben Aknoun, Alger',
  isPermanent: true,
  prixAdulte: '300 DA',
  prixEnfant: '150 DA',
  latitude: '36.74480000',
  longitude: '3.00620000',
  publicCible: 'Enfants, familles, groupes scolaires',
  urlInfos: 'https://lepetitexplorateur.dz',
  infosAcces: 'Accès facile depuis Ben Aknoun en bus ou taxi. Parking à proximité.',
  quartierNom: 'Ben Aknoun',
  categoriePrincipale: 'enfant',
  categories: ['enfant', 'musee', 'éducation', 'famille', 'culture'],
});

const palaisDeLaCulture = await ensureLieuAvecCategories({
  nom: 'Palais de la Culture Moufdi Zakaria',
  description:
    `Le Palais de la Culture Moufdi Zakaria est un important complexe culturel situé à El Madania,
     accueillant tout au long de l’année des expositions, concerts, spectacles, conférences
     et festivals. Véritable carrefour culturel, le lieu met en valeur la création artistique
     algérienne et internationale et joue un rôle central dans la diffusion de la culture
     auprès du grand public.`,
  adresse: 'Avenue des Frères Bouadou, El Madania, Alger',
  isPermanent: true,
  prixAdulte: null,
  prixEnfant: null,
  latitude: '36.74460000',
  longitude: '3.06790000',
  publicCible: 'Grand public, étudiants, artistes, familles',
  urlInfos: 'https://palaisculture.dz',
  infosAcces: 'Accessible en bus et taxi depuis le centre-ville. Parking disponible à proximité.',
  quartierNom: 'El Madania',
  categoriePrincipale: 'culture',
  categories: ['culture', 'spectacle', 'exposition', 'patrimoine'],
});

const palaisDesRais = await ensureLieuAvecCategories({
  nom: 'Palais des Raïs (Bastion 23)',
  description:
    `Le Palais des Raïs, également connu sous le nom de Bastion 23, est un ensemble architectural
     ottoman situé en bord de mer, à l’entrée de la Casbah d’Alger. Composé de plusieurs palais
     historiques, le site accueille aujourd’hui des expositions, événements culturels et
     manifestations artistiques, tout en conservant une forte valeur patrimoniale.
     Il constitue un lieu emblématique du front de mer algérois, entre histoire, architecture
     et création contemporaine.`,
  adresse: 'Bastion 23, Basse Casbah, Alger',
  isPermanent: true,
  prixAdulte: '200 DA',
  prixEnfant: '100 DA',
  latitude: '36.79110000',
  longitude: '3.06030000',
  publicCible: 'Amateurs d’histoire, visiteurs, familles, scolaires, touristes',
  urlInfos: 'https://palaisdesrais.dz',
  infosAcces: 'Accessible à pied depuis la Casbah ou en taxi. Proche du front de mer.',
  quartierNom: 'Casbah',
  categoriePrincipale: 'patrimoine',
  categories: ['histoire', 'culture', 'architecture', 'exposition', 'patrimoine'],
});

const sunnyLandPark = await ensureLieuAvecCategories({
  nom: 'SunnyLand Park',
  description:
    `SunnyLand Park est un parc d’attractions en plein air situé à Zéralda, conçu pour
     accueillir les familles et les enfants dans un grand espace verdoyant. Le parc
     propose des manèges adaptés à tous les âges, des aires de jeux extérieures,
     des animations saisonnières et des espaces de restauration. SunnyLand Park
     est pensé comme un lieu de loisirs convivial, favorisant les activités de plein
     air et les moments partagés en famille.`,
  adresse: 'Route de Zéralda, Zéralda, Alger',
  isPermanent: true,
  prixAdulte: '1200 DA',
  prixEnfant: '600 DA',
  latitude: '36.71420000',
  longitude: '2.83950000',
  publicCible: 'Familles, enfants, groupes scolaires',
  urlInfos: 'https://sunnylandpark.dz',
  infosAcces: 'Accessible en voiture ou bus depuis Alger Ouest. Parking disponible à proximité.',
  quartierNom: 'Zéralda',
  categoriePrincipale: 'enfant',
  categories: ['parc', 'loisirs', 'famille', 'enfant', 'plein-air'],
});

const salonLivreAlgerien = await ensureLieuAvecCategories({
  nom: 'Salon du Livre Algérien',
  description:
    `Le Salon du Livre Algérien est un événement culturel dédié à la promotion de la
     littérature algérienne et francophone. Organisé en mars 2026 au Palais des Expositions
     d’Alger, le salon réunit éditeurs, auteurs, libraires et lecteurs autour de rencontres,
     dédicaces, conférences et animations culturelles. Il constitue un rendez-vous majeur
     pour valoriser la création littéraire et encourager la lecture auprès du grand public.`,
  adresse: 'Palais des Expositions – SAFEX, Pins Maritimes, Alger',
  isPermanent: false,
  dateDebut: new Date('2026-03-10'),
  dateFin: new Date('2026-04-01'),
  prixAdulte: '300 DA',
  prixEnfant: '150 DA',
  latitude: '36.72390000',
  longitude: '3.16520000',
  publicCible: 'Lecteurs, étudiants, familles, professionnels du livre',
  urlInfos: 'https://salondulivre-algerien.dz',
  infosAcces: 'Accessible en tramway (Pins Maritimes), bus et voiture. Grand parking sur site.',
  quartierNom: 'Pins Maritimes',
  categoriePrincipale: 'evenement',
  categories: ['culture', 'salon', 'evenement', 'salon du livre'],
});



  // --- Photos (V1 : 1 photo par lieu) ---
await prisma.photo.upsert({
  where: { lieuId: parcZoologique.id },
  update: {
    url: '/uploads/lieux/parc-zoologique.jpg',
    description: 'Vue générale du Parc Zoologique de Ben Aknoun',
  },
  create: {
    url: '/uploads/lieux/parc-zoologique.jpg',
    description: 'Vue générale du Parc Zoologique de Ben Aknoun',
    lieuId: parcZoologique.id,
  },
});

await prisma.photo.upsert({
  where: { lieuId: jardinDessai.id },
  update: {
    url: '/uploads/lieux/jardin-essai.jpg',
    description: 'Allée centrale du Jardin d’Essai du Hamma',
  },
  create: {
    url: '/uploads/lieux/jardin-essai.jpg',
    description: 'Allée centrale du Jardin d’Essai du Hamma',
    lieuId: jardinDessai.id,
  },
});

await prisma.photo.upsert({
  where: { lieuId: algerire.id },
  update: {
    url: '/uploads/lieux/algerire.jpg',
    description: 'Bannière du festival Alge’Rire',
  },
  create: {
    url: '/uploads/lieux/algerire.jpg',
    description: 'Bannière du festival Alge’Rire',
    lieuId: algerire.id,
  },
});

await prisma.photo.upsert({
  where: { lieuId: atelierElFen.id },
  update: {
    url: '/uploads/lieux/atelier-ceramique.jpg',
    description: 'Atelier de céramique à l’Atelier El Fen',
  },
  create: {
    url: '/uploads/lieux/atelier-ceramique.jpg',
    description: 'Atelier de céramique à l’Atelier El Fen',
    lieuId: atelierElFen.id,
  },
});

await prisma.photo.upsert({
  where: { lieuId: bloomConceptStore.id },
  update: {
    url: '/uploads/lieux/bloom-concept-store.jpg',
    description: 'Concept-store Bloom à Alger Centre',
  },
  create: {
    url: '/uploads/lieux/bloom-concept-store.jpg',
    description: 'Concept-store Bloom à Alger Centre',
    lieuId: bloomConceptStore.id,
  },
});

await prisma.photo.upsert({
  where: { lieuId: sunnyBrunch.id },
  update: {
    url: '/uploads/lieux/brunch.jpg',
    description: 'Sunny Brunch est une adresse conviviale située à Alger Centre',
  },
  create: {
    url: '/uploads/lieux/brunch.jpg',
    description: 'Sunny Brunch est une adresse conviviale située à Alger Centre',
    lieuId: sunnyBrunch.id,
  },
});

await prisma.photo.upsert({
  where: { lieuId: lesPagesVagabondes.id },
  update: {
    url: '/uploads/lieux/cafe-librairie.jpg',
    description: 'Les Pages Vagabondes est un café-librairie niché à El Madania',
  },
  create: {
    url: '/uploads/lieux/cafe-librairie.jpg',
    description: 'Les Pages Vagabondes est un café-librairie niché à El Madania',
    lieuId: lesPagesVagabondes.id,
  },
});

await prisma.photo.upsert({
  where: { lieuId: focusCafe.id },
  update: {
    url: '/uploads/lieux/cafe-tt.jpeg',
    description: 'Focus Café est un café dédié aux télétravailleurs et freelances',
  },
  create: {
    url: '/uploads/lieux/cafe-tt.jpeg',
    description: 'Focus Café est un café dédié aux télétravailleurs et freelances',
    lieuId: focusCafe.id,
  },
});

await prisma.photo.upsert({
  where: { lieuId: capCaxine.id },
  update: {
    url: '/uploads/lieux/cap-caxine.jpg',
    description: 'Cap Caxine est un site naturel situé sur le littoral ouest d’Alger',
  },
  create: {
    url: '/uploads/lieux/cap-caxine.jpg',
    description: 'Cap Caxine est un site naturel situé sur le littoral ouest d’Alger',
    lieuId: capCaxine.id,
  },
});

await prisma.photo.upsert({
  where: { lieuId: casbahAlger.id },
  update: {
    url: '/uploads/lieux/cashbah-alger.jpg',
    description: 'La Casbah d’Alger est le cœur historique et culturel de la capitale',
  },
  create: {
    url: '/uploads/lieux/cashbah-alger.jpg',
    description: 'La Casbah d’Alger est le cœur historique et culturel de la capitale',
    lieuId: casbahAlger.id,
  },
});

await prisma.photo.upsert({
  where: { lieuId: terraVerde.id },
  update: {
    url: '/uploads/lieux/centre-educatif-environnemental.jpg',
    description: 'Terra Verde est un centre éducatif environnemental dédié aux enfants situé à Ben Aknoun',
  },
  create: {
    url: '/uploads/lieux/centre-educatif-environnemental.jpg',
    description: 'Terra Verde est un centre éducatif environnemental dédié aux enfants situé à Ben Aknoun',
    lieuId: terraVerde.id,
  },
});

await prisma.photo.upsert({
  where: { lieuId: cinemaDesRivages.id },
  update: {
    url: '/uploads/lieux/cinema-et-memoire.jpeg',
    description: 'Cinéma des Rivages est un festival annuel dédié au cinéma d’auteur et aux productions méditerranéennes',
  },
  create: {
    url: '/uploads/lieux/cinema-et-memoire.jpeg',
    description: 'Cinéma des Rivages est un festival annuel dédié au cinéma d’auteur et aux productions méditerranéennes',
    lieuId: cinemaDesRivages.id,
  },
});

await prisma.photo.upsert({
  where: { lieuId: nuitsDuChaabi.id },
  update: {
    url: '/uploads/lieux/festival-chanson-chaabi.jpg',
    description: 'Le festival Nuits du Chaâbi célèbre la chanson chaâbi algéroise à travers des concerts et hommages',
  },
  create: {
    url: '/uploads/lieux/festival-chanson-chaabi.jpg',
    description: 'Le festival Nuits du Chaâbi célèbre la chanson chaâbi algéroise à travers des concerts et hommages',
    lieuId: nuitsDuChaabi.id,
  },
});

await prisma.photo.upsert({
  where: { lieuId: foretDeBainem.id },
  update: {
    url: '/uploads/lieux/foret-de-bainem.jpg',
    description: 'La forêt de Bainem est l’un des principaux espaces naturels de l’ouest algérois',
  },
  create: {
    url: '/uploads/lieux/foret-de-bainem.jpg',
    description: 'La forêt de Bainem est l’un des principaux espaces naturels de l’ouest algérois',
    lieuId: foretDeBainem.id,
  },
});

await prisma.photo.upsert({
  where: { lieuId: lesSablettes.id },
  update: {
    url: '/uploads/lieux/les-sablettes.jpg',
    description: 'Les Sablettes est un vaste espace de loisirs aménagé en bord de mer à l’est d’Alger',
  },
  create: {
    url: '/uploads/lieux/les-sablettes.jpg',
    description: 'Les Sablettes est un vaste espace de loisirs aménagé en bord de mer à l’est d’Alger',
    lieuId: lesSablettes.id,
  },
});

await prisma.photo.upsert({
  where: { lieuId: ramadanCreatif.id },
  update: {
    url: '/uploads/lieux/marche-des-createurs.jpg',
    description: 'Ramadan Créatif est un marché éphémère organisé aux Sablettes pendant le mois de Ramadan 2026',
  },
  create: {
    url: '/uploads/lieux/marche-des-createurs.jpg',
    description: 'Ramadan Créatif est un marché éphémère organisé aux Sablettes pendant le mois de Ramadan 2026',
    lieuId: ramadanCreatif.id,
  },
});

await prisma.photo.upsert({
  where: { lieuId: maqamEchahid.id },
  update: {
    url: '/uploads/lieux/monument.jpg',
    description: 'Maqam Echahid est l’un des symboles les plus emblématiques d’Alger et de l’histoire algérienne',
  },
  create: {
    url: '/uploads/lieux/monument.jpg',
    description: 'Maqam Echahid est l’un des symboles les plus emblématiques d’Alger et de l’histoire algérienne',
    lieuId: maqamEchahid.id,
  },
});

await prisma.photo.upsert({
  where: { lieuId: museeBeauxArts.id },
  update: {
    url: '/uploads/lieux/musee-beaux-arts-alger-173.jpg',
    description: 'Le musée National des Beaux-Arts d’Alger est l’un des plus importants musées d’Afrique et du monde arabe',
  },
  create: {
    url: '/uploads/lieux/musee-beaux-arts-alger-173.jpg',
    description: 'Le musée National des Beaux-Arts d’Alger est l’un des plus importants musées d’Afrique et du monde arabe',
    lieuId: museeBeauxArts.id,
  },
});

await prisma.photo.upsert({
  where: { lieuId: museeDesEnfants.id },
  update: {
    url: '/uploads/lieux/musee-des-enfants.jpg',
    description: 'Le musée des enfants est un lieu ludique et éducatif à Ben Aknoun',
  },
  create: {
    url: '/uploads/lieux/musee-des-enfants.jpg',
    description: 'Le musée des enfants est un lieu ludique et éducatif à Ben Aknoun',
    lieuId: museeDesEnfants.id,
  },
});

await prisma.photo.upsert({
  where: { lieuId: palaisDeLaCulture.id },
  update: {
    url: '/uploads/lieux/palais-de-la-culture.jpg',
    description: 'Le palais de la culture Moufdi Zakaria est un important complexe culturel situé à El Madania',
  },
  create: {
    url: '/uploads/lieux/palais-de-la-culture.jpg',
    description: 'Le palais de la culture Moufdi Zakaria est un important complexe culturel situé à El Madania',
    lieuId: palaisDeLaCulture.id,
  },
});

await prisma.photo.upsert({
  where: { lieuId: palaisDesRais.id },
  update: {
    url: '/uploads/lieux/palais-des-rais.jpg',
    description: 'Le palais des Raïs est un ensemble architectural ottoman situé en bord de mer, à l’entrée de la Casbah d’Alger',
  },
  create: {
    url: '/uploads/lieux/palais-des-rais.jpg',
    description: 'Le palais des Raïs est un ensemble architectural ottoman situé en bord de mer, à l’entrée de la Casbah d’Alger',
    lieuId: palaisDesRais.id,
  },
});

await prisma.photo.upsert({
  where: { lieuId: sunnyLandPark.id },
  update: {
    url: '/uploads/lieux/parc-dattraction.jpg',
    description: 'Sunny Land Park est un parc d’attractions en plein air situé à Zéralda',
  },
  create: {
    url: '/uploads/lieux/parc-dattraction.jpg',
    description: 'Sunny Land Park est un parc d’attractions en plein air situé à Zéralda',
    lieuId: sunnyLandPark.id,
  },
});

await prisma.photo.upsert({
  where: { lieuId: salonLivreAlgerien.id },
  update: {
    url: '/uploads/lieux/salon-du-livre.jpg',
    description: 'Le salon du livre algérien est un événement culturel dédié à la promotion de la littérature algérienne',
  },
  create: {
    url: '/uploads/lieux/salon-du-livre.jpg',
    description: 'Le salon du livre algérien est un événement culturel dédié à la promotion de la littérature algérienne',
    lieuId: salonLivreAlgerien.id,
  },
});



  // --- Avis (sur lieu1) ---
  const avisExist = await prisma.avis.findFirst({
    where: { utilisateurId: user.id, lieuId: parcZoologique.id },
  });
  if (!avisExist) {
    await prisma.avis.create({
      data: {
        note: 5,
        commentaire: 'Super visite, très riche et inspirante !',
        utilisateurId: user.id,
        lieuId: parcZoologique.id,
      },
    });
  }

  // --- Favori (clé primaire composite) ---
  await prisma.favori.upsert({
    where: { utilisateurId_lieuId: { utilisateurId: user.id, lieuId: parcZoologique.id } },
    update: {},
    create: { utilisateurId: user.id, lieuId: parcZoologique.id },
  });

  console.log('Seed terminé. Images attendues dans : public/uploads/lieux/*.jpg');
}

main()
  .catch((e) => {
    console.error('Seed échoué', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

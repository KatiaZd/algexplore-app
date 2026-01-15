import { z } from 'zod';

// Lettres (accents inclus) + espace + tiret + apostrophe, min 3
const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{3,}$/;

// Min 8, 1 maj, 1 min, 1 chiffre, 1 symbole
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const RegisterSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email invalide'),
  password: z
    .string()
    .min(8, 'Mot de passe : minimum 8 caractères')
    .regex(
      passwordRegex,
      'Mot de passe : 1 maj, 1 min, 1 chiffre, 1 symbole'
    ),
  nom: z
    .string()
    .trim()
    .min(3, 'Nom : minimum 3 caractères')
    .regex(nameRegex, 'Nom : uniquement des lettres'),
  prenom: z
    .string()
    .trim()
    .min(3, 'Prénom : minimum 3 caractères')
    .regex(nameRegex, 'Prénom : uniquement des lettres'),
});

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});
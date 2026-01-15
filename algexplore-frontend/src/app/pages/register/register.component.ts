import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface FieldErrors {
  prenom?: string;
  nom?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface TouchedMap {
  prenom: boolean;
  nom: boolean;
  email: boolean;
  password: boolean;
  confirmPassword: boolean;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  form = {
    prenom: '',
    nom: '',
    email: '',
    password: '',
    confirmPassword: '',
  };

  showPassword = false;
  loading = false;

  // erreurs “submit” (ex: 409 email déjà utilisé)
  submitError = '';

  // erreurs par champ (calculées par validateAll)
  errors: FieldErrors = {};

  // ✅ Affichage des erreurs uniquement après interaction (blur) ou submit
  submitted = false;
  touched: TouchedMap = {
    prenom: false,
    nom: false,
    email: false,
    password: false,
    confirmPassword: false,
  };

  // ✅ Regex
  private nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{3,}$/;
  private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  private passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

  /** Recalcule toutes les erreurs (mais ne décide pas quand les afficher) */
  validateAll(): boolean {
    const e: FieldErrors = {};

    const prenom = this.form.prenom.trim();
    const nom = this.form.nom.trim();
    const email = this.form.email.trim().toLowerCase();
    const password = this.form.password;
    const confirmPassword = this.form.confirmPassword;

    if (!prenom) e.prenom = 'Prénom requis.';
    else if (!this.nameRegex.test(prenom)) {
      e.prenom = 'Prénom : uniquement lettres, min 3 caractères.';
    }

    if (!nom) e.nom = 'Nom requis.';
    else if (!this.nameRegex.test(nom)) {
      e.nom = 'Nom : uniquement lettres, min 3 caractères.';
    }

    if (!email) e.email = 'Email requis.';
    else if (!this.emailRegex.test(email)) {
      e.email = "Email invalide (ex: nom@domaine.com).";
    }

    if (!password) e.password = 'Mot de passe requis.';
    else if (!this.passwordRegex.test(password)) {
      e.password = 'Min 8 caractères, avec 1 maj, 1 min, 1 chiffre et 1 symbole.';
    }

    if (!confirmPassword) e.confirmPassword = 'Confirmation requise.';
    else if (confirmPassword !== password) {
      e.confirmPassword = 'Les mots de passe ne correspondent pas.';
    }

    this.errors = e;
    return Object.keys(e).length === 0;
  }

  /** À appeler sur blur : marque le champ comme “touché”, puis recalcul */
  validateField(field: keyof TouchedMap): void {
    this.touched[field] = true;
    this.validateAll();
  }

  /** À appeler sur input : recalcul “silencieux” (sans toucher les champs) */
  onInput(): void {
    // Optionnel : on vide l’erreur submit dès que l’utilisateur retape
    if (this.submitError) this.submitError = '';
    this.validateAll();
  }

  /** Helper pour l’HTML : afficher l’erreur seulement si touched ou submitted */
  shouldShow(field: keyof FieldErrors): boolean {
    return this.submitted || this.touched[field as keyof TouchedMap];
  }

  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  submit(): void {
    this.submitted = true;
    this.submitError = '';

    // à submit : on force tous les champs à "touché"
    this.touched = {
      prenom: true,
      nom: true,
      email: true,
      password: true,
      confirmPassword: true,
    };

    const ok = this.validateAll();
    if (!ok) return;

    this.loading = true;

    this.auth
      .register({
        email: this.form.email.trim().toLowerCase(),
        password: this.form.password,
        prenom: this.form.prenom.trim(),
        nom: this.form.nom.trim(),
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigateByUrl('/mon-compte');
        },
        error: (err) => {
          this.loading = false;
          this.submitError =
            err?.error?.message ??
            "Impossible de créer le compte. Vérifie tes informations.";
        },
      });
  }
}

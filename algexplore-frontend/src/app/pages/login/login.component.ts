import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';

  loading = false;
  errorMessage: string | null = null;

  ngOnInit(): void {
    // Si déjà connecté, pas de sens de rester sur la page login
    if (this.auth.isAuthenticated) {
      this.router.navigateByUrl('/mon-compte');
    }
  }

  submit(): void {
    this.errorMessage = null;

    const email = this.email.trim().toLowerCase();
    const password = this.password; // on garde le mdp tel quel

    if (!email || !password.trim()) {
      this.errorMessage = 'Email et mot de passe requis.';
      return;
    }

    this.loading = true;

    this.auth.login({ email, password }).subscribe({
      next: () => {
        this.loading = false;
        // Redirection logique après connexion
        this.router.navigateByUrl('/mon-compte');
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message ?? 'Identifiants invalides ou erreur serveur.';
      },
    });
  }
}

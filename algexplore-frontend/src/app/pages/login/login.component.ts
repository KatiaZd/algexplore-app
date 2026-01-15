import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
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
  private route = inject(ActivatedRoute);

  email = '';
  password = '';

  loading = false;
  errorMessage: string | null = null;

  private returnUrl: string | null = null;

  ngOnInit(): void {
    // 1) Si déjà connecté, on ne reste pas sur la page login
    if (this.auth.isAuthenticated) {
      this.router.navigateByUrl('/mon-compte');
      return;
    }

    // 2) On récupère la page demandée (ex: /favoris)
    const url = this.route.snapshot.queryParamMap.get('returnUrl');

    // Petit garde-fou: on n'accepte que des chemins internes (évite open redirect)
    this.returnUrl = url && url.startsWith('/') ? url : null;
  }

  submit(): void {
    this.errorMessage = null;

    const email = this.email.trim().toLowerCase();
    const password = this.password; // on garde le mdp tel quel

    if (!email || !password) {
      this.errorMessage = 'Email et mot de passe requis.';
      return;
    }

    this.loading = true;

    this.auth.login({ email, password }).subscribe({
      next: () => {
        this.loading = false;

        // Redirection après connexion:
        // - si returnUrl existe (ex: /favoris) -> on y va
        // - sinon -> /mon-compte
        this.router.navigateByUrl(this.returnUrl ?? '/mon-compte');
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message ?? 'Identifiants invalides ou erreur serveur.';
      },
    });
  }
}

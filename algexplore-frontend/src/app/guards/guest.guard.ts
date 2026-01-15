import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Déjà connecté → pas le droit d'accéder à login/register
  if (authService.isAuthenticated) {
    router.navigate(['/mon-compte']);
    return false;
  }

  return true;
};

import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated) {
    return true;
  }

  // pas connecté -> redirection vers se-connecter + returnUrl
  router.navigate(['/se-connecter'], {
    queryParams: { returnUrl: state.url },
  });
  return false;
};

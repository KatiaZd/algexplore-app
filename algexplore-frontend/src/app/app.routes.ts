import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LieuListComponent } from './components/lieu-list/lieu-list.component';
import { LieuDetailComponent } from './pages/lieu-detail/lieu-detail.component';
import { MentionsLegalesComponent } from './pages/mentions-legales/mentions-legales.component';
import { PolitiqueDeConfidentialiteComponent } from './pages/politique-de-confidentialite/politique-de-confidentialite.component';
import { ContactComponent } from './pages/contact/contact.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { FavorisComponent } from './pages/favoris/favoris.component';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  // page d'admin future, pas exposée dans l'UI
  { path: 'lieux', component: LieuListComponent },
  // page détail publique
  { path: 'lieux/:id', component: LieuDetailComponent },
  {
    path: 'se-connecter',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'mon-compte',
    loadComponent: () =>
      import('./pages/my-account/my-account.component').then((m) => m.MyAccountComponent),
    canActivate: [authGuard],
  },
  {
    path: 'creer-un-compte',
    loadComponent: () =>
      import('./pages/register/register.component').then((m) => m.RegisterComponent),
    canActivate: [guestGuard],
  },

  { path: 'mentions-legales', component: MentionsLegalesComponent },
  { path: 'politique-de-confidentialite', component: PolitiqueDeConfidentialiteComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'favoris', component: FavorisComponent, canActivate: [authGuard] },

  // 404
  { path: '404', component: NotFoundComponent },

  // wildcard -> redirige vers /404
  { path: '**', redirectTo: '404' },
];
import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LieuListComponent } from './components/lieu-list/lieu-list.component';
import { LieuDetailComponent } from './pages/lieu-detail/lieu-detail.component';
import { MentionsLegalesComponent } from './pages/mentions-legales/mentions-legales.component';
import { PolitiqueDeConfidentialiteComponent } from './pages/politique-de-confidentialite/politique-de-confidentialite.component';
import { ContactComponent } from './pages/contact/contact.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { FavorisComponent } from './pages/favoris/favoris.component';


export const routes: Routes = [
    { path: '', component: HomeComponent },
    // page d'admin future, pas exposée dans l'UI
    { path: 'lieux', component: LieuListComponent },
    // page détail publique
    { path: 'lieux/:id', component: LieuDetailComponent },
    {
        path: 'login',
        loadComponent: () =>
        import('./pages/login/login.component').then((m) => m.LoginComponent),
    },

    { path: 'mentions-legales', component: MentionsLegalesComponent },
    { path: 'politique-de-confidentialite', component: PolitiqueDeConfidentialiteComponent },
    { path: 'contact', component: ContactComponent },
    { path: 'favoris', component: FavorisComponent },

    // { path: '**', redirectTo: '' },
    { path: '**', component: NotFoundComponent },
];
import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);

  ngOnInit(): void {
    // ✅ Persistance : si un token existe, on recharge l'utilisateur
    if (this.authService.isAuthenticated) {
      this.authService.me().subscribe();
    }
  }

  onFavorisClick(): void {
    this.router.navigateByUrl('/favoris');
  }

  onUserClick(): void {
    console.log('isAuthenticated =', this.authService.isAuthenticated);

    if (this.authService.isAuthenticated) {
      console.log('-> connecté : go mon-compte');
      this.router.navigateByUrl('/mon-compte');
    } else {
      console.log('-> pas connecté : go se-connecter');
      this.router.navigateByUrl('/se-connecter');
    }
  }
}

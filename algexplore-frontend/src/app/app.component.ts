import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  onUserClick(): void {
    if (this.authService.isAuthenticated) {
      this.router.navigateByUrl('/favoris');
    } else {
      this.router.navigateByUrl('/login');
    }
  }
}
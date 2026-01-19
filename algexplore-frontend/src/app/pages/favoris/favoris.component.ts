import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FavorisService, Favori } from '../../services/favoris.service';

@Component({
  selector: 'app-favoris',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './favoris.component.html',
  styleUrl: './favoris.component.scss',
})
export class FavorisComponent implements OnInit {
  private favorisService = inject(FavorisService);
  private router = inject(Router);

  favoris: Favori[] = [];
  loading = true;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.favorisService.getMine().subscribe({
      next: (res) => {
        this.favoris = (res.favoris ?? [])
          .slice()
          .sort((a, b) =>
            (a.lieu?.nom ?? '').localeCompare(b.lieu?.nom ?? '', 'fr', { sensitivity: 'base' })
          );

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Tu dois être connecté pour voir tes favoris.';
      },
    });
  }

  openLieu(lieuId: number): void {
    this.router.navigateByUrl(`/lieux/${lieuId}`);
  }

  remove(lieuId: number): void {
    this.favorisService.toggle(lieuId).subscribe({
      next: () => {
        this.favoris = this.favoris.filter((f) => f.lieuId !== lieuId);
      },
      error: () => {
      this.errorMessage = "Impossible de retirer ce favori pour le moment.";
    }
    });
  }
}

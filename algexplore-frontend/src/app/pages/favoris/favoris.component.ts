import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  favoris: Favori[] = [];
  loading = true;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.favorisService.getMine().subscribe({
      next: (res) => {
        this.favoris = res.favoris;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Tu dois être connecté pour voir tes favoris.';
      },
    });
  }

  remove(lieuId: number) {
    this.favorisService.toggle(lieuId).subscribe({
      next: () => {
        this.favoris = this.favoris.filter((f) => f.lieuId !== lieuId);
      },
    });
  }
}
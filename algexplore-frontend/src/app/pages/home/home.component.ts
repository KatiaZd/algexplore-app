import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LieuService, Lieu } from '../../services/lieu.service';
import { SectionCarouselComponent } from '../../components/section-carousel/section-carousel.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, SectionCarouselComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  lieux: Lieu[] = [];
  sections: { title: string; lieux: Lieu[] }[] = [];
  isLoading = true;
  hasError = false;

  private lieuService = inject(LieuService);

  ngOnInit(): void {
    this.lieuService.getLieux().subscribe({
      next: (data) => {
        this.lieux = data;
        // Découpage temporaire en sections (mock visuel)
        this.sections = [
          { title: 'En ce moment', lieux: data.slice(0, 5) },
          { title: 'Alger des enfants', lieux: data.slice(5, 10) },
          { title: 'Patrimoine', lieux: data.slice(10, 15) }
        ];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement lieux:', err);
        this.hasError = true;
        this.isLoading = false;
      }
    });
  }
}

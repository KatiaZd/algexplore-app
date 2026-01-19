import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LieuService, Lieu } from '../../services/lieu.service';
import { SectionCarouselComponent } from '../../components/section-carousel/section-carousel.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, SectionCarouselComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  lieux: Lieu[] = [];
  sections: { title: string; lieux: Lieu[] }[] = [];

  isLoading = true;
  hasError = false;

  // Search
  searchValue = '';
  isSearching = false;

  // Tags affichés sous la barre de recherche
  popularTags: string[] = ['Famille', 'Balade', 'Patrimoine', 'Café', 'Musée'];

  private lieuService = inject(LieuService);

  ngOnInit(): void {
    this.loadHomeSections();
  }

  onTagClick(tag: string): void {
    this.searchValue = tag;
    this.onSearch();
  }

  /**
   * Normalise une catégorie pour éviter les soucis accent/espaces/casse
   * Ex: "Café " -> "cafe", "Événement" -> "evenement"
   */
  private normalizeCat(value: string | null | undefined): string {
    return (value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private loadHomeSections(): void {
    this.isLoading = true;
    this.hasError = false;
    this.isSearching = false;

    this.lieuService.getLieux().subscribe({
      next: (data) => {
        this.lieux = data;

        // 0) "En ce moment" (catégorie virtuelle côté front)
        const today = new Date();

        const enCeMoment = data.filter((l) => {
          if (l.isPermanent) return false;

          const start =
            typeof l.dateDebut === 'string'
              ? new Date(l.dateDebut)
              : l.dateDebut instanceof Date
                ? l.dateDebut
                : null;

          const end =
            typeof l.dateFin === 'string'
              ? new Date(l.dateFin)
              : l.dateFin instanceof Date
                ? l.dateFin
                : null;

          if (!start && !end) return false;

          const afterStart = !start || start <= today;
          const beforeEnd = !end || today <= end;

          return afterStart && beforeEnd;
        });

        // Tout est en version normalisée (sans accents)
        const categoryOrder = [
          'evenement',
          'balades',
          'patrimoine',
          'culture',
          'cafe',
          'artisanat',
          'enfant',
        ];

        // 1) Labels lisibles pour l’UI
        const labelMap: Record<string, string> = {
          evenement: 'Événements',
          balades: 'Balades',
          patrimoine: 'Patrimoine',
          culture: 'Culture',
          cafe: 'Cafés & Salons de thé',
          artisanat: 'Artisanat & Shopping',
          enfant: 'Pour les enfants',
        };

        // 2) Grouper par categoriePrincipale (normalisée)
        const grouped = new Map<string, Lieu[]>();

        for (const lieu of data) {
          const cat = this.normalizeCat(lieu.categoriePrincipale);
          if (!cat) continue;

          if (!grouped.has(cat)) grouped.set(cat, []);
          grouped.get(cat)!.push(lieu);
        }

        // 3) Sections prioritaires
        const orderedSections = categoryOrder
          .map((key) => ({
            title: labelMap[key] ?? key,
            lieux: grouped.get(key) ?? [],
          }))
          .filter((section) => section.lieux.length > 0);

        // 4) Autres = catégories hors categoryOrder (normalisées)
        const allowed = new Set(categoryOrder);

        const autres = data.filter((l) => {
          const cat = this.normalizeCat(l.categoriePrincipale);
          return cat && !allowed.has(cat);
        });

        // 5) Sections finales
        this.sections = [
          ...(enCeMoment.length ? [{ title: 'En ce moment', lieux: enCeMoment }] : []),
          ...orderedSections,
          ...(autres.length ? [{ title: 'Autres', lieux: autres }] : []),
        ];

        // Fallback si aucune section n’a été construite mais qu’il y a des lieux
        if (this.sections.length === 0 && data.length > 0) {
          this.sections = [{ title: 'Tous les lieux', lieux: data }];
        }

        this.isLoading = false;
      },
      error: () => {
        this.hasError = true;
        this.isLoading = false;
      },
    });
  }

  onSearch(): void {
    const q = this.searchValue.trim();

    if (!q) {
      this.loadHomeSections();
      return;
    }

    const qApi = this.normalizeCat(q);

    this.isLoading = true;
    this.hasError = false;
    this.isSearching = true;

    this.lieuService.getLieuxByQuery(qApi).subscribe({
      next: (data) => {
        this.lieux = data;
        this.sections = [{ title: `Résultats pour "${q}"`, lieux: data }];
        this.isLoading = false;
      },
      error: () => {
        this.hasError = true;
        this.isLoading = false;
      },
    });
  }

  clearSearch(): void {
    this.searchValue = '';
    this.loadHomeSections();
  }
}

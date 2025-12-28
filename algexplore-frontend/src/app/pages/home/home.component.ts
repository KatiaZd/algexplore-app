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
    console.log('HOME ngOnInit');
    this.loadHomeSections();
  }

  onTagClick(tag: string): void {
    console.log('HOME tag clicked:', tag);
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
    console.log('HOME loadHomeSections → start');

    this.isLoading = true;
    this.hasError = false;
    this.isSearching = false;

    console.log('HOME calling API /lieux');

    this.lieuService.getLieux().subscribe({
      next: (data) => {
        console.log('HOME API /lieux received:', data.length);
        console.log('HOME first lieu:', data[0]);

        console.log(
          'HOME categoriePrincipales trouvées (raw):',
          Array.from(
            new Set(
              data
                .map((l) => (l.categoriePrincipale ?? '').trim().toLowerCase())
                .filter(Boolean)
            )
          ).sort()
        );

        console.log(
          'HOME categoriePrincipales trouvées (normalized):',
          Array.from(
            new Set(data.map((l) => this.normalizeCat(l.categoriePrincipale)).filter(Boolean))
          ).sort()
        );

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

        console.log('HOME grouped keys (normalized):', Array.from(grouped.keys()));

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

        if (this.sections.length === 0 && data.length > 0) {
          console.warn('HOME fallback → Tous les lieux');
          this.sections = [{ title: 'Tous les lieux', lieux: data }];
        }

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement lieux:', err);
        this.hasError = true;
        this.isLoading = false;
      },
    });
  }

  onSearch(): void {
    const q = this.searchValue.trim();

    if (!q) {
      console.log('HOME search empty → reload home');
      this.loadHomeSections();
      return;
    }

    const qApi = this.normalizeCat(q);

    this.isLoading = true;
    this.hasError = false;
    this.isSearching = true;

    this.lieuService.getLieuxByQuery(qApi).subscribe({
      next: (data) => {
        console.log('HOME search results:', data.length);
        this.lieux = data;
        this.sections = [{ title: `Résultats pour "${q}"`, lieux: data }];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur recherche lieux:', err);
        this.hasError = true;
        this.isLoading = false;
      },
    });
  }

  clearSearch(): void {
    console.log('HOME clearSearch');
    this.searchValue = '';
    this.loadHomeSections();
  }
}
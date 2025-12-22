import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LieuService, Lieu } from '../../services/lieu.service';

@Component({
  selector: 'app-lieu-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lieu-detail.component.html',
  styleUrls: ['./lieu-detail.component.scss']
})
export class LieuDetailComponent implements OnInit {
  lieu: Lieu | null = null;
  isLoading = true;
  hasError = false;

  /** iframe OSM sécurisé pour l’embed */
  safeMapUrl: SafeResourceUrl | null = null;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private lieuService = inject(LieuService);
  private sanitizer = inject(DomSanitizer);

  ngOnInit(): void {
    // Récupère l'id dans l'URL
    const idParam = this.route.snapshot.paramMap.get('id');

    // Sécurité : si pas d'id => retour home
    if (!idParam) {
      this.router.navigateByUrl('/');
      return;
    }

    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      this.router.navigateByUrl('/');
      return;
    }

    // Appel API pour récupérer le lieu
    this.lieuService.getLieuById(id).subscribe({
      next: (data) => {
        this.lieu = data;
        this.safeMapUrl = this.buildSafeMapUrl(
        data?.latitude ?? undefined,
        data?.longitude ?? undefined
    );
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement du lieu:', err);
        this.hasError = true;
        this.isLoading = false;
      }
    });
  }

  /** True si les coordonnées sont valides */
  get hasGeo(): boolean {
    const lat = Number(this.lieu?.latitude);
    const lng = Number(this.lieu?.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng);
  }

  /** Lien clicable vers Google Maps (itinéraire) */
  get mapLink(): string | null {
    if (!this.hasGeo) return null;
    return `https://www.google.com/maps?q=${this.lieu!.latitude},${this.lieu!.longitude}`;
  }

  /** Construit une URL OSM sécurisée pour l’iframe (pas d’API key requise) */
  private buildSafeMapUrl(lat?: string, lng?: string): SafeResourceUrl | null {
    const nLat = Number(lat);
    const nLng = Number(lng);
    if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return null;

    const delta = 0.01; // zoom ~14
    const bbox = [
      (nLng - delta).toFixed(6),
      (nLat - delta).toFixed(6),
      (nLng + delta).toFixed(6),
      (nLat + delta).toFixed(6)
    ].join(',');
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${nLat},${nLng}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  openExternal(url?: string | null): void {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  goBack(): void {
    this.router.navigateByUrl('/');
  }
  
}

/*
Ce composant fait 6 choses :
- lit :id dans l’URL,
- va chercher les données du lieu auprès de l’API,
- gère chargement / erreur,
- prépare une iframe OpenStreetMap sécurisée (sans clé),
- expose un lien d’itinéraire Google Maps,
- propose un bouton retour.
*/

import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { LieuService, Lieu } from '../../services/lieu.service';
import { FavorisService } from '../../services/favoris.service';
import { AuthService } from '../../services/auth.service';
import { AvisService, Avis } from '../../services/avis.service';

@Component({
  selector: 'app-lieu-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lieu-detail.component.html',
  styleUrls: ['./lieu-detail.component.scss'],
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

  private favorisService = inject(FavorisService);
  private authService = inject(AuthService);

  private avisService = inject(AvisService);

  isFavorite = false;
  loadingFav = false;

  /** id du lieu courant (depuis l’URL) */
  private lieuId!: number;

  // ----------------- AVIS -----------------
  avisList: Avis[] = [];

  /** Avis de l'utilisateur connecté pour CE lieu (si existe) */
  myAvis: Avis | null = null;

  /** Si on édite : id de l'avis à update */
  editingAvisId: number | null = null;

  /** Message affiché dans la modale de confirmation */
  avisSuccessMessage: string | null = null;

  /** Affiche/masque la modale "Donne ton avis" */
  isAvisModalOpen = false;

  /** Affiche/masque la modale "Confirmation" */
  isAvisSuccessModalOpen = false;

  /** Affiche/masque la modale "Lecture des avis" */
  isAvisReadModalOpen = false;

  /** Note 1..5 (0 = pas encore choisi) */
  avisNote = 0;

  /** Commentaire (optionnel) */
  avisCommentaire = '';

  /** Etat d'envoi */
  avisSubmitting = false;
  // --------------------------------------------

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

    // stocke l'id du lieu pour les favoris
    this.lieuId = id;

    // Appel API pour récupérer le lieu
    this.lieuService.getLieuById(id).subscribe({
      next: (data) => {
        this.lieu = data;
        this.safeMapUrl = this.buildSafeMapUrl(
          data?.latitude ?? undefined,
          data?.longitude ?? undefined
        );
        this.isLoading = false;

        // récupère l’état favori une fois le lieu chargé
        this.loadFavoriteState();

        // récupère les avis du lieu
        this.loadAvis();
      },
      error: (err) => {
        console.error('Erreur chargement du lieu:', err);
        this.hasError = true;
        this.isLoading = false;
      },
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
      (nLat + delta).toFixed(6),
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

  /** Charge l’état favori depuis l’API */
  private loadFavoriteState(): void {
    if (!this.authService.isAuthenticated) return;

    this.favorisService.getMine().subscribe({
      next: (res) => {
        this.isFavorite = res.favoris.some((f) => f.lieuId === this.lieuId);
      },
      error: () => {
        // on ignore : ne bloque pas la page
      },
    });
  }

  /** Ajoute/retire le lieu courant des favoris */
  toggleFavorite(): void {
    if (!this.authService.isAuthenticated) {
      this.router.navigateByUrl('/login');
      return;
    }

    if (this.loadingFav) return;

    this.loadingFav = true;

    this.favorisService.toggle(this.lieuId).subscribe({
      next: (res) => {
        this.isFavorite = res.isFavorite;
        this.loadingFav = false;
      },
      error: () => {
        this.loadingFav = false;
        alert('Impossible de modifier les favoris.');
      },
    });
  }

  // ----------------- AVIS (V1) -----------------

  /** Moyenne des notes (ex: 4.5) */
  get avisAverage(): number {
    if (!this.avisList.length) return 0;
    const sum = this.avisList.reduce((acc, a) => acc + (a.note ?? 0), 0);
    return sum / this.avisList.length;
  }

  /** Texte formaté (ex: "4,5") */
  get avisAverageText(): string {
    return this.avisAverage ? this.avisAverage.toFixed(1).replace('.', ',') : '—';
  }

  /** Charge les avis du lieu (public) */
  private loadAvis(): void {
    this.avisService.getByLieu(this.lieuId).subscribe({
      next: (res) => {
        this.avisList = res.avis ?? [];
        this.refreshMyAvis();
      },
      error: () => {
        // on ignore : ne bloque pas la page
      },
    });
  }

  /** Détermine si l'utilisateur connecté a déjà un avis sur ce lieu */
  private refreshMyAvis(): void {
    const userId = this.authService.currentUser?.id;
    if (!userId) {
      this.myAvis = null;
      this.editingAvisId = null;
      return;
    }

    this.myAvis = this.avisList.find((a) => a.utilisateurId === userId) ?? null;
    this.editingAvisId = this.myAvis ? this.myAvis.id : null;
  }

  /** Ouvre la modale de lecture des avis */
  openAvisReadModal(): void {
    this.isAvisReadModalOpen = true;
  }

  /** Ferme la modale de lecture des avis */
  closeAvisReadModal(): void {
    this.isAvisReadModalOpen = false;
  }

  /** Ouvre la modale et pré-remplit si avis déjà existant */
  private openAvisModalPrefill(): void {
    this.refreshMyAvis();

    if (this.myAvis) {
      // Mode édition : pré-remplir
      this.avisNote = this.myAvis.note;
      this.avisCommentaire = this.myAvis.commentaire ?? '';
      this.editingAvisId = this.myAvis.id;
    } else {
      // Mode création : reset
      this.avisNote = 0;
      this.avisCommentaire = '';
      this.editingAvisId = null;
    }

    this.isAvisModalOpen = true;
  }

  /** CTA "Donne ton avis" : ouvre la modale (protégé) */
  onClickAddAvis(): void {
    if (!this.authService.isAuthenticated) {
      this.router.navigateByUrl('/login');
      return;
    }

    // Si le user n'est pas chargé (ex: refresh page), on récupère /auth/me
    if (!this.authService.currentUser) {
      this.authService.me().subscribe({
        next: () => this.openAvisModalPrefill(),
        error: () => this.router.navigateByUrl('/login'),
      });
      return;
    }

    this.openAvisModalPrefill();
  }

  /** Ferme la modale */
  closeAvisModal(): void {
    this.isAvisModalOpen = false;
  }

  /** Ouvre la modale de confirmation */
  private openAvisSuccessModal(message: string): void {
    this.avisSuccessMessage = message;
    this.isAvisSuccessModalOpen = true;
  }

  /** Ferme la modale de confirmation */
  closeAvisSuccessModal(): void {
    this.isAvisSuccessModalOpen = false;
  }

  /** Sélection d'une note : 1..5 */
  setNote(n: number): void {
    this.avisNote = n;
  }

  /** Publie / met à jour un avis (protégé) */
  submitAvis(): void {
    if (!this.authService.isAuthenticated) {
      this.router.navigateByUrl('/login');
      return;
    }

    if (this.avisNote < 1 || this.avisNote > 5) {
      alert('Choisis une note entre 1 et 5.');
      return;
    }

    const commentaire = this.avisCommentaire.trim();
    this.avisSubmitting = true;

    const fail = () => {
      this.avisSubmitting = false;
      alert("Impossible d'envoyer ton avis.");
    };

    // UPDATE si déjà un avis
    if (this.editingAvisId) {
      this.avisService
        .update(this.editingAvisId, {
          note: this.avisNote,
          commentaire: commentaire || undefined,
        })
        .subscribe({
          next: () => {
            this.avisSubmitting = false;
            this.closeAvisModal();
            this.openAvisSuccessModal('Merci ! Ton avis a bien été mis à jour !');
            this.loadAvis();
          },
          error: fail,
        });
      return;
    }

    // CREATE sinon
    this.avisService
      .create({
        lieuId: this.lieuId,
        note: this.avisNote,
        commentaire: commentaire || undefined,
      })
      .subscribe({
        next: () => {
          this.avisSubmitting = false;
          this.closeAvisModal();
          this.openAvisSuccessModal('Merci ! Ton avis a bien été pris en compte !');
          this.loadAvis();
        },
        error: fail,
      });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isAvisModalOpen) {
      this.closeAvisModal();
    }

    if (this.isAvisSuccessModalOpen) {
      this.closeAvisSuccessModal();
    }

    if (this.isAvisReadModalOpen) {
      this.closeAvisReadModal();
    }
  }

  /** Note moyenne arrondie (pour remplir les étoiles) */
  get avisAverageRounded(): number {
    return Math.round(this.avisAverage);
  }

  // --------------------------------------------
}


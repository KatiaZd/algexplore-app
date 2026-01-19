import { Component, OnInit, OnDestroy, inject, HostListener } from '@angular/core';
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
export class LieuDetailComponent implements OnInit, OnDestroy {
  lieu: Lieu | null = null;
  isLoading = true;
  hasError = false;
  uiMessage: string | null = null;

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

  // Toast message pour inviter à se connecter
  authHintMessage: string | null = null;
  private authHintTimer: ReturnType<typeof setTimeout> | null = null;
  private authRedirectTimer: ReturnType<typeof setTimeout> | null = null;

  // Durées
  private readonly AUTH_HINT_DURATION = 8000; // affichage toast (8s)
  private readonly AUTH_REDIRECT_DELAY = 1800; // délai avant redirection (1.8s)

  // ----------------- AVIS -----------------
  avisList: Avis[] = [];
  myAvis: Avis | null = null;
  editingAvisId: number | null = null;

  avisSuccessMessage: string | null = null;

  isAvisModalOpen = false;
  isAvisSuccessModalOpen = false;
  isAvisReadModalOpen = false;

  avisNote = 0;
  avisCommentaire = '';
  avisSubmitting = false;
  // ---------------------------------------

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    // Sécurité : si pas d'id => 404 (c’est une URL invalide)
    if (!idParam) {
      this.router.navigateByUrl('/404');
      return;
    }

    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      this.router.navigateByUrl('/404');
      return;
    }

    this.lieuId = id;

    this.lieuService.getLieuById(id).subscribe({
      next: (data) => {
        // (au cas où l'API renverrait null au lieu de 404)
        if (!data) {
          this.router.navigateByUrl('/404');
          return;
        }

        this.lieu = data;
        this.safeMapUrl = this.buildSafeMapUrl(
          data?.latitude ?? undefined,
          data?.longitude ?? undefined
        );

        this.isLoading = false;

        this.loadFavoriteState();
        this.loadAvis();
      },
      error: (err) => {
        // Si lieu inexistant -> 404 Angular
        if (err?.status === 404) {
          this.router.navigateByUrl('/404');
          return;
        }

        this.hasError = true;
        this.isLoading = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.clearAuthTimers();
  }

  // ---------------------- Helpers ----------------------

  private showUiMessage(message: string, duration = 4000): void {
    this.uiMessage = message;
    setTimeout(() => {
      this.uiMessage = null;
    }, duration);
  }

  private clearAuthTimers(): void {
    if (this.authHintTimer) {
      clearTimeout(this.authHintTimer);
      this.authHintTimer = null;
    }
    if (this.authRedirectTimer) {
      clearTimeout(this.authRedirectTimer);
      this.authRedirectTimer = null;
    }
  }

  /** Redirige vers la page de connexion en conservant la page actuelle */
  private redirectToLogin(): void {
    this.authHintMessage = null;
    this.clearAuthTimers();

    this.router.navigate(['/se-connecter'], {
      queryParams: { returnUrl: this.router.url },
    });
  }

  /** Affiche un petit message UX (toast) */
  private showAuthHint(message: string): void {
    this.authHintMessage = message;

    if (this.authHintTimer) clearTimeout(this.authHintTimer);

    this.authHintTimer = setTimeout(() => {
      this.authHintMessage = null;
      this.authHintTimer = null;
    }, this.AUTH_HINT_DURATION);
  }

  /** Bouton du toast : "Se connecter" */
  goToLoginFromHint(): void {
    this.redirectToLogin();
  }

  // ---------------------- Map ----------------------

  get hasGeo(): boolean {
    const lat = Number(this.lieu?.latitude);
    const lng = Number(this.lieu?.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng);
  }

  get mapLink(): string | null {
    if (!this.hasGeo) return null;
    return `https://www.google.com/maps?q=${this.lieu!.latitude},${this.lieu!.longitude}`;
  }

  private buildSafeMapUrl(lat?: string, lng?: string): SafeResourceUrl | null {
    const nLat = Number(lat);
    const nLng = Number(lng);
    if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return null;

    const delta = 0.01;
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

  goHome(): void {
    this.router.navigateByUrl('/');
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigateByUrl('/');
    }
  }

  // ---------------------- Favoris ----------------------

  private loadFavoriteState(): void {
    if (!this.authService.isAuthenticated) return;

    this.favorisService.getMine().subscribe({
      next: (res) => {
        this.isFavorite = res.favoris.some((f) => f.lieuId === this.lieuId);
      },
    });
  }

  toggleFavorite(): void {
    if (!this.authService.isAuthenticated) {
      this.showAuthHint('Connecte-toi pour enregistrer ce lieu.');

      // redirection après un petit délai
      if (this.authRedirectTimer) clearTimeout(this.authRedirectTimer);
      this.authRedirectTimer = setTimeout(() => {
        this.redirectToLogin();
      }, this.AUTH_REDIRECT_DELAY);

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
        this.showUiMessage('Impossible de modifier les favoris.');
      },
    });
  }

  // ---------------------- Avis ----------------------

  get avisAverage(): number {
    if (!this.avisList.length) return 0;
    const sum = this.avisList.reduce((acc, a) => acc + (a.note ?? 0), 0);
    return sum / this.avisList.length;
  }

  get avisAverageText(): string {
    return this.avisAverage ? this.avisAverage.toFixed(1).replace('.', ',') : '—';
  }

  get avisAverageRounded(): number {
    return Math.round(this.avisAverage);
  }

  private loadAvis(): void {
    this.avisService.getByLieu(this.lieuId).subscribe({
      next: (res) => {
        this.avisList = res.avis ?? [];
        this.refreshMyAvis();
      },
      error: () => {
        this.avisList = [];
        this.refreshMyAvis();
      },
    });
  }

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

  openAvisReadModal(): void {
    this.isAvisReadModalOpen = true;
  }

  closeAvisReadModal(): void {
    this.isAvisReadModalOpen = false;
  }

  private openAvisModalPrefill(): void {
    this.refreshMyAvis();

    if (this.myAvis) {
      this.avisNote = this.myAvis.note;
      this.avisCommentaire = this.myAvis.commentaire ?? '';
      this.editingAvisId = this.myAvis.id;
    } else {
      this.avisNote = 0;
      this.avisCommentaire = '';
      this.editingAvisId = null;
    }

    this.isAvisModalOpen = true;
  }

  onClickAddAvis(): void {
    if (!this.authService.isAuthenticated) {
      this.redirectToLogin();
      return;
    }

    if (!this.authService.currentUser) {
      this.authService.me().subscribe({
        next: () => this.openAvisModalPrefill(),
        error: () => this.redirectToLogin(),
      });
      return;
    }

    this.openAvisModalPrefill();
  }

  closeAvisModal(): void {
    this.isAvisModalOpen = false;
  }

  private openAvisSuccessModal(message: string): void {
    this.avisSuccessMessage = message;
    this.isAvisSuccessModalOpen = true;
  }

  closeAvisSuccessModal(): void {
    this.isAvisSuccessModalOpen = false;
  }

  setNote(n: number): void {
    this.avisNote = n;
  }

  submitAvis(): void {
    if (!this.authService.isAuthenticated) {
      this.redirectToLogin();
      return;
    }

    if (this.avisNote < 1 || this.avisNote > 5) {
      this.showUiMessage('Choisis une note entre 1 et 5.');
      return;
    }

    const commentaire = this.avisCommentaire.trim();
    this.avisSubmitting = true;

    const fail = () => {
      this.avisSubmitting = false;
      this.showUiMessage("Impossible d'envoyer ton avis.");
    };

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

  // ---------------------- UX ----------------------

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isAvisModalOpen) this.closeAvisModal();
    if (this.isAvisSuccessModalOpen) this.closeAvisSuccessModal();
    if (this.isAvisReadModalOpen) this.closeAvisReadModal();
  }
}

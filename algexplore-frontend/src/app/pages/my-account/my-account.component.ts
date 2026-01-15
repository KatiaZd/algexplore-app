import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService, User } from '../../services/auth.service';
import { AvisService, Avis } from '../../services/avis.service';

@Component({
  selector: 'app-my-account',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-account.component.html',
  styleUrl: './my-account.component.scss',
})
export class MyAccountComponent implements OnInit {
  private auth = inject(AuthService);
  private avisService = inject(AvisService);
  private router = inject(Router);

  // --- User ---
  user: User | null = null;
  loadingUser = true;

  // --- Avis ---
  avis: Avis[] = [];
  loadingAvis = true;
  errorAvis = '';

  // --- Inline edit state ---
  editingId: number | null = null;
  editNote = 5;
  editCommentaire = '';
  saving = false;

  ngOnInit(): void {
    this.loadUser();
    this.loadMyAvis();
  }

  // ========== USER ==========
  private loadUser(): void {
    this.loadingUser = true;

    // ton AuthService.me() renvoie Observable<MeResponse | null>
    this.auth.me().subscribe((res) => {
      this.user = res?.user ?? null;
      this.loadingUser = false;

      // si pas de user (token invalide/expiré) -> redirection
      if (!this.user) {
        this.router.navigateByUrl('/se-connecter');
      }
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/se-connecter');
  }

  // ========== AVIS ==========
  loadMyAvis(): void {
    this.loadingAvis = true;
    this.errorAvis = '';

    this.avisService.getMine().subscribe({
      next: (res) => {
        this.avis = res.avis ?? [];
        this.loadingAvis = false;
      },
      error: (err) => {
        this.errorAvis = err?.error?.message ?? 'Impossible de charger tes avis.';
        this.loadingAvis = false;
      },
    });
  }

  // ========== EDIT INLINE ==========
  startEdit(a: Avis): void {
    this.editingId = a.id;
    this.editNote = a.note ?? 5;
    this.editCommentaire = a.commentaire ?? '';
    this.saving = false;
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editNote = 5;
    this.editCommentaire = '';
    this.saving = false;
  }

  setEditNote(n: number): void {
    this.editNote = n;
  }

  saveEdit(a: Avis): void {
    if (this.editingId !== a.id) return;

    const note = this.editNote;
    const commentaire = (this.editCommentaire ?? '').trim();

    // mini-guard UX
    if (note < 1 || note > 5) {
      alert('La note doit être comprise entre 1 et 5.');
      return;
    }

    this.saving = true;

    this.avisService.update(a.id, { note, commentaire }).subscribe({
      next: (res) => {
        const updated = res.avis;

        // update local
        this.avis = this.avis.map((x) =>
          x.id === a.id
            ? {
                ...x,
                note: updated.note,
                commentaire: updated.commentaire ?? null,
              }
            : x
        );

        this.saving = false;
        this.editingId = null;
      },
      error: (err) => {
        this.saving = false;
        alert(err?.error?.message ?? "Impossible de modifier l'avis.");
      },
    });
  }

  // ========== DELETE ==========
  onDeleteAvis(a: Avis): void {
    const lieuNom = a.lieu?.nom ?? 'ce lieu';
    const ok = confirm(`Supprimer ton avis sur "${lieuNom}" ?`);
    if (!ok) return;

    // si on supprime l'avis en cours d'édition
    if (this.editingId === a.id) {
      this.cancelEdit();
    }

    this.avisService.delete(a.id).subscribe({
      next: () => {
        this.avis = this.avis.filter((x) => x.id !== a.id);
      },
      error: (err) => {
        alert(err?.error?.message ?? "Impossible de supprimer l'avis.");
      },
    });
  }

  // ========== UI HELPERS ==========
  starsArray(): number[] {
    return [1, 2, 3, 4, 5];
  }

  isStarOn(current: number, note: number): boolean {
    return current <= note;
  }

  trackByAvisId(_index: number, a: Avis): number {
    return a.id;
  }
}

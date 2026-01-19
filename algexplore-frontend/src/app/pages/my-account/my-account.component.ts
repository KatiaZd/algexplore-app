import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService, User } from '../../services/auth.service';
import { AvisService, Avis } from '../../services/avis.service';

@Component({
  selector: 'app-my-account',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './my-account.component.html',
  styleUrl: './my-account.component.scss',
})
export class MyAccountComponent implements OnInit {
  private auth = inject(AuthService);
  private avisService = inject(AvisService);
  private router = inject(Router);

  // ---------- USER ----------
  user: User | null = null;
  loadingUser = true;

  // ---------- AVIS ----------
  avis: Avis[] = [];
  loadingAvis = true;
  errorAvis: string | null = null;

  // ---------- INLINE EDIT ----------
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

    this.auth.me().subscribe({
      next: (res) => {
        this.user = res?.user ?? null;
        this.loadingUser = false;

        if (!this.user) {
          this.router.navigateByUrl('/se-connecter');
        }
      },
      error: () => {
        this.loadingUser = false;
        this.user = null;
        this.router.navigateByUrl('/se-connecter');
      },
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/se-connecter');
  }

  // ========== AVIS ==========
  loadMyAvis(): void {
    this.loadingAvis = true;
    this.errorAvis = null;

    this.avisService.getMine().subscribe({
      next: (res) => {
        this.avis = res.avis ?? [];
        this.loadingAvis = false;
      },
      error: () => {
        this.errorAvis = 'Impossible de charger tes avis.';
        this.loadingAvis = false;
      },
    });
  }

  // ========== EDIT ==========
  startEdit(a: Avis): void {
    this.editingId = a.id;
    this.editNote = a.note ?? 5;
    this.editCommentaire = a.commentaire ?? '';
    this.saving = false;
    this.errorAvis = null;
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

    if (this.editNote < 1 || this.editNote > 5) {
      this.errorAvis = 'La note doit être comprise entre 1 et 5.';
      return;
    }

    this.saving = true;
    this.errorAvis = null;

    this.avisService
      .update(a.id, {
        note: this.editNote,
        commentaire: this.editCommentaire.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          const updated = res.avis;

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
        error: () => {
          this.saving = false;
          this.errorAvis = "Impossible de modifier l'avis.";
        },
      });
  }

  // ========== DELETE ==========
  onDeleteAvis(a: Avis): void {
    this.errorAvis = null;

    if (this.editingId === a.id) {
      this.cancelEdit();
    }

    this.avisService.delete(a.id).subscribe({
      next: () => {
        this.avis = this.avis.filter((x) => x.id !== a.id);
      },
      error: () => {
        this.errorAvis = "Impossible de supprimer l'avis.";
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

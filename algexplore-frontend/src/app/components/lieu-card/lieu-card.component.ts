import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Lieu } from '../../services/lieu.service';

@Component({
  selector: 'app-lieu-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lieu-card.component.html',
  styleUrls: ['./lieu-card.component.scss']
})
export class LieuCardComponent {
  @Input() lieu!: Lieu;

  private router = inject(Router);

  goToDetail(): void {
    // sécurité : si pas d'id, on fait rien
    if (!this.lieu || this.lieu.id === undefined || this.lieu.id === null) {
      return;
    }

    this.router.navigate(['/lieux', this.lieu.id]);
  }
}

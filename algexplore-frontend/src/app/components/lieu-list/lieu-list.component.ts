import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LieuService, Lieu } from '../../services/lieu.service';

@Component({
  selector: 'app-lieu-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lieu-list.component.html',
  styleUrls: ['./lieu-list.component.scss']
})
export class LieuListComponent implements OnInit {
  lieux: Lieu[] = [];
  isLoading = true;
  hasError = false;

  private lieuService = inject(LieuService);

  ngOnInit(): void {
    this.lieuService.getLieux().subscribe({
      next: (data) => {
        this.lieux = data;
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
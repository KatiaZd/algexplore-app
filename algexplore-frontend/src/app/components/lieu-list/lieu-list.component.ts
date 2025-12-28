import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LieuService, Lieu } from '../../services/lieu.service';
import { CategoryService, Category } from '../../services/category.service';

@Component({
  selector: 'app-lieu-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lieu-list.component.html',
  styleUrls: ['./lieu-list.component.scss']
})
export class LieuListComponent implements OnInit {
  lieux: Lieu[] = [];
  categories: Category[] = [];

  isLoading = true;
  hasError = false;

  private lieuService = inject(LieuService);
  private categoryService = inject(CategoryService);

  ngOnInit(): void {
    // Test lieux (déjà existant)
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

    // Test categories
    this.categoryService.getAll().subscribe({
      next: (cats) => {
        this.categories = cats;
        console.log('CATEGORIES:', cats);
      },
      error: (err) => {
        console.error('Erreur chargement categories:', err);
      }
    });
  }
}
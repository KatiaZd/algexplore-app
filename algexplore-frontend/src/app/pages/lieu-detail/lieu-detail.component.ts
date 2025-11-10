import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private lieuService = inject(LieuService);

  ngOnInit(): void {
    // Récupère l'id dans l'URL
    const idParam = this.route.snapshot.paramMap.get('id');

    // Sécurité : si pas d'id => retour home
    if (!idParam) {
      this.router.navigateByUrl('/');
      return;
    }

    const id = Number(idParam);

    // Appel API pour récupérer le lieu
    this.lieuService.getLieuById(id).subscribe({
      next: (data) => {
        this.lieu = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement du lieu:', err);
        this.hasError = true;
        this.isLoading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigateByUrl('/');
  }
}

/*
Ce composant fait 4 choses :
lit :id dans l’URL,
va chercher les données du lieu auprès de l’API,
gère chargement / erreur,
propose un bouton retour.*/ 
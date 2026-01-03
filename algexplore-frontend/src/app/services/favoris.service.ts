import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';

export interface FavoriLieu {
  id: number;
  nom: string;
  adresse: string;
  categoriePrincipale?: string | null;
  photos?: { url: string }[];
}

export interface Favori {
  lieuId: number;
  lieu: FavoriLieu;
}

interface FavorisListResponse {
  favoris: Favori[];
}

interface ToggleResponse {
  isFavorite: boolean;
}

@Injectable({ providedIn: 'root' })
export class FavorisService {
  private http = inject(HttpClient);
  private readonly api = API_URL;

  /** Protégé : récupérer mes favoris */
  getMine(): Observable<FavorisListResponse> {
    return this.http.get<FavorisListResponse>(`${this.api}/favoris/me`);
  }

  /**
   * Protégé : toggle favori
   * - ajoute si absent
   * - supprime si présent
   */
  toggle(lieuId: number): Observable<ToggleResponse> {
    return this.http.post<ToggleResponse>(`${this.api}/favoris/toggle`, { lieuId });
  }
}
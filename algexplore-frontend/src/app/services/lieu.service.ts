import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

const API_BASE = 'http://localhost:3000';

/** Réponse paginée renvoyée par l’API */
interface LieuxApiResponse {
  page: number;
  pageSize: number;
  total: number;
  items: LieuApi[];
}

/** Modèle renvoyé par le backend */
export interface LieuApi {
  id: number;
  nom: string;
  description?: string | null;
  adresse?: string | null;
  isPermanent?: boolean | null;
  dateDebut?: string | null;
  dateFin?: string | null;
  prixAdulte?: string | null;
  prixEnfant?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  publicCible?: string | null;
  urlInfos?: string | null;
  infosAcces?: string | null;
  quartier?: string | null;
  categories?: string[] | null;
  categoriePrincipale?: string | null;
  stationBus?: string | null;
  coverUrl?: string | null;
  type?: string | null;
}

/** Modèle front propre (camelCase, valeurs normalisées) */
export interface Lieu {
  id: number;
  nom: string;
  description?: string | null;
  adresse?: string | null;
  isPermanent: boolean;
  dateDebut?: string | Date | null;
  dateFin?: string | Date | null;
  prixAdulte?: string | null;
  prixEnfant?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  publicCible?: string | null;
  urlInfos?: string | null;
  infosAcces?: string | null;
  quartier?: string | null;
  categoriePrincipale?: string | null;
  categories?: string[] | null;
  stationBus?: string | null;
  coverUrl?: string | null;
  type?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class LieuService {
  private apiUrl = `${API_BASE}/lieux`;
  private http = inject(HttpClient);

  /**
   * Mapper typé : transforme LieuApi → Lieu (front)
   * - normalise les valeurs null
   * - calcule isPermanent si absent
   */
  private mapLieu(api: LieuApi): Lieu {

    return {
      id: api.id,
      nom: api.nom,
      description: api.description ?? null,
      adresse: api.adresse ?? null,
      isPermanent: api.isPermanent ?? (!api.dateDebut && !api.dateFin),
      dateDebut: api.dateDebut ?? null,
      dateFin: api.dateFin ?? null,
      prixAdulte: api.prixAdulte ?? null,
      prixEnfant: api.prixEnfant ?? null,
      latitude: api.latitude ?? null,
      longitude: api.longitude ?? null,
      publicCible: api.publicCible ?? null,
      urlInfos: api.urlInfos ?? null,
      infosAcces: api.infosAcces ?? null,
      quartier: api.quartier ?? null,
      categories: api.categories ?? null,
      categoriePrincipale: api.categoriePrincipale ?? null,
      stationBus: api.stationBus ?? null,
      // L’URL est déjà absolue côté back
      coverUrl: api.coverUrl ?? null,
      type: api.type ?? null,
    };
  }

  /**
   * Récupère la liste complète des lieux (sans filtre)
   */
  getLieux(): Observable<Lieu[]> {
    const params = { page: 1, pageSize: 50 };
    return this.http.get<LieuxApiResponse>(this.apiUrl, { params }).pipe(
      map((res) => res.items.map((item) => this.mapLieu(item)))
    );
  }

  /**
   * Récupère un lieu par son ID
   */
  getLieuById(id: number): Observable<Lieu> {
    return this.http.get<LieuApi>(`${this.apiUrl}/${id}`).pipe(
      map((apiLieu) => this.mapLieu(apiLieu))
    );
  }

  /**
   * Recherche de lieux via la barre de recherche
   * - q = texte libre (nom, description, adresse, catégories)
   */
  getLieuxByQuery(q: string): Observable<Lieu[]> {
    const params = { q };
    return this.http.get<LieuxApiResponse>(this.apiUrl, { params }).pipe(
      map((res) => res.items.map((item) => this.mapLieu(item)))
    );
  }
}
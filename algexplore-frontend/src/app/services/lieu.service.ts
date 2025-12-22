import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

const API_BASE = 'http://localhost:3000';

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
  stationBus?: string | null;
  coverUrl?: string | null;
  type?: string | null;
}

/** Modèle front propre en camelCase */
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
  categories?: string[] | null;
  stationBus?: string | null;
  coverUrl?: string | null;
  type?: string | null;
}

/** Réponse paginée de l’API */
interface LieuxApiResponse {
  items: LieuApi[];
  page: number;
  pageSize: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class LieuService {
  private apiUrl = `${API_BASE}/lieux`;
  private http = inject(HttpClient);

  /** Mapper typé : transforme LieuApi → Lieu */
  private mapLieu(api: LieuApi): Lieu {
    console.log('API Lieu reçu :', api); // ← DEBUG

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
      stationBus: api.stationBus ?? null,
      // ON NE TOUCHE PAS à L’URL → le back envoie déjà l’URL complète
      coverUrl: api.coverUrl ?? null,
      type: api.type ?? null,
    };
  }

  /** Récupère la liste complète des lieux */
  getLieux(): Observable<Lieu[]> {
    return this.http.get<LieuxApiResponse>(this.apiUrl).pipe(
      map((res) => res.items.map((item) => this.mapLieu(item)))
    );
  }

  /** Récupère un lieu par ID */
  getLieuById(id: number): Observable<Lieu> {
    return this.http.get<LieuApi>(`${this.apiUrl}/${id}`).pipe(
      map((apiLieu) => this.mapLieu(apiLieu))
    );
  }
}

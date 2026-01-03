import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';

export interface AvisAuteur {
  id: number;
  prenom: string;
  nom: string;
}

export interface Avis {
  id: number;
  note: number;
  commentaire: string | null;
  lieuId: number;
  utilisateurId: number;
  utilisateur?: AvisAuteur; // présent sur GET /avis?lieuId=...
  lieu?: { id: number; nom: string }; // présent sur GET /avis/me
}

interface AvisListResponse {
  avis: Avis[];
}

interface AvisOneResponse {
  avis: Avis;
}

@Injectable({ providedIn: 'root' })
export class AvisService {
  private http = inject(HttpClient);
  private readonly api = API_URL;

  /** Public : récupérer les avis d'un lieu */
  getByLieu(lieuId: number): Observable<AvisListResponse> {
    return this.http.get<AvisListResponse>(`${this.api}/avis`, {
      params: { lieuId: String(lieuId) },
    });
  }

  /** Protégé : créer un avis */
  create(payload: {
    lieuId: number;
    note: number;
    commentaire?: string;
  }): Observable<AvisOneResponse> {
    return this.http.post<AvisOneResponse>(`${this.api}/avis`, payload);
  }

  /** Protégé : modifier son avis (note et/ou commentaire) */
  update(
    avisId: number,
    payload: { note?: number; commentaire?: string }
  ): Observable<AvisOneResponse> {
    return this.http.patch<AvisOneResponse>(`${this.api}/avis/${avisId}`, payload);
  }

  /** Protégé : supprimer son avis */
  delete(avisId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/avis/${avisId}`);
  }

  /** Protégé : récupérer MES avis (espace perso) */
  getMine(): Observable<AvisListResponse> {
    return this.http.get<AvisListResponse>(`${this.api}/avis/me`);
  }
}

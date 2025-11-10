import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface Lieu {
  id: number;
  nom: string;
  description: string;
  adresse: string;
  dateCreation: string;
  prixAdulte?: string | null;
  prixEnfant?: string | null;
}

// on décrit la forme réelle renvoyée par le backend
interface LieuxApiResponse {
  items: Lieu[];
  page: number;
  pageSize: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class LieuService {
  private apiUrl = 'http://localhost:3000/lieux';

  private http = inject(HttpClient);

  getLieux(): Observable<Lieu[]> {
    return this.http.get<LieuxApiResponse>(this.apiUrl).pipe(
      map((response) => response.items)
    );
  }
  
  getLieuById(id: number): Observable<Lieu> {
    return this.http.get<Lieu>(`${this.apiUrl}/${id}`);
  }

}


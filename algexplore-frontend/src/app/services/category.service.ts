import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { API_URL } from '../config/api.config';

export interface Category {
  id: number;
  nom: string;
}

@Injectable({ providedIn: "root" })
export class CategoryService {
  private http = inject(HttpClient);

  private readonly apiUrl = API_URL;

  getAll(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`);
  }
}
import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface Category {
  id: number;
  nom: string;
}

@Injectable({ providedIn: "root" })
export class CategoryService {
  private http = inject(HttpClient);

  private readonly apiUrl = "http://localhost:3000";

  getAll(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`);
  }
}
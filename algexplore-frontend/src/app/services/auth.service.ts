import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';
import { API_URL } from '../config/api.config';

export interface User {
  id: number;
  email: string;
  role: string;
  nom: string;
  prenom: string;
  dateInscription: string | null;
}

interface AuthResponse {
  token: string;
  user: User;
}

interface MeResponse {
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  private readonly TOKEN_KEY = 'algexplore_token';
  private readonly api = API_URL;

  private userSubject = new BehaviorSubject<User | null>(null);
  public user$ = this.userSubject.asObservable();

  /** Token actuel (ou null) */
  get token(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /** True si un token existe */
  get isAuthenticated(): boolean {
    return !!this.token;
  }

  /** Snapshot user */
  get currentUser(): User | null {
    return this.userSubject.value;
  }

  /** Stocke / supprime le token */
  private setToken(token: string | null): void {
    if (token) localStorage.setItem(this.TOKEN_KEY, token);
    else localStorage.removeItem(this.TOKEN_KEY);
  }

  /** (Optionnel) call au démarrage: si token -> hydrate le user */
  init(): void {
    if (this.isAuthenticated) {
      this.me().subscribe();
    }
  }

  /** Inscription */
  register(payload: {
    email: string;
    password: string;
    nom?: string;
    prenom?: string;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/auth/register`, payload).pipe(
      tap(({ token, user }) => {
        this.setToken(token);
        this.userSubject.next(user);
      })
    );
  }

  /** Connexion */
  login(payload: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/auth/login`, payload).pipe(
      tap(({ token, user }) => {
        this.setToken(token);
        this.userSubject.next(user);
      })
    );
  }

  /** GET /auth/me (protégé) */
  me(): Observable<MeResponse | null> {
    return this.http.get<MeResponse>(`${this.api}/auth/me`).pipe(
      tap(({ user }) => this.userSubject.next(user)),
      catchError(() => {
        // token invalide/expiré -> nettoyage
        this.logout();
        return of(null);
      })
    );
  }

  /** Déconnexion */
  logout(): void {
    this.setToken(null);
    this.userSubject.next(null);
  }
}
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  private http = inject(HttpClient);
  private router = inject(Router);

  // Signal pour suivre l'état de connexion
  // Initialisé à false (car on ne peut plus lire le token côté client)
  private loggedInState = signal<boolean>(false);

  // Signal public en lecture seule pour les composants
  public isLoggedIn = this.loggedInState.asReadonly();

  // Méthode de connexion
  login(credentials: { email: string, password: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials, { withCredentials: true })
      .pipe(
        tap(() => {
          this.loggedInState.set(true);
          this.router.navigate(['/home']);
        }),
        catchError(error => {
          console.error('Login failed:', error);
          this.loggedInState.set(false);
          return throwError(() => new Error('Échec de la connexion. Vérifiez vos identifiants.'));
        })
      );
  }

  // Méthode d'inscription
  register(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, userData, { withCredentials: true }).pipe(
      tap(() => {
        console.log('Registration successful');
        this.router.navigate(['/login']);
      }),
      catchError(error => {
        console.error('Registration failed:', error);
        return throwError(() => new Error("Échec de l'inscription. L'email est peut-être déjà utilisé."));
      })
    );
  }

  // Méthode de déconnexion
  logout(): void {
    // Appeler une route backend pour supprimer le cookie côté serveur
    this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).subscribe({
      next: () => {
        this.loggedInState.set(false);
        this.router.navigate(['/login']);
      },
      error: () => {
        this.loggedInState.set(false);
        this.router.navigate(['/login']);
      }
    });
  }

  // Méthode pour vérifier l'état de connexion (optionnel : ping une route protégée)
  checkAuth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me`, { withCredentials: true }).pipe(
      tap(response => {
        this.loggedInState.set(true);
        console.log('checkAuth: utilisateur authentifié', response);
      }),
      catchError(() => {
        this.loggedInState.set(false);
        console.log('checkAuth: utilisateur non authentifié');
        return throwError(() => new Error('Non authentifié'));
      })
    );
  }

  // Méthode simple pour vérifier l'état de connexion (utilisée par le Guard et les composants)
  isUserLoggedIn(): boolean {
    return this.isLoggedIn();
  }
}
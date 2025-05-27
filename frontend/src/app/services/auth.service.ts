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

  // Injection de dépendances avec inject()
  private http = inject(HttpClient);
  private router = inject(Router);

  // Signal pour suivre l'état de connexion
  // Initialisé en vérifiant le token au démarrage
  private loggedInState = signal<boolean>(this.hasToken());

  // Signal public en lecture seule pour les composants
  // les composants liront directement la valeur avec isLoggedIn()
  public isLoggedIn = this.loggedInState.asReadonly();

  // Vérifie si un token existe dans le localStorage
  private hasToken(): boolean {
    return !!localStorage.getItem('authToken');
  }

  // Méthode de connexion
  login(credentials: { email: string, password: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('userId', response.id); // <-- Ajoute cette ligne
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
    return this.http.post<any>(`${this.apiUrl}/register`, userData).pipe(
      tap(() => {
        console.log('Registration successful');
        this.router.navigate(['/login']); // Rediriger vers login après succès
      }),
      catchError(error => {
        console.error('Registration failed:', error);
         // Propager une erreur pour que le composant puisse l'afficher
        return throwError(() => new Error("Échec de l'inscription. L'email est peut-être déjà utilisé."));
      })
    );
  }

  // Méthode de déconnexion
  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('currentCampaign');
    this.loggedInState.set(false);
    this.router.navigate(['/login']);
  }

  // Méthode pour obtenir le token (peut être utile pour les intercepteurs)
  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  // Méthode simple pour vérifier l'état de connexion (utilisée par le Guard et les composants)
  // Retourne directement la valeur actuelle du signal
  isUserLoggedIn(): boolean {
    return this.isLoggedIn(); // Accès direct à la valeur du signal readonly
  }
}
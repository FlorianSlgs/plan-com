import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { ChangePasswordData } from '../models/user.model';
import { TaskService } from './dashboard/tasks/task-service.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.baseUrl + environment.endpoints.auth;

  private http = inject(HttpClient);
  private router = inject(Router);
  private taskService = inject(TaskService); // Injection du TaskService

  // Signal pour suivre l'état de connexion
  // Initialisé à false (car on ne peut plus lire le token côté client)
  private loggedInState = signal<boolean>(false);
  private authChecked = signal<boolean>(false);
  private userIsAdmin = signal<boolean>(false);

  // Signal public en lecture seule pour les composants
  public isLoggedIn = this.loggedInState.asReadonly();
  public isAdmin = this.userIsAdmin.asReadonly();

  constructor() {
    // Vérifier l'auth au démarrage
    this.initializeAuth();
  }

  private initializeAuth(): void {
    this.checkAuth().subscribe({
      next: () => {
        this.authChecked.set(true);
      },
      error: () => {
        this.authChecked.set(true);
      }
    });
  }

  // Méthode de connexion
  login(credentials: { email: string, password: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials, { withCredentials: true })
      .pipe(
        tap((response) => {
          // Réinitialiser le localStorage avant de définir le nouvel état
          this.clearLocalStorage();

          this.loggedInState.set(true);
          // Définir le statut admin depuis la réponse
          this.userIsAdmin.set(response.isAdmin || false);
          
          // Redirection basée sur le rôle
          if (response.isAdmin) {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/home']);
          }
        }),
        catchError(error => {
          console.error('Login failed:', error);
          this.loggedInState.set(false);
          this.userIsAdmin.set(false);
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
        // Récupère le message du backend s'il existe, sinon message par défaut
        const backendMsg = error?.error?.message || "Échec de l'inscription. L'email est peut-être déjà utilisé.";
        return throwError(() => new Error(backendMsg));
      })
    );
  }

  // Méthode de déconnexion
  logout(): void {
    // Appeler une route backend pour supprimer le cookie côté serveur
    this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).subscribe({
      next: () => {
        this.loggedInState.set(false);
        this.userIsAdmin.set(false);
        
        // Réinitialiser les données des services
        this.taskService.clearTasks(); 
        
        // Supprimer currentCampaign du localStorage
        localStorage.removeItem('currentCampaign');
        localStorage.removeItem('currentCampaignId');
        localStorage.removeItem('events');
        this.router.navigate(['/login']);
      },
      error: () => {
        this.loggedInState.set(false);
        this.userIsAdmin.set(false);
        
        // Réinitialiser les données des services même en cas d'erreur
        this.taskService.clearTasks(); 
        
        // Supprimer currentCampaign du localStorage même en cas d'erreur
        localStorage.removeItem('currentCampaign');
        localStorage.removeItem('currentCampaignId');
        localStorage.removeItem('events');
        this.router.navigate(['/login']);
      }
    });
  }

  // Méthode pour vérifier l'état de connexion
  checkAuth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me`, { withCredentials: true }).pipe(
      tap(response => {
        this.loggedInState.set(true);
        this.userIsAdmin.set((response as any).isAdmin || false);
        console.log('checkAuth: utilisateur authentifié', response);
      }),
      catchError(() => {
        this.loggedInState.set(false);
        this.userIsAdmin.set(false);
        console.log('checkAuth: utilisateur non authentifié');
        return throwError(() => new Error('Non authentifié'));
      })
    );
  }

  // Nouvelle méthode pour changer le mot de passe
  changePassword(passwordData: ChangePasswordData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/change-password`, passwordData, { withCredentials: true })
      .pipe(
        tap(response => {
          console.log('Password changed successfully:', response);
        }),
        catchError(error => {
          console.error('Password change failed:', error);
          // Récupère le message du backend s'il existe, sinon message par défaut
          const backendMsg = error?.error?.message || 'Erreur lors du changement de mot de passe.';
          return throwError(() => new Error(backendMsg));
        })
      );
  }

  // Méthode simple pour vérifier l'état de connexion (utilisée par le Guard et les composants)
  isUserLoggedIn(): boolean {
    return this.isLoggedIn();
  }

  // Méthode pour vérifier si l'utilisateur est admin
  isUserAdmin(): boolean {
    return this.isAdmin();
  }

  // Getter pour savoir si la vérification initiale est terminée
  isAuthChecked(): boolean {
    return this.authChecked();
  }

  // Méthode privée pour nettoyer le localStorage
  private clearLocalStorage(): void {
    const keysToRemove = [
      'currentCampaign',
      'currentCampaignId',
      'events',
      'campaignAccess',
    ];
    
    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('localStorage réinitialisé lors de la nouvelle connexion');
  }
}
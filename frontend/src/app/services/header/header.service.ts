import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

interface User {
  first_name: string;
  last_name: string;
}

interface Campaign {
  id: number;
  name: string;
}

interface CreateCampaignResponse {
  message: string;
  campaign?: Campaign;
}

interface DeleteAccountResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class HeaderService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/header';
  private readonly httpOptions = {
    withCredentials: true // Important pour envoyer les cookies
  };

  /**
   * Récupère le nom de l'utilisateur connecté (utilise le cookie userId automatiquement)
   */
  getUserName(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/user`, this.httpOptions)
      .pipe(
        retry(1), // Retry une fois en cas d'échec
        catchError(this.handleError)
      );
  }

  /**
   * Crée une campagne pour l'utilisateur connecté
   */
  createCampaign(name: string): Observable<CreateCampaignResponse> {
    if (!name?.trim()) {
      return throwError(() => new Error('Le nom de la campagne est requis'));
    }

    return this.http.post<CreateCampaignResponse>(
      `${this.apiUrl}/campaign`, 
      { name: name.trim() }, 
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les campagnes de l'utilisateur connecté
   */
  getCampaigns(): Observable<Campaign[]> {
    return this.http.get<Campaign[]>(`${this.apiUrl}/campaigns`, this.httpOptions)
      .pipe(
        retry(1), // Retry une fois en cas d'échec
        catchError(this.handleError)
      );
  }

  /**
   * Supprime le compte de l'utilisateur connecté
   */
  deleteAccount(): Observable<DeleteAccountResponse> {
    return this.http.delete<DeleteAccountResponse>(`${this.apiUrl}/account`, this.httpOptions)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Gestion centralisée des erreurs HTTP
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Une erreur est survenue';

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur client: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      switch (error.status) {
        case 0:
          errorMessage = 'Impossible de contacter le serveur';
          break;
        case 401:
          errorMessage = 'Session expirée, veuillez vous reconnecter';
          break;
        case 403:
          errorMessage = 'Accès non autorisé';
          break;
        case 404:
          errorMessage = 'Ressource non trouvée';
          break;
        case 500:
          errorMessage = 'Erreur serveur interne';
          break;
        default:
          errorMessage = error.error?.message || `Erreur ${error.status}: ${error.statusText}`;
      }
    }

    console.error('Erreur HeaderService:', {
      status: error.status,
      message: errorMessage,
      url: error.url
    });

    return throwError(() => new Error(errorMessage));
  };
}
import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ErrorsService {
  
  /**
   * Gère les erreurs HTTP de manière centralisée
   */
  handleError = (error: HttpErrorResponse): Observable<never> => {
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
        case 422:
          // Code spécifique pour email non enregistré
          errorMessage = error.error?.message || 'Email non enregistré dans le système';
          break;
        case 500:
          errorMessage = 'Erreur serveur interne';
          break;
        default:
          errorMessage = error.error?.message || `Erreur ${error.status}: ${error.statusText}`;
      }
    }

    console.error('Erreur HTTP:', {
      status: error.status,
      message: errorMessage,
      url: error.url
    });

    return throwError(() => new Error(errorMessage));
  };

  /**
   * Gère les erreurs de validation
   */
  handleValidationError(message: string): Observable<never> {
    return throwError(() => new Error(message));
  }
}
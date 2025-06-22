import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

export interface Goal {
  id: string;
  goals_name: string;
  goals_description: string;
  subgoals: string | string[];
  goals_imageurl: string;
}

export interface UploadResponse {
  filePath: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GoalsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/goals';
  private readonly httpOptions = {
    withCredentials: true // Important pour envoyer les cookies
  };

  /**
   * Upload d'image avec authentification par cookie
   */
  uploadGoalImage(formData: FormData): Observable<UploadResponse> {
    return this.http.post<UploadResponse>(`${this.apiUrl}/upload-image`, formData, this.httpOptions)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère les goals par campagne (l'utilisateur est identifié par le cookie)
   */
  getGoalsByCampaign(campaignName: string): Observable<Goal[]> {
    if (!campaignName?.trim()) {
      return throwError(() => new Error('Le nom de campagne est requis'));
    }

    return this.http.get<Goal[]>(`${this.apiUrl}/campaign/${encodeURIComponent(campaignName)}`, this.httpOptions)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Met à jour un goal
   */
  updateGoal(goalId: string, formData: FormData): Observable<any> {
    if (!goalId?.trim()) {
      return throwError(() => new Error('L\'ID du goal est requis'));
    }

    return this.http.put(`${this.apiUrl}/update/${goalId}`, formData, this.httpOptions)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Supprime un goal
   */
  deleteGoal(goalId: string): Observable<any> {
    if (!goalId?.trim()) {
      return throwError(() => new Error('L\'ID du goal est requis'));
    }

    return this.http.delete(`${this.apiUrl}/delete/${goalId}`, this.httpOptions)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  /**
   * Gestion centralisée des erreurs
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Une erreur inattendue s\'est produite';

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur client: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      switch (error.status) {
        case 400:
          errorMessage = 'Données invalides';
          break;
        case 401:
          errorMessage = 'Non autorisé - Veuillez vous reconnecter';
          break;
        case 403:
          errorMessage = 'Accès interdit';
          break;
        case 404:
          errorMessage = 'Ressource non trouvée';
          break;
        case 500:
          errorMessage = 'Erreur serveur interne';
          break;
        default:
          errorMessage = `Erreur ${error.status}: ${error.message}`;
      }
    }

    console.error('GoalsService Error:', error);
    return throwError(() => new Error(errorMessage));
  };
}
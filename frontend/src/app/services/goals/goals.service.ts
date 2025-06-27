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
  campaign_id?: string;
}

export interface UploadResponse {
  filePath: string;
  message?: string;
}

// Nouvelle interface pour les permissions
export interface CampaignPermissions {
  hasAccess: boolean;
  isOwner: boolean;
  isReadOnly: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GoalsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/goals';
  private readonly httpOptions = {
    withCredentials: true
  };

  /**
   * Vérifie les permissions de l'utilisateur pour une campagne
   */
  getCampaignPermissions(campaignId: string): Observable<CampaignPermissions> {
    if (!campaignId?.trim()) {
      return throwError(() => new Error('L\'ID de campagne est requis'));
    }

    return this.http.get<CampaignPermissions>(`${this.apiUrl}/campaign-permissions/${encodeURIComponent(campaignId)}`, this.httpOptions)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

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
   * Récupère les goals par ID de campagne
   */
  getGoalsByCampaignId(campaignId: string): Observable<Goal[]> {
    if (!campaignId?.trim()) {
      return throwError(() => new Error('L\'ID de campagne est requis'));
    }

    return this.http.get<Goal[]>(`${this.apiUrl}/campaign-id/${encodeURIComponent(campaignId)}`, this.httpOptions)
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
      errorMessage = `Erreur client: ${error.error.message}`;
    } else {
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
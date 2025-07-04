import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

import { HttpService } from '../../http/http.service';
import { ErrorsService } from '../../errors/errors.service';
import { environment } from '../../../../environments/environment';
import { Goal, UploadResponse, CampaignPermissions } from '../../../models/goals.model';

@Injectable({
  providedIn: 'root'
})
export class GoalsService {
  private readonly httpService = inject(HttpService);
  private readonly errorHandler = inject(ErrorsService);
  private readonly apiUrl = this.httpService.buildUrl(environment.endpoints.goals);

  /**
   * Vérifie les permissions de l'utilisateur pour une campagne
   */
  getCampaignPermissions(campaignId: string): Observable<CampaignPermissions> {
    if (!campaignId?.trim()) {
      return this.errorHandler.handleValidationError('L\'ID de campagne est requis');
    }

    return this.httpService.get<CampaignPermissions>(`${this.apiUrl}/campaign-permissions/${encodeURIComponent(campaignId)}`)
      .pipe(
        retry(1),
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Upload d'image avec authentification par cookie
   */
  uploadGoalImage(formData: FormData): Observable<UploadResponse> {
    return this.httpService.post<UploadResponse>(`${this.apiUrl}/upload-image`, formData)
      .pipe(
        retry(1),
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Récupère les goals par ID de campagne
   */
  getGoalsByCampaignId(campaignId: string): Observable<Goal[]> {
    if (!campaignId?.trim()) {
      return this.errorHandler.handleValidationError('L\'ID de campagne est requis');
    }

    return this.httpService.get<Goal[]>(`${this.apiUrl}/campaign-id/${encodeURIComponent(campaignId)}`)
      .pipe(
        retry(1),
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Met à jour un goal
   */
  updateGoal(goalId: string, formData: FormData): Observable<any> {
    if (!goalId?.trim()) {
      return this.errorHandler.handleValidationError('L\'ID du goal est requis');
    }

    return this.httpService.put(`${this.apiUrl}/update/${goalId}`, formData)
      .pipe(
        retry(1),
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Supprime un goal
   */
  deleteGoal(goalId: string): Observable<any> {
    if (!goalId?.trim()) {
      return this.errorHandler.handleValidationError('L\'ID du goal est requis');
    }

    return this.httpService.delete(`${this.apiUrl}/delete/${goalId}`)
      .pipe(
        retry(1),
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Crée un nouveau goal
   */
  createGoal(formData: FormData): Observable<Goal> {
    return this.httpService.post<Goal>(`${this.apiUrl}/create`, formData)
      .pipe(
        retry(1),
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Récupère un goal par son ID
   */
  getGoalById(goalId: string): Observable<Goal> {
    if (!goalId?.trim()) {
      return this.errorHandler.handleValidationError('L\'ID du goal est requis');
    }

    return this.httpService.get<Goal>(`${this.apiUrl}/${encodeURIComponent(goalId)}`)
      .pipe(
        retry(1),
        catchError(this.errorHandler.handleError)
      );
  }
}
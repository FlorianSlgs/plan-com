import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

import { HttpService } from '../../http/http.service';
import { ErrorsService } from '../../errors/errors.service';
import { environment } from '../../../../environments/environment';

import { Target, CampaignPermissions, UploadResponse } from '../../../models/targets.model';

@Injectable({
  providedIn: 'root'
})
export class TargetsService {
private readonly httpService = inject(HttpService);
  private readonly errorHandler = inject(ErrorsService);
  private readonly apiUrl = this.httpService.buildUrl(environment.endpoints.targets);

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
  uploadTargetImage(formData: FormData): Observable<UploadResponse> {
    return this.httpService.post<UploadResponse>(`${this.apiUrl}/upload-image`, formData)
      .pipe(
        retry(1),
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Récupère les targets par ID de campagne
   */
  getTargetsByCampaignId(campaignId: string): Observable<Target[]> {
    if (!campaignId?.trim()) {
      return this.errorHandler.handleValidationError('L\'ID de campagne est requis');
    }

    return this.httpService.get<Target[]>(`${this.apiUrl}/campaign-id/${encodeURIComponent(campaignId)}`)
      .pipe(
        retry(1),
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Met à jour un target
   */
  updateTarget(targetId: string, formData: FormData): Observable<any> {
    if (!targetId?.trim()) {
      return this.errorHandler.handleValidationError('L\'ID du target est requis');
    }

    return this.httpService.put(`${this.apiUrl}/update/${targetId}`, formData)
      .pipe(
        retry(1),
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Supprime un target
   */
  deleteTarget(targetId: string): Observable<any> {
    if (!targetId?.trim()) {
      return this.errorHandler.handleValidationError('L\'ID du target est requis');
    }

    return this.httpService.delete(`${this.apiUrl}/delete/${targetId}`)
      .pipe(
        retry(1),
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Crée un nouveau target
   */
  createTarget(formData: FormData): Observable<Target> {
    return this.httpService.post<Target>(`${this.apiUrl}/create`, formData)
      .pipe(
        retry(1),
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Récupère un target par son ID
   */
  getTargetById(targetId: string): Observable<Target> {
    if (!targetId?.trim()) {
      return this.errorHandler.handleValidationError('L\'ID du target est requis');
    }

    return this.httpService.get<Target>(`${this.apiUrl}/${encodeURIComponent(targetId)}`)
      .pipe(
        retry(1),
        catchError(this.errorHandler.handleError)
      );
  }
}

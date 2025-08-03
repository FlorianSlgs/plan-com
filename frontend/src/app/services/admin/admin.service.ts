import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { HttpService } from '../http/http.service';
import { ErrorsService } from '../errors/errors.service';
import { Campaign, AdminStats, AdminResponse } from '../../models/admin.model';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private httpService = inject(HttpService);
  private errorsService = inject(ErrorsService);
  private readonly apiUrl = '/admin';

  /**
   * Récupère toutes les campagnes (admin seulement)
   */
  getAllCampaigns(): Observable<AdminResponse<Campaign[]>> {
    const url = this.httpService.buildUrl(`${this.apiUrl}/campaigns`);
    return this.httpService.get<AdminResponse<Campaign[]>>(url)
      .pipe(
        catchError(this.errorsService.handleError)
      );
  }

  /**
   * Récupère les statistiques générales (admin seulement)
   */
  getAdminStats(): Observable<AdminResponse<AdminStats>> {
    const url = this.httpService.buildUrl(`${this.apiUrl}/stats`);
    return this.httpService.get<AdminResponse<AdminStats>>(url)
      .pipe(
        catchError(this.errorsService.handleError)
      );
  }
}
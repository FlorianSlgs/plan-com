import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

import { HttpService } from '../../http/http.service';
import { ErrorsService } from '../../errors/errors.service';
import { environment } from '../../../../environments/environment';
import { CalendarEvent, CampaignAccess } from '../../../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class ActionsService {
  private readonly httpService = inject(HttpService);
  private readonly errorHandler = inject(ErrorsService);
  private readonly apiUrl = this.httpService.buildUrl(environment.endpoints.actions);

  /**
   * Récupère les événements avec les permissions d'accès à la campagne
   */
  getEventsWithAccess(currentCampaignId?: string): Observable<{events: CalendarEvent[], access: CampaignAccess}> {
    const options = currentCampaignId ? { params: { currentCampaignId } } : {};
    
    return this.httpService.get<{events: CalendarEvent[], access: CampaignAccess}>(
      `${this.apiUrl}/with-access`,
      options
    ).pipe(
      retry(1), // Retry une fois en cas d'échec
      catchError(this.errorHandler.handleError)
    );
  }

  /**
   * Récupère les événements (méthode originale conservée pour compatibilité)
   */
  getEvents(currentCampaignId?: string): Observable<CalendarEvent[]> {
    const options = currentCampaignId ? { params: { currentCampaignId } } : {};
    
    return this.httpService.get<CalendarEvent[]>(this.apiUrl, options)
      .pipe(
        retry(1), // Retry une fois en cas d'échec
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Ajoute un nouvel événement
   */
  addEvent(event: CalendarEvent): Observable<CalendarEvent> {
    const eventData = {
      ...event,
      date: event.date instanceof Date ? event.date.toISOString() : event.date
    };

    return this.httpService.post<CalendarEvent>(this.apiUrl, eventData)
      .pipe(
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Met à jour un événement existant
   */
  updateEvent(event: CalendarEvent): Observable<CalendarEvent> {
    if (!event.id) {
      return this.errorHandler.handleValidationError('L\'ID de l\'événement est requis pour la mise à jour');
    }

    const eventData = {
      ...event,
      date: event.date instanceof Date ? event.date.toISOString() : event.date
    };

    return this.httpService.put<CalendarEvent>(`${this.apiUrl}/${event.id}`, eventData)
      .pipe(
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Supprime un événement
   */
  deleteEvent(id: string): Observable<any> {
    if (!id?.trim()) {
      return this.errorHandler.handleValidationError('L\'ID de l\'événement est requis');
    }

    return this.httpService.delete(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.errorHandler.handleError)
      );
  }
}
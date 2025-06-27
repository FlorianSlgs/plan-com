import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CalendarEvent, CampaignAccess } from '../../components/dashboard/actions/event.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ActionsService {
  private apiUrl = 'http://localhost:3000/api/actions';

  constructor(private http: HttpClient) { }

  // Nouvelle méthode qui récupère les événements ET les permissions
  getEventsWithAccess(currentCampaignId?: string): Observable<{events: CalendarEvent[], access: CampaignAccess}> {
    let params: any = {};
    if (currentCampaignId) params.currentCampaignId = currentCampaignId;
    
    return this.http.get<{events: CalendarEvent[], access: CampaignAccess}>(`${this.apiUrl}/with-access`, { 
      params,
      withCredentials: true
    });
  }

  // Méthode originale conservée pour compatibilité
  getEvents(currentCampaignId?: string): Observable<CalendarEvent[]> {
    let params: any = {};
    if (currentCampaignId) params.currentCampaignId = currentCampaignId;
    return this.http.get<CalendarEvent[]>(this.apiUrl, { 
      params,
      withCredentials: true
    });
  }

  addEvent(event: CalendarEvent): Observable<CalendarEvent> {
    return this.http.post<CalendarEvent>(this.apiUrl, {
      ...event,
      date: event.date instanceof Date ? event.date.toISOString() : event.date
    }, {
      withCredentials: true
    });
  }

  updateEvent(event: CalendarEvent): Observable<CalendarEvent> {
    return this.http.put<CalendarEvent>(`${this.apiUrl}/${event.id}`, {
      ...event,
      date: event.date instanceof Date ? event.date.toISOString() : event.date
    }, {
      withCredentials: true
    }); 
  }

  deleteEvent(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      withCredentials: true
    });
  }
}
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CalendarEvent } from '../../components/dashboard/actions/event.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ActionsService {
  private apiUrl = 'http://localhost:3000/api/actions';

  constructor(private http: HttpClient) { }

  // Les cookies sont automatiquement envoyés avec les requêtes HTTP
  // Le userId sera récupéré côté serveur depuis le cookie
  getEvents(currentCampaign?: string): Observable<CalendarEvent[]> {
    let params: any = {};
    if (currentCampaign) params.currentCampaign = currentCampaign;
    return this.http.get<CalendarEvent[]>(this.apiUrl, { 
      params,
      withCredentials: true // Important pour envoyer les cookies
    });
  }

  addEvent(event: CalendarEvent): Observable<CalendarEvent> {
    return this.http.post<CalendarEvent>(this.apiUrl, {
      ...event,
      date: event.date instanceof Date ? event.date.toISOString() : event.date
    }, {
      withCredentials: true // Important pour envoyer les cookies
    });
  }

  updateEvent(event: CalendarEvent): Observable<CalendarEvent> {
    return this.http.put<CalendarEvent>(`${this.apiUrl}/${event.id}`, {
      ...event,
      date: event.date instanceof Date ? event.date.toISOString() : event.date
    }, {
      withCredentials: true // Important pour envoyer les cookies
    }); 
  }

  deleteEvent(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      withCredentials: true // Important pour envoyer les cookies
    });
  }
}
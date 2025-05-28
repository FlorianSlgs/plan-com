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

  getEvents(userId?: string, currentCampaign?: string): Observable<CalendarEvent[]> {
    let params: any = {};
    if (userId) params.userId = userId;
    if (currentCampaign) params.currentCampaign = currentCampaign;
    return this.http.get<CalendarEvent[]>(this.apiUrl, { params });
  }

  addEvent(event: CalendarEvent): Observable<CalendarEvent> {
    return this.http.post<CalendarEvent>(this.apiUrl, {
      ...event,
      date: event.date instanceof Date ? event.date.toISOString() : event.date
    });
  }
}
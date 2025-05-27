import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class HeaderService {
  private apiUrl = 'http://localhost:3000/api/header';

  constructor(private http: HttpClient) {}

  getUserNameById(id: string) {
    return this.http.get<{ first_name: string, last_name: string }>(`${this.apiUrl}/user/${id}`);
  }

  createCampaign(userId: string, name: string) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/campaign`, { userId, name });
  }

  getCampaignsByUserId(userId: string) {
    return this.http.get<{ id: number, name: string }[]>(`${this.apiUrl}/campaigns/${userId}`);
  }
}
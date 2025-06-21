import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class HeaderService {
  private apiUrl = 'http://localhost:3000/api/header';

  constructor(private http: HttpClient) {}

  // Récupère le nom de l'utilisateur connecté (utilise le cookie userId automatiquement)
  getUserName() {
    return this.http.get<{ first_name: string, last_name: string }>(`${this.apiUrl}/user`, {
      withCredentials: true // Important pour envoyer les cookies
    });
  }

  // Crée une campagne pour l'utilisateur connecté
  createCampaign(name: string) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/campaign`, { name }, {
      withCredentials: true // Important pour envoyer les cookies
    });
  }

  // Récupère les campagnes de l'utilisateur connecté
  getCampaigns() {
    return this.http.get<{ id: number, name: string }[]>(`${this.apiUrl}/campaigns`, {
      withCredentials: true // Important pour envoyer les cookies
    });
  }
}
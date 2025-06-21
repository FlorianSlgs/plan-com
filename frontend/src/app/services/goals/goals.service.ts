import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class GoalsService {
  private apiUrl = 'http://localhost:3000/api/goals';

  constructor(private http: HttpClient) {}

  // Upload d'image avec authentification par cookie
  uploadGoalImage(formData: FormData) {
    return this.http.post<{ filePath: string }>(`${this.apiUrl}/upload-image`, formData, {
      withCredentials: true // Important pour envoyer les cookies
    });
  }

  // Récupère les goals par campagne (l'utilisateur est identifié par le cookie)
  getGoalsByCampaign(campaignName: string) {
    return this.http.get<{
      id: string,
      goals_name: string,
      goals_description: string,
      subgoals: string,
      goals_imageurl: string
    }[]>(`${this.apiUrl}/campaign/${encodeURIComponent(campaignName)}`, {
      withCredentials: true // Important pour envoyer les cookies
    });
  }

  // Met à jour un goal
  updateGoal(goalId: string, formData: FormData) {
    return this.http.put(`${this.apiUrl}/update/${goalId}`, formData, {
      withCredentials: true // Important pour envoyer les cookies
    });
  }

  // Supprime un goal
  deleteGoal(goalId: string) {
    return this.http.delete(`${this.apiUrl}/delete/${goalId}`, {
      withCredentials: true // Important pour envoyer les cookies
    });
  }
}
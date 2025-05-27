import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class GoalsService {
  private apiUrl = 'http://localhost:3000/api/goals';

  constructor(private http: HttpClient) {}

  uploadGoalImage(formData: FormData) {
    return this.http.post<{ filePath: string }>(`${this.apiUrl}/upload-image`, formData);
  }

  getGoalsByUserAndCampaign(userId: string, campaignName: string) {
    return this.http.get<{
      goals_name: string,
      goals_description: string,
      subgoals: string,
      goals_imageurl: string
    }[]>(`${this.apiUrl}/user/${userId}/campaign/${encodeURIComponent(campaignName)}`);
  }
}
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, map } from 'rxjs/operators';

interface User {
  first_name: string;
  last_name: string;
}

interface Campaign {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  user_role: 'owner' | 'reader' | 'editor';
}

interface CreateCampaignResponse {
  message: string;
  campaign?: Campaign;
}

interface DeleteAccountResponse {
  message: string;
}

interface DeleteCampaignResponse {
  message: string;
  success: boolean;
}

interface LeaveSharedCampaignResponse {
  message: string;
  success: boolean;
}

interface InviteUserRequest {
  email: string;
  campaignId: number;
  role: 'reader' | 'editor';
}

interface InviteUserResponse {
  message: string;
  success: boolean;
}

interface PendingInvitation {
  id: number;
  campaignId: number;
  campaignName: string;
  inviterName: string;
  role: 'reader' | 'editor';
}

interface PendingInvitationsResponse {
  invitations: PendingInvitation[];
  success: boolean;
}

interface InvitationActionResponse {
  message: string;
  success: boolean;
  campaignId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class HeaderService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/header';
  private readonly httpOptions = {
    withCredentials: true // Important pour envoyer les cookies
  };

  /**
   * Récupère le nom de l'utilisateur connecté (utilise le cookie userId automatiquement)
   */
  getUserName(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/user`, this.httpOptions)
      .pipe(
        retry(1), // Retry une fois en cas d'échec
        catchError(this.handleError)
      );
  }

  /**
   * Crée une campagne pour l'utilisateur connecté
   */
  createCampaign(name: string): Observable<CreateCampaignResponse> {
    if (!name?.trim()) {
      return throwError(() => new Error('Le nom de la campagne est requis'));
    }

    return this.http.post<CreateCampaignResponse>(
      `${this.apiUrl}/campaign`, 
      { name: name.trim() }, 
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les campagnes de l'utilisateur connecté (propres et partagées)
   */
  getCampaigns(): Observable<Campaign[]> {
    return this.http.get<Campaign[]>(`${this.apiUrl}/campaigns`, this.httpOptions)
      .pipe(
        retry(1), // Retry une fois en cas d'échec
        catchError(this.handleError)
      );
  }

  /**
   * Supprime une campagne spécifique (pour les campagnes dont l'utilisateur est propriétaire)
   */
  deleteCampaign(campaignId: number, campaignName: string): Observable<DeleteCampaignResponse> {
    if (!campaignId || !campaignName?.trim()) {
      return throwError(() => new Error('L\'ID et le nom de la campagne sont requis'));
    }

    return this.http.delete<DeleteCampaignResponse>(
      `${this.apiUrl}/campaign/${campaignId}`, 
      {
        ...this.httpOptions,
        body: { campaignName: campaignName.trim() }
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Quitte une campagne partagée
   */
  leaveSharedCampaign(campaignId: number): Observable<LeaveSharedCampaignResponse> {
    if (!campaignId) {
      return throwError(() => new Error('L\'ID de campagne est requis'));
    }

    return this.http.delete<LeaveSharedCampaignResponse>(
      `${this.apiUrl}/shared-campaign/${campaignId}`, 
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Supprime le compte de l'utilisateur connecté
   */
  deleteAccount(): Observable<DeleteAccountResponse> {
    return this.http.delete<DeleteAccountResponse>(`${this.apiUrl}/account`, this.httpOptions)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Invite un utilisateur à rejoindre une campagne
   */
  inviteUser(email: string, campaignId: number, role: 'reader' | 'editor'): Observable<InviteUserResponse> {
    if (!email?.trim()) {
      return throwError(() => new Error('L\'email est requis'));
    }

    if (!campaignId) {
      return throwError(() => new Error('L\'ID de campagne est requis'));
    }

    const requestData: InviteUserRequest = {
      email: email.trim(),
      campaignId,
      role
    };

    return this.http.post<InviteUserResponse>(
      `${this.apiUrl}/invite`, 
      requestData, 
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les invitations en attente pour l'utilisateur connecté
   */
  getPendingInvitations(): Observable<PendingInvitation[]> {
    return this.http.get<PendingInvitationsResponse>(`${this.apiUrl}/invitations`, this.httpOptions)
      .pipe(
        retry(1),
        catchError(this.handleError),
        // Extraire seulement le tableau d'invitations
        map(response => response.invitations || [])
      );
  }

  /**
   * Accepte une invitation
   */
  acceptInvitation(invitationId: number): Observable<InvitationActionResponse> {
    if (!invitationId) {
      return throwError(() => new Error('L\'ID de l\'invitation est requis'));
    }

    return this.http.put<InvitationActionResponse>(
      `${this.apiUrl}/invitation/${invitationId}/accept`, 
      {}, 
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Refuse une invitation
   */
  rejectInvitation(invitationId: number): Observable<InvitationActionResponse> {
    if (!invitationId) {
      return throwError(() => new Error('L\'ID de l\'invitation est requis'));
    }

    return this.http.delete<InvitationActionResponse>(
      `${this.apiUrl}/invitation/${invitationId}/reject`, 
      this.httpOptions
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Gestion centralisée des erreurs HTTP
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Une erreur est survenue';

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur client: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      switch (error.status) {
        case 0:
          errorMessage = 'Impossible de contacter le serveur';
          break;
        case 401:
          errorMessage = 'Session expirée, veuillez vous reconnecter';
          break;
        case 403:
          errorMessage = 'Accès non autorisé';
          break;
        case 404:
          errorMessage = 'Ressource non trouvée';
          break;
        case 422:
          // Code spécifique pour email non enregistré
          errorMessage = error.error?.message || 'Email non enregistré dans le système';
          break;
        case 500:
          errorMessage = 'Erreur serveur interne';
          break;
        default:
          errorMessage = error.error?.message || `Erreur ${error.status}: ${error.statusText}`;
      }
    }

    console.error('Erreur HeaderService:', {
      status: error.status,
      message: errorMessage,
      url: error.url
    });

    return throwError(() => new Error(errorMessage));
  };
}
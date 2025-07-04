import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, retry, map } from 'rxjs/operators';

import { HttpService } from '../http/http.service';
import { ErrorsService } from '../errors/errors.service';
import { environment } from '../../../environments/environment';
import { User } from '../../models/user.model';
import { 
  Campaign,
  CreateCampaignResponse,
  DeleteAccountResponse,
  DeleteCampaignResponse,
  LeaveSharedCampaignResponse,
  InvitationActionResponse,
  InviteUserRequest,
  InviteUserResponse,
  PendingInvitation,
  PendingInvitationsResponse 
} from '../../models/campaign.model';

@Injectable({
  providedIn: 'root'
})
export class HeaderService {
  private readonly httpService = inject(HttpService);
  private readonly errorHandler = inject(ErrorsService);
  private readonly apiUrl = this.httpService.buildUrl(environment.endpoints.header);

  /**
   * Récupère le nom de l'utilisateur connecté (utilise le cookie userId automatiquement)
   */
  getUserName(): Observable<User> {
    return this.httpService.get<User>(`${this.apiUrl}/user`)
      .pipe(
        retry(1), // Retry une fois en cas d'échec
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Crée une campagne pour l'utilisateur connecté
   */
  createCampaign(name: string): Observable<CreateCampaignResponse> {
    if (!name?.trim()) {
      return this.errorHandler.handleValidationError('Le nom de la campagne est requis');
    }

    return this.httpService.post<CreateCampaignResponse>(
      `${this.apiUrl}/campaign`, 
      { name: name.trim() }
    ).pipe(
      catchError(this.errorHandler.handleError)
    );
  }

  /**
   * Récupère les campagnes de l'utilisateur connecté (propres et partagées)
   */
  getCampaigns(): Observable<Campaign[]> {
    return this.httpService.get<Campaign[]>(`${this.apiUrl}/campaigns`)
      .pipe(
        retry(1), // Retry une fois en cas d'échec
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Supprime une campagne spécifique (pour les campagnes dont l'utilisateur est propriétaire)
   */
  deleteCampaign(campaignId: number, campaignName: string): Observable<DeleteCampaignResponse> {
    if (!campaignId || !campaignName?.trim()) {
      return this.errorHandler.handleValidationError('L\'ID et le nom de la campagne sont requis');
    }

    return this.httpService.delete<DeleteCampaignResponse>(
      `${this.apiUrl}/campaign/${campaignId}`, 
      {
        body: { campaignName: campaignName.trim() }
      }
    ).pipe(
      catchError(this.errorHandler.handleError)
    );
  }

  /**
   * Quitte une campagne partagée
   */
  leaveSharedCampaign(campaignId: number): Observable<LeaveSharedCampaignResponse> {
    if (!campaignId) {
      return this.errorHandler.handleValidationError('L\'ID de campagne est requis');
    }

    return this.httpService.delete<LeaveSharedCampaignResponse>(`${this.apiUrl}/shared-campaign/${campaignId}`)
      .pipe(
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Supprime le compte de l'utilisateur connecté
   */
  deleteAccount(): Observable<DeleteAccountResponse> {
    return this.httpService.delete<DeleteAccountResponse>(`${this.apiUrl}/account`)
      .pipe(
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Invite un utilisateur à rejoindre une campagne
   */
  inviteUser(email: string, campaignId: number, role: 'reader' | 'editor'): Observable<InviteUserResponse> {
    if (!email?.trim()) {
      return this.errorHandler.handleValidationError('L\'email est requis');
    }

    if (!campaignId) {
      return this.errorHandler.handleValidationError('L\'ID de campagne est requis');
    }

    const requestData: InviteUserRequest = {
      email: email.trim(),
      campaignId,
      role
    };

    return this.httpService.post<InviteUserResponse>(`${this.apiUrl}/invite`, requestData)
      .pipe(
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Récupère les invitations en attente pour l'utilisateur connecté
   */
  getPendingInvitations(): Observable<PendingInvitation[]> {
    return this.httpService.get<PendingInvitationsResponse>(`${this.apiUrl}/invitations`)
      .pipe(
        retry(1),
        catchError(this.errorHandler.handleError),
        // Extraire seulement le tableau d'invitations
        map(response => response.invitations || [])
      );
  }

  /**
   * Accepte une invitation
   */
  acceptInvitation(invitationId: number): Observable<InvitationActionResponse> {
    if (!invitationId) {
      return this.errorHandler.handleValidationError('L\'ID de l\'invitation est requis');
    }

    return this.httpService.put<InvitationActionResponse>(
      `${this.apiUrl}/invitation/${invitationId}/accept`, 
      {}
    ).pipe(
      catchError(this.errorHandler.handleError)
    );
  }

  /**
   * Refuse une invitation
   */
  rejectInvitation(invitationId: number): Observable<InvitationActionResponse> {
    if (!invitationId) {
      return this.errorHandler.handleValidationError('L\'ID de l\'invitation est requis');
    }

    return this.httpService.delete<InvitationActionResponse>(`${this.apiUrl}/invitation/${invitationId}/reject`)
      .pipe(
        catchError(this.errorHandler.handleError)
      );
  }
}
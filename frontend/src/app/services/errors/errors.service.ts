import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

export interface ErrorConfig {
  retryAttempts?: number;
  customMessages?: { [key: number]: string };
  logErrors?: boolean;
  context?: string;
  showUserFriendlyMessage?: boolean;
}

export interface ErrorLog {
  status: number;
  message: string;
  url?: string;
  timestamp: string;
  context: string;
  userAgent?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorsService {
  private readonly defaultMessages: { [key: number]: string } = {
    0: 'Impossible de contacter le serveur',
    400: 'Requête invalide',
    401: 'Session expirée, veuillez vous reconnecter',
    403: 'Accès non autorisé',
    404: 'Ressource non trouvée',
    409: 'Conflit de données',
    422: 'Données invalides',
    429: 'Trop de requêtes, veuillez patienter',
    500: 'Erreur serveur interne',
    502: 'Serveur indisponible',
    503: 'Service temporairement indisponible'
  };

  private errorLogs: ErrorLog[] = [];

  /**
   * Gère les erreurs HTTP de manière centralisée
   */
  handleError(
    error: HttpErrorResponse, 
    context: string = 'Application',
    config: ErrorConfig = {}
  ): Observable<never> {
    const {
      customMessages = {},
      logErrors = true,
      showUserFriendlyMessage = true
    } = config;

    let errorMessage = this.buildErrorMessage(error, customMessages, context);
    
    if (logErrors) {
      this.logError(error, errorMessage, context);
    }

    // Pour certaines erreurs, on peut vouloir un message plus technique
    if (!showUserFriendlyMessage) {
      errorMessage = `${error.status}: ${error.statusText}`;
    }

    return throwError(() => new Error(errorMessage));
  }

  /**
   * Construit le message d'erreur approprié
   */
  private buildErrorMessage(
    error: HttpErrorResponse,
    customMessages: { [key: number]: string },
    context: string
  ): string {
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      return `Erreur client: ${error.error.message}`;
    }

    // Priorité aux messages personnalisés
    if (customMessages[error.status]) {
      return customMessages[error.status];
    }

    // Messages contextuels
    const contextualMessages = this.getContextualErrorMessages(context);
    if (contextualMessages[error.status]) {
      return contextualMessages[error.status];
    }

    // Messages par défaut
    if (this.defaultMessages[error.status]) {
      return this.defaultMessages[error.status];
    }

    // Message du serveur ou message générique
    return error.error?.message || `Erreur ${error.status}: ${error.statusText}`;
  }

  /**
   * Enregistre l'erreur pour le débogage
   */
  private logError(error: HttpErrorResponse, message: string, context: string): void {
    const errorLog: ErrorLog = {
      status: error.status,
      message,
      url: error.url || undefined,
      timestamp: new Date().toISOString(),
      context,
      userAgent: navigator.userAgent
    };

    this.errorLogs.push(errorLog);
    
    // Limite le nombre de logs stockés (garde les 100 derniers)
    if (this.errorLogs.length > 100) {
      this.errorLogs = this.errorLogs.slice(-100);
    }

    console.error(`Erreur ${context}:`, {
      status: error.status,
      message,
      url: error.url,
      timestamp: errorLog.timestamp,
      fullError: error
    });
  }

  /**
   * Messages d'erreur personnalisés pour différents contextes
   */
  getContextualErrorMessages(context: string): { [key: number]: string } {
    const contextMessages: { [key: string]: { [key: number]: string } } = {
      'campaign': {
        400: 'Données de campagne invalides',
        409: 'Une campagne avec ce nom existe déjà',
        422: 'Nom de campagne invalide ou déjà utilisé',
        404: 'Campagne non trouvée ou accès refusé'
      },
      'invitation': {
        400: 'Données d\'invitation invalides',
        409: 'Invitation déjà envoyée à cet utilisateur',
        422: 'Email non enregistré dans le système',
        404: 'Invitation non trouvée'
      },
      'user': {
        404: 'Utilisateur non trouvé',
        422: 'Informations utilisateur invalides',
        409: 'Email déjà utilisé par un autre compte'
      },
      'auth': {
        401: 'Identifiants incorrects',
        403: 'Compte désactivé ou accès refusé',
        429: 'Trop de tentatives de connexion'
      }
    };

    return contextMessages[context.toLowerCase()] || {};
  }

  /**
   * Récupère les logs d'erreur (utile pour le débogage)
   */
  getErrorLogs(): ErrorLog[] {
    return [...this.errorLogs];
  }

  /**
   * Vide les logs d'erreur
   */
  clearErrorLogs(): void {
    this.errorLogs = [];
  }

  /**
   * Vérifie si une erreur nécessite une reconnexion
   */
  requiresReauth(error: HttpErrorResponse): boolean {
    return error.status === 401;
  }

  /**
   * Vérifie si une erreur est due à un problème réseau
   */
  isNetworkError(error: HttpErrorResponse): boolean {
    return error.status === 0 || error.status === 502 || error.status === 503;
  }

  /**
   * Vérifie si l'erreur peut être retentée
   */
  isRetryableError(error: HttpErrorResponse): boolean {
    return this.isNetworkError(error) || error.status === 429 || error.status >= 500;
  }
}
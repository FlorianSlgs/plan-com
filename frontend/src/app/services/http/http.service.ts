import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { ErrorsService,ErrorConfig } from '../errors/errors.service';

export interface HttpOptions {
  headers?: { [key: string]: string } | HttpHeaders;
  body?: any;
  params?: { [key: string]: string | number | boolean } | HttpParams;
  observe?: 'body';
  responseType?: 'json';
}

export interface RequestConfig {
  retryAttempts?: number;
  errorContext?: string;
  errorConfig?: ErrorConfig;
}

@Injectable({
  providedIn: 'root'
})
export class HttpService {
  private readonly http = inject(HttpClient);
  private readonly errorsService = inject(ErrorsService);
  private readonly defaultOptions = { ...environment.defaultOptions };

  /**
   * Effectue une requête GET
   */
  get<T>(
    endpoint: string, 
    options: HttpOptions = {}, 
    config: RequestConfig = {}
  ): Observable<T> {
    const { retryAttempts = 1, errorContext = 'HTTP GET', errorConfig = {} } = config;
    
    const httpOptions = this.buildHttpOptions(options);
    
    return this.http.get<T>(endpoint, httpOptions).pipe(
      retry(retryAttempts),
      catchError((error: HttpErrorResponse) => 
        this.errorsService.handleError(error, errorContext, errorConfig)
      )
    );
  }

  /**
   * Effectue une requête POST
   */
  post<T>(
    endpoint: string, 
    body: any, 
    options: HttpOptions = {},
    config: RequestConfig = {}
  ): Observable<T> {
    const { errorContext = 'HTTP POST', errorConfig = {} } = config;
    
    const httpOptions = this.buildHttpOptions(options);
    
    return this.http.post<T>(endpoint, body, httpOptions).pipe(
      catchError((error: HttpErrorResponse) => 
        this.errorsService.handleError(error, errorContext, errorConfig)
      )
    );
  }

  /**
   * Effectue une requête PUT
   */
  put<T>(
    endpoint: string, 
    body: any = {}, 
    options: HttpOptions = {},
    config: RequestConfig = {}
  ): Observable<T> {
    const { errorContext = 'HTTP PUT', errorConfig = {} } = config;
    
    const httpOptions = this.buildHttpOptions(options);
    
    return this.http.put<T>(endpoint, body, httpOptions).pipe(
      catchError((error: HttpErrorResponse) => 
        this.errorsService.handleError(error, errorContext, errorConfig)
      )
    );
  }

  /**
   * Effectue une requête DELETE
   */
  delete<T>(
    endpoint: string, 
    options: HttpOptions = {},
    config: RequestConfig = {}
  ): Observable<T> {
    const { errorContext = 'HTTP DELETE', errorConfig = {} } = config;
    
    const httpOptions = this.buildHttpOptions(options);
    
    return this.http.delete<T>(endpoint, httpOptions).pipe(
      catchError((error: HttpErrorResponse) => 
        this.errorsService.handleError(error, errorContext, errorConfig)
      )
    );
  }

  /**
   * Construit les options HTTP avec les paramètres par défaut
   */
  private buildHttpOptions(options: HttpOptions): {
    headers?: HttpHeaders | { [header: string]: string | string[]; };
    observe: 'body';
    params?: HttpParams | { [param: string]: string | number | boolean | readonly (string | number | boolean)[]; };
    responseType: 'json';
    body?: any;
  } {
    // Utiliser HttpHeaders pour une gestion cohérente
    let headers: HttpHeaders;
    
    // Commencer avec les headers par défaut
    const defaultHeaders = this.defaultOptions.headers || {};
    headers = new HttpHeaders(defaultHeaders);

    // Merger les headers des options
  if (options.headers) {
    if (options.headers instanceof HttpHeaders) {
      // Si c'est déjà un HttpHeaders, l'utiliser directement
      headers = options.headers;
    } else {
      // Si c'est un objet, l'ajouter aux headers existants
      for (const [key, value] of Object.entries(options.headers)) {
        headers = headers.set(key, value);
      }
    }
  }

    // Gérer les paramètres
    let params: HttpParams | { [param: string]: string | number | boolean | readonly (string | number | boolean)[]; } | undefined;
    
    if (options.params) {
      if (options.params instanceof HttpParams) {
        params = options.params;
      } else {
        params = options.params;
      }
    }

    const httpOptions: any = {
      headers,
      observe: 'body' as const,
      responseType: 'json' as const
    };

    if (params) {
      httpOptions.params = params;
    }

    if (options.body) {
      httpOptions.body = options.body;
    }

    return httpOptions;
  }

  /**
   * Construit une URL complète avec l'endpoint
   */
  buildUrl(module: string, path: string = ''): string {
    const baseUrl = environment.baseUrl;
    const moduleEndpoint = environment.endpoints[module as keyof typeof environment.endpoints];
    
    if (!moduleEndpoint) {
      throw new Error(`Endpoint non configuré pour le module: ${module}`);
    }
    
    return `${baseUrl}${moduleEndpoint}${path}`;
  }
}
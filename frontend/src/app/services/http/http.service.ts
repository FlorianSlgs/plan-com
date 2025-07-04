import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { HttpOptions } from '../../models/http.model';

@Injectable({
  providedIn: 'root'
})
export class HttpService {
  protected readonly http = inject(HttpClient);
  protected readonly baseUrl = environment.baseUrl;
  protected readonly defaultOptions: HttpOptions = { 
    ...environment.defaultOptions 
  };

  /**
   * Effectue une requête GET
   */
  get<T>(url: string, options?: HttpOptions): Observable<T> {
    return this.http.get<T>(url, { ...this.defaultOptions, ...options });
  }

  /**
   * Effectue une requête POST
   */
  post<T>(url: string, body: any, options?: HttpOptions): Observable<T> {
    return this.http.post<T>(url, body, { ...this.defaultOptions, ...options });
  }

  /**
   * Effectue une requête PUT
   */
  put<T>(url: string, body: any, options?: HttpOptions): Observable<T> {
    return this.http.put<T>(url, body, { ...this.defaultOptions, ...options });
  }

  /**
   * Effectue une requête PATCH
   */
  patch<T>(url: string, body: any, options?: HttpOptions): Observable<T> {
    return this.http.patch<T>(url, body, { ...this.defaultOptions, ...options });
  }

  /**
   * Effectue une requête DELETE
   */
  delete<T>(url: string, options?: HttpOptions): Observable<T> {
    return this.http.delete<T>(url, { ...this.defaultOptions, ...options });
  }

  /**
   * Construit l'URL complète
   */
  buildUrl(endpoint: string): string {
    return `${this.baseUrl}${endpoint}`;
  }
}
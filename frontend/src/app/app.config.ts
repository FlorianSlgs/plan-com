import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'; // Pour HttpClient

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes), // Fournir le routeur avec les routes définies
    provideHttpClient(withInterceptorsFromDi()), // Fournir HttpClient (avec support pour intercepteurs DI si besoin)
    // importProvidersFrom(BrowserAnimationsModule) // Si vous utilisez des animations
  ]
};
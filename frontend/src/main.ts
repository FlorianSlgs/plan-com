import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config'; // Importer la configuration
import { AppComponent } from './app/app.component'; // Importer le composant racine

bootstrapApplication(AppComponent, appConfig) // Utiliser bootstrapApplication
  .catch((err) => console.error(err));

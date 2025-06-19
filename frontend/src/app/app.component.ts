import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router'; // Importer RouterOutlet et RouterLink
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true, // Marquer comme standalone
  imports: [RouterOutlet], // Importer les directives de routing nécessaires
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'angular-auth-app-standalone';
  // Injecter AuthService pour l'utiliser dans le template
  private authService = inject(AuthService);

}
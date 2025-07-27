import { Component, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { NavbarComponent } from '../layout/navbar/navbar.component';
import { HeaderComponent } from '../layout/header/header.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, HeaderComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  // Injecter le service
  authService = inject(AuthService);

  logout(): void {
    this.authService.logout();
  }
}
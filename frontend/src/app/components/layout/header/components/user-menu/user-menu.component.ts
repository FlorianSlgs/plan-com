import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss'
})
export class UserMenuComponent {
  // Input - données reçues du composant parent
  userFullName = input.required<string>();
  pendingInvitationsCount = input<number>(0);

  // Outputs - événements émis vers le composant parent
  openSettings = output<void>();
  openProfile = output<void>();
  logout = output<void>();

  // Méthodes pour gérer les événements
  onSettingsClick() {
    this.openSettings.emit();
  }

  onProfileClick() {
    this.openProfile.emit();
  }

  onLogoutClick() {
    this.logout.emit();
  }
}
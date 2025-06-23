import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, CommonModule],
  standalone: true,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit {
  hasCampaign = false;

  ngOnInit() {
    this.checkCampaign();
  }

  private checkCampaign() {
    this.hasCampaign = !!localStorage.getItem('currentCampaign');
  }

  // Méthode pour empêcher la navigation
  preventNavigation(event: Event) {
    if (!this.hasCampaign) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { HeaderService } from '../../../services/header/header.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  dropdownOpen = false;
  
  @Output() logout = new EventEmitter<void>();
  userFullName: string = '';
  campaigns: { id: number, name: string }[] = [];
  currentCampaign: string = '';

  constructor(private headerService: HeaderService) {}

  ngOnInit() {
    // Récupère le nom de l'utilisateur depuis le backend (le backend utilisera le cookie)
    this.headerService.getUserName().subscribe({
      next: user => {
        this.userFullName = `${user.first_name} ${user.last_name}`;
      },
      error: () => {
        this.userFullName = 'Utilisateur';
      }
    });

    // Récupère les campagnes de l'utilisateur depuis le backend
    this.headerService.getCampaigns().subscribe({
      next: campaigns => {
        this.campaigns = campaigns;
      },
      error: () => {
        this.campaigns = [];
      }
    });

    // Récupère la campagne courante depuis le localStorage (côté client seulement)
    this.currentCampaign = localStorage.getItem('currentCampaign') || '';
  }

  selectCampaign(name: string) {
    localStorage.setItem('currentCampaign', name);
    this.currentCampaign = name;
    window.location.reload();
  }

  onLogout() {
    this.logout.emit();
  }

  showCampaignModal = false;
  campaignName = '';

  createCampaign() {
    if (!this.campaignName.trim()) return;
    
    this.headerService.createCampaign(this.campaignName).subscribe({
      next: () => {
        // Stocke le nom de la campagne dans le localStorage
        localStorage.setItem('currentCampaign', this.campaignName);

        // Recharge la page pour afficher la nouvelle campagne sélectionnée
        window.location.reload();
      },
      error: () => {
        alert('Erreur lors de la création de la campagne.');
      }
    });
  }
}
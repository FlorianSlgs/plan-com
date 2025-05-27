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
  @Output() logout = new EventEmitter<void>();
  userFullName: string = '';
  campaigns: { id: number, name: string }[] = [];
  currentCampaign: string = '';

  constructor(private headerService: HeaderService) {}

  ngOnInit() {
    const userId = localStorage.getItem('userId');
    this.currentCampaign = localStorage.getItem('currentCampaign') || '';
    if (userId) {
      this.headerService.getUserNameById(userId).subscribe({
        next: user => {
          this.userFullName = `${user.first_name} ${user.last_name}`;
        },
        error: () => {
          this.userFullName = 'Utilisateur';
        }
      });

          // Récupère les campagnes de l'utilisateur
    this.headerService.getCampaignsByUserId(userId).subscribe({
      next: campaigns => {
        this.campaigns = campaigns;
      },
      error: () => {
        this.campaigns = [];
      }
    });
    } else {
      this.userFullName = 'Utilisateur';
      this.campaigns = [];
    }
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
    const userId = localStorage.getItem('userId');
    if (!userId) {
      alert('Utilisateur non connecté.');
      return;
    }
    this.headerService.createCampaign(userId, this.campaignName).subscribe({
      next: () => {
        // Stocke le nom de la campagne dans le localStorage
        localStorage.setItem('currentCampaign', this.campaignName);

        // Recharge la page pour afficher la nouvelle campagne sélectionnée
        window.location.reload();

        // (Optionnel : tu peux retirer le rafraîchissement manuel de la liste)
        // this.headerService.getCampaignsByUserId(userId).subscribe({...});
        // this.showCampaignModal = false;
        // this.campaignName = '';
      },
      error: () => {
        alert('Erreur lors de la création de la campagne.');
      }
    });
  }
}
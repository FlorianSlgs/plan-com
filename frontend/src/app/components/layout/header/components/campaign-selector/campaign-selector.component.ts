import { Component, input, output } from '@angular/core';

interface Campaign {
  id: number;
  name: string;
}

@Component({
  selector: 'app-campaign-selector',
  standalone: true,
  imports: [],
  templateUrl: './campaign-selector.component.html',
  styleUrl: './campaign-selector.component.scss'
})
export class CampaignSelectorComponent {
  // Inputs - données reçues du composant parent
  campaigns = input.required<Campaign[]>();
  currentCampaign = input.required<string>();
  loadingState = input.required<'idle' | 'loading' | 'error'>();
  error = input<string | null>(null);
  successMessage = input<string>('');

  // Outputs - événements émis vers le composant parent
  campaignSelected = output<string>();
  openCampaignModal = output<void>();

  // Méthodes pour gérer les événements
  onCampaignClick(campaignName: string) {
    this.campaignSelected.emit(campaignName);
  }

  onNewCampaignClick() {
    this.openCampaignModal.emit();
  }
}
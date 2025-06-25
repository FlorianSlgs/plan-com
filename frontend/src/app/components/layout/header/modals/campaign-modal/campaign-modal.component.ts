import { Component, input, output, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-campaign-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './campaign-modal.component.html',
  styleUrl: './campaign-modal.component.scss'
})
export class CampaignModalComponent {
  // Inputs - données reçues du composant parent
  isOpen = input.required<boolean>();
  loadingState = input.required<'idle' | 'loading' | 'error'>();
  error = input<string | null>(null);

  // Outputs - événements émis vers le composant parent
  close = output<void>();
  createCampaign = output<string>();

  // État local du composant
  campaignName = signal<string>('');

  constructor() {
    // Réinitialiser le formulaire quand la modal se ferme
    effect(() => {
      if (!this.isOpen()) {
        this.campaignName.set('');
      }
    });
  }

  // Méthodes pour gérer les événements
  onClose() {
    this.close.emit();
  }

  onSubmit() {
    const name = this.campaignName().trim();
    if (name) {
      this.createCampaign.emit(name);
    }
  }

  onCampaignNameChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.campaignName.set(target.value);
  }

  // Méthode pour gérer la fermeture par échap ou clic sur backdrop
  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.onClose();
    }
  }
}
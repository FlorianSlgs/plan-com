import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-delete-confirmation-modal',
  standalone: true,
  imports: [],
  templateUrl: './delete-confirmation-modal.component.html',
  styleUrl: './delete-confirmation-modal.component.scss'
})
export class DeleteConfirmationModalComponent {
  // Inputs - données reçues du composant parent
  isOpen = input.required<boolean>();
  loadingState = input.required<'idle' | 'loading' | 'error'>();
  title = input<string>('Confirmer la suppression');
  message = input<string>('Êtes-vous sûr de vouloir supprimer cet élément ?');
  confirmButtonText = input<string>('Supprimer');
  cancelButtonText = input<string>('Annuler');
  confirmButtonClass = input<string>('bg-red-600 hover:bg-red-700');
  showWarningIcon = input<boolean>(true);
  loadingText = input<string>('Suppression...');

  // Outputs - événements émis vers le composant parent
  close = output<void>();
  confirm = output<void>();

  // Méthodes pour gérer les événements
  onClose() {
    this.close.emit();
  }

  onConfirm() {
    this.confirm.emit();
  }

  // Méthodes pour la navigation et accessibilité
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
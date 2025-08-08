import { Component, input, output, ViewChild, ElementRef, OnInit, OnDestroy, effect } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';

@Component({
  selector: 'app-delete-confirmation-modal',
  standalone: true,
  imports: [A11yModule],
  templateUrl: './delete-confirmation-modal.component.html',
  styleUrl: './delete-confirmation-modal.component.scss'
})
export class DeleteConfirmationModalComponent implements OnInit, OnDestroy {
  // ViewChild pour le focus automatique
  @ViewChild('cancelButton') cancelButton!: ElementRef<HTMLButtonElement>;

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
  
  // Nouvelles options d'accessibilité
  autoFocusCancel = input<boolean>(true); // Focus automatique sur le bouton Annuler
  preventBackdropClose = input<boolean>(false); // Empêcher la fermeture en cliquant sur l'overlay
  preventEscClose = input<boolean>(false); // Empêcher la fermeture avec Escape

  // Outputs - événements émis vers le composant parent
  close = output<void>();
  confirm = output<void>();
  
  // État pour la gestion du focus
  private previousActiveElement: Element | null = null;

  constructor() {
    // Effect pour gérer l'ouverture/fermeture du modal
    effect(() => {
      if (this.isOpen()) {
        this.onModalOpen();
      } else {
        this.onModalClose();
      }
    });
  }

  ngOnInit(): void {
    // Sauvegarde l'élément actif avant l'ouverture du modal
    this.previousActiveElement = document.activeElement;
  }

  ngOnDestroy(): void {
    // Restaure le focus si nécessaire lors de la destruction du composant
    this.restorePreviousFocus();
  }

  /**
   * Appelé lors de l'ouverture du modal
   */
  private onModalOpen(): void {
    // Sauvegarde l'élément actif
    this.previousActiveElement = document.activeElement;
    
    // Désactive le scroll du body
    document.body.style.overflow = 'hidden';
    
    // Focus automatique sur le bouton Annuler après un court délai
    if (this.autoFocusCancel()) {
      setTimeout(() => {
        if (this.cancelButton?.nativeElement) {
          this.cancelButton.nativeElement.focus();
        }
      }, 100);
    }
  }

  /**
   * Appelé lors de la fermeture du modal
   */
  private onModalClose(): void {
    // Réactive le scroll du body
    document.body.style.overflow = '';
    
    // Restaure le focus sur l'élément précédent
    this.restorePreviousFocus();
  }

  /**
   * Restaure le focus sur l'élément qui était actif avant l'ouverture du modal
   */
  private restorePreviousFocus(): void {
    if (this.previousActiveElement && typeof (this.previousActiveElement as any).focus === 'function') {
      (this.previousActiveElement as any).focus();
    }
  }

  /**
   * Gère la fermeture du modal
   */
  onClose(): void {
    if (this.loadingState() !== 'loading') {
      this.close.emit();
    }
  }

  /**
   * Gère la confirmation de l'action
   */
  onConfirm(): void {
    if (this.loadingState() !== 'loading') {
      this.confirm.emit();
    }
  }

  /**
   * Gère les clics sur l'overlay (backdrop)
   */
  onBackdropClick(event: Event): void {
    // Ne ferme que si le clic est sur l'overlay et non sur le contenu du modal
    if (event.target === event.currentTarget && !this.preventBackdropClose()) {
      this.onClose();
    }
  }

  /**
   * Gère les événements clavier pour l'accessibilité
   */
  onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        if (!this.preventEscClose()) {
          event.preventDefault();
          this.onClose();
        }
        break;
        
      case 'Enter':
        // Empêche la soumission accidentelle pendant le chargement
        if (this.loadingState() === 'loading') {
          event.preventDefault();
        }
        break;
        
      default:
        break;
    }
  }

  /**
   * Vérifie si le modal peut être fermé (pas en état de chargement)
   */
  canClose(): boolean {
    return this.loadingState() !== 'loading';
  }

  /**
   * Vérifie si les actions sont désactivées
   */
  isActionDisabled(): boolean {
    return this.loadingState() === 'loading';
  }

  /**
   * Retourne la classe CSS appropriée pour le bouton de confirmation
   */
  getConfirmButtonClass(): string {
    let baseClass = this.confirmButtonClass();
    
    if (this.loadingState() === 'error') {
      baseClass = 'bg-red-700 hover:bg-red-800';
    }
    
    return baseClass;
  }

  /**
   * Retourne l'attribut aria-busy pour l'accessibilité
   */
  getAriaBusy(): boolean {
    return this.loadingState() === 'loading';
  }

  /**
   * Retourne l'attribut aria-describedby pour l'accessibilité
   */
  getAriaDescribedBy(): string {
    return 'delete-confirm-message';
  }
}
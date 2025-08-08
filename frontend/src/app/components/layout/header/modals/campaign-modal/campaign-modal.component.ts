import { Component, input, output, signal, effect, ViewChild, ElementRef, OnInit, OnDestroy, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';

@Component({
  selector: 'app-campaign-modal',
  standalone: true,
  imports: [FormsModule, A11yModule],
  templateUrl: './campaign-modal.component.html',
  styleUrl: './campaign-modal.component.scss'
})
export class CampaignModalComponent implements OnInit, OnDestroy {
  // ViewChild pour le focus automatique
  @ViewChild('campaignInput') campaignInput!: ElementRef<HTMLInputElement>;

  // Inputs - données reçues du composant parent
  isOpen = input.required<boolean>();
  loadingState = input.required<'idle' | 'loading' | 'error'>();
  error = input<string | null>(null);

  // Nouvelles options de configuration
  autoFocus = input<boolean>(true);
  preventEscapeClose = input<boolean>(false);
  preventBackdropClose = input<boolean>(false);
  minLength = input<number>(3);
  maxLength = input<number>(100);
  placeholder = input<string>('Entrez le nom de votre campagne');

  // Outputs - événements émis vers le composant parent
  close = output<void>();
  createCampaign = output<string>();

  // État local du composant
  campaignName = signal<string>('');
  
  // État pour la gestion du focus
  private previousActiveElement: Element | null = null;
  private isSubmitting = signal<boolean>(false);

  // Computed signals pour la validation
  isFormValid = computed(() => {
    const name = this.campaignName().trim();
    return name.length >= this.minLength() && name.length <= this.maxLength();
  });

  hasError = computed(() => {
    return !!this.error() || (this.campaignName().trim().length > 0 && !this.isFormValid());
  });

  characterCount = computed(() => {
    return `${this.campaignName().length}/${this.maxLength()}`;
  });

  canSubmit = computed(() => {
    return this.isFormValid() && this.loadingState() !== 'loading' && !this.isSubmitting();
  });

  constructor() {
    // Effect pour gérer l'ouverture/fermeture du modal
    effect(() => {
      if (this.isOpen()) {
        this.onModalOpen();
      } else {
        this.onModalClose();
      }
    });

    // Effect pour réinitialiser le formulaire quand la modal se ferme
    effect(() => {
      if (!this.isOpen()) {
        this.resetForm();
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
    // Réactive le scroll du body
    document.body.style.overflow = '';
  }

  // ===================
  // GESTION DU MODAL
  // ===================

  /**
   * Appelé lors de l'ouverture du modal
   */
  private onModalOpen(): void {
    // Sauvegarde l'élément actif
    this.previousActiveElement = document.activeElement;
    
    // Désactive le scroll du body
    document.body.style.overflow = 'hidden';
    
    // Focus automatique sur le champ de saisie après un court délai
    if (this.autoFocus()) {
      setTimeout(() => {
        if (this.campaignInput?.nativeElement) {
          this.campaignInput.nativeElement.focus();
          this.campaignInput.nativeElement.select(); // Sélectionne le texte si présent
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
    
    // Remet à zéro l'état de soumission
    this.isSubmitting.set(false);
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
   * Remet à zéro le formulaire
   */
  private resetForm(): void {
    this.campaignName.set('');
    this.isSubmitting.set(false);
  }

  // ===================
  // GESTION DES ÉVÉNEMENTS
  // ===================

  /**
   * Ferme le modal si possible
   */
  onClose(): void {
    if (this.loadingState() !== 'loading' && !this.isSubmitting()) {
      this.close.emit();
    }
  }

  /**
   * Soumet le formulaire avec validation
   */
  onSubmit(): void {
    // Empêche la double soumission
    if (this.isSubmitting() || this.loadingState() === 'loading') {
      return;
    }

    const name = this.campaignName().trim();
    
    // Validation côté client
    if (!name) {
      this.focusInput();
      return;
    }

    if (name.length < this.minLength()) {
      this.focusInput();
      return;
    }

    if (name.length > this.maxLength()) {
      this.focusInput();
      return;
    }

    // Marque comme en cours de soumission
    this.isSubmitting.set(true);
    
    // Émet l'événement de création
    this.createCampaign.emit(name);
  }

  /**
   * Gère le changement de valeur dans le champ de saisie
   */
  onCampaignNameChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    let value = target.value;

    // Limite la longueur si nécessaire
    if (value.length > this.maxLength()) {
      value = value.substring(0, this.maxLength());
      target.value = value;
    }

    this.campaignName.set(value);
  }

  /**
   * Gère les clics sur l'overlay (backdrop)
   */
  onBackdropClick(event: Event): void {
    // Ne ferme que si le clic est sur l'overlay et si autorisé
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
        if (!this.preventEscapeClose()) {
          event.preventDefault();
          this.onClose();
        }
        break;
        
      case 'Enter':
        // Soumet le formulaire si valide, sinon empêche l'action par défaut
        if (this.canSubmit()) {
          event.preventDefault();
          this.onSubmit();
        } else if (!this.isFormValid()) {
          event.preventDefault();
        }
        break;
        
      default:
        break;
    }
  }

  // ===================
  // MÉTHODES UTILITAIRES
  // ===================

  /**
   * Met le focus sur le champ de saisie
   */
  focusInput(): void {
    setTimeout(() => {
      if (this.campaignInput?.nativeElement) {
        this.campaignInput.nativeElement.focus();
      }
    }, 0);
  }

  /**
   * Sélectionne tout le texte dans le champ de saisie
   */
  selectAllText(): void {
    if (this.campaignInput?.nativeElement) {
      this.campaignInput.nativeElement.select();
    }
  }

  /**
   * Vérifie si le modal peut être fermé
   */
  canClose(): boolean {
    return this.loadingState() !== 'loading' && !this.isSubmitting();
  }

  /**
   * Retourne le message d'erreur de validation côté client
   */
  getValidationError(): string | null {
    const name = this.campaignName().trim();
    
    if (name.length === 0) {
      return null; // Pas d'erreur si vide (pas encore saisi)
    }
    
    if (name.length < this.minLength()) {
      return `Le nom doit contenir au moins ${this.minLength()} caractères`;
    }
    
    if (name.length > this.maxLength()) {
      return `Le nom ne peut pas dépasser ${this.maxLength()} caractères`;
    }
    
    return null;
  }

  /**
   * Retourne la classe CSS pour le champ de saisie selon l'état
   */
  getInputClass(): string {
    let baseClass = 'form-input w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200';
    
    if (this.hasError()) {
      baseClass += ' border-red-500';
    } else {
      baseClass += ' border-gray-300';
    }
    
    return baseClass;
  }

  /**
   * Retourne l'ID approprié pour l'accessibilité
   */
  getAriaDescribedBy(): string {
    const ids: string[] = ['campaign-counter'];
    
    if (this.hasError() && this.error()) {
      ids.push('campaign-error');
    }
    
    return ids.join(' ');
  }

  /**
   * Retourne l'état aria-busy pour l'accessibilité
   */
  getAriaBusy(): boolean {
    return this.loadingState() === 'loading' || this.isSubmitting();
  }

  /**
   * Nettoie le nom de campagne (supprime les caractères indésirables)
   */
  sanitizeCampaignName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ') // Remplace les espaces multiples par un seul
      .replace(/[<>]/g, ''); // Supprime les caractères potentiellement dangereux
  }

  /**
   * Valide le nom de campagne avec des règles personnalisées
   */
  validateCampaignName(name: string): { valid: boolean; error?: string } {
    const trimmedName = name.trim();
    
    if (trimmedName.length === 0) {
      return { valid: false, error: 'Le nom de la campagne est requis' };
    }
    
    if (trimmedName.length < this.minLength()) {
      return { valid: false, error: `Le nom doit contenir au moins ${this.minLength()} caractères` };
    }
    
    if (trimmedName.length > this.maxLength()) {
      return { valid: false, error: `Le nom ne peut pas dépasser ${this.maxLength()} caractères` };
    }
    
    // Vérification de caractères spéciaux indésirables
    if (/<script|javascript:|on\w+=/i.test(trimmedName)) {
      return { valid: false, error: 'Le nom contient des caractères non autorisés' };
    }
    
    return { valid: true };
  }
}
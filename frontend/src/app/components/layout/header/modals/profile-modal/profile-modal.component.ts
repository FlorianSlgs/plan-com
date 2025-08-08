import { Component, input, output, signal, effect, inject, ViewChild, ElementRef, OnInit, OnDestroy, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { Subject, takeUntil, finalize } from 'rxjs';

// Services
import { AuthService } from '../../../../../services/auth.service';

// Modèles
import { UpdateProfileData, ChangePasswordData } from '../../../../../models/user.model';

@Component({
  selector: 'app-profile-modal',
  standalone: true,
  imports: [FormsModule, A11yModule],
  templateUrl: './profile-modal.component.html',
  styleUrl: './profile-modal.component.scss'
})
export class ProfileModalComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();

  // ViewChild pour le focus automatique
  @ViewChild('firstInputProfile') firstInputProfile!: ElementRef<HTMLInputElement>;
  @ViewChild('firstInputPassword') firstInputPassword!: ElementRef<HTMLInputElement>;

  // Inputs - données reçues du composant parent
  isOpen = input.required<boolean>();
  userFirstName = input.required<string>();
  userLastName = input.required<string>();
  loadingState = input.required<'idle' | 'loading' | 'error'>();
  error = input<string | null>(null);
  successMessage = input<string>('');

  // Nouvelles options de configuration
  autoFocus = input<boolean>(true);
  preventEscapeClose = input<boolean>(false);
  preventBackdropClose = input<boolean>(false);

  // Outputs - événements émis vers le composant parent
  close = output<void>();
  updateProfile = output<UpdateProfileData>();

  // État local du composant pour le formulaire de profil
  firstName = signal<string>('');
  lastName = signal<string>('');
  isFormDirty = signal<boolean>(false);

  // État pour la section changement de mot de passe
  showPasswordSection = signal<boolean>(false);
  currentPassword = signal<string>('');
  newPassword = signal<string>('');
  confirmPassword = signal<string>('');
  isPasswordFormDirty = signal<boolean>(false);
  passwordLoadingState = signal<'idle' | 'loading' | 'error'>('idle');
  passwordError = signal<string | null>(null);
  passwordSuccessMessage = signal<string>('');

  // État pour la gestion du focus
  private previousActiveElement: Element | null = null;
  private isSubmittingProfile = signal<boolean>(false);
  private isSubmittingPassword = signal<boolean>(false);

  // Computed signals pour la validation
  isFormValid = computed(() => {
    return this.firstName().trim().length >= 2 && 
           this.lastName().trim().length >= 2 &&
           this.firstName().trim().length <= 50 &&
           this.lastName().trim().length <= 50;
  });

  hasChanges = computed(() => {
    return this.firstName().trim() !== this.userFirstName() || 
           this.lastName().trim() !== this.userLastName();
  });

  isPasswordFormValid = computed(() => {
    return this.currentPassword().length > 0 &&
           this.newPassword().length >= 8 &&
           this.confirmPassword() === this.newPassword() &&
           !this.getNewPasswordError();
  });

  canSubmitProfile = computed(() => {
    return this.isFormValid() && 
           this.hasChanges() && 
           this.loadingState() !== 'loading' && 
           !this.isSubmittingProfile();
  });

  canSubmitPassword = computed(() => {
    return this.isPasswordFormValid() && 
           this.passwordLoadingState() !== 'loading' && 
           !this.isSubmittingPassword();
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

    // Initialiser les champs quand la modal s'ouvre
    effect(() => {
      if (this.isOpen()) {
        this.firstName.set(this.userFirstName());
        this.lastName.set(this.userLastName());
        this.isFormDirty.set(false);
        this.resetPasswordForm();
      }
    });
  }

  ngOnInit(): void {
    // Sauvegarde l'élément actif avant l'ouverture du modal
    this.previousActiveElement = document.activeElement;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
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
    
    // Focus automatique sur le premier champ du profil
    if (this.autoFocus()) {
      setTimeout(() => {
        if (this.firstInputProfile?.nativeElement) {
          this.firstInputProfile.nativeElement.focus();
          this.firstInputProfile.nativeElement.select(); // Sélectionne le texte si présent
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
    
    // Remet à zéro les états de soumission
    this.isSubmittingProfile.set(false);
    this.isSubmittingPassword.set(false);
  }

  /**
   * Restaure le focus sur l'élément qui était actif avant l'ouverture du modal
   */
  private restorePreviousFocus(): void {
    if (this.previousActiveElement && typeof (this.previousActiveElement as any).focus === 'function') {
      (this.previousActiveElement as any).focus();
    }
  }

  // ===================
  // GESTION DES ÉVÉNEMENTS
  // ===================

  /**
   * Ferme le modal si possible
   */
  onClose(): void {
    if (this.canClose()) {
      this.resetForm();
      this.resetPasswordForm();
      this.close.emit();
    }
  }

  /**
   * Soumet le formulaire de profil avec validation
   */
  onSubmit(): void {
    // Empêche la double soumission
    if (this.isSubmittingProfile() || this.loadingState() === 'loading') {
      return;
    }

    if (!this.isFormValid() || !this.hasChanges()) {
      return;
    }

    // Marque comme en cours de soumission
    this.isSubmittingProfile.set(true);

    const updateData: UpdateProfileData = {
      firstName: this.sanitizeName(this.firstName()),
      lastName: this.sanitizeName(this.lastName())
    };
    
    this.updateProfile.emit(updateData);

    // Remet à zéro l'état de soumission après un délai
    setTimeout(() => {
      this.isSubmittingProfile.set(false);
    }, 1000);
  }

  /**
   * Soumet le formulaire de changement de mot de passe
   */
  onSubmitPasswordChange(): void {
    // Empêche la double soumission
    if (this.isSubmittingPassword() || this.passwordLoadingState() === 'loading') {
      return;
    }

    if (!this.isPasswordFormValid()) {
      return;
    }

    // Marque comme en cours de soumission
    this.isSubmittingPassword.set(true);

    const passwordData: ChangePasswordData = {
      currentPassword: this.currentPassword(),
      newPassword: this.newPassword(),
      confirmPassword: this.confirmPassword()
    };

    this.passwordLoadingState.set('loading');
    this.passwordError.set(null);
    this.passwordSuccessMessage.set('');

    this.authService.changePassword(passwordData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.passwordLoadingState.set('idle');
          this.isSubmittingPassword.set(false);
        })
      )
      .subscribe({
        next: () => {
          this.passwordSuccessMessage.set('Mot de passe modifié avec succès');
          this.resetPasswordForm();
          this.clearPasswordSuccessMessage();
        },
        error: (error) => {
          this.passwordLoadingState.set('error');
          this.passwordError.set(error.message || 'Erreur lors du changement de mot de passe');
        }
      });
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
        // Empêche la soumission accidentelle pendant le chargement
        if (this.loadingState() === 'loading' || this.passwordLoadingState() === 'loading') {
          event.preventDefault();
        }
        break;
        
      default:
        break;
    }
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

  // ===================
  // GESTION DU FORMULAIRE DE PROFIL
  // ===================

  /**
   * Gère le changement du prénom
   */
  onFirstNameChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    let value = target.value;

    // Limite la longueur si nécessaire
    if (value.length > 50) {
      value = value.substring(0, 50);
      target.value = value;
    }

    this.firstName.set(value);
    this.updateFormDirtyState();
  }

  /**
   * Gère le changement du nom
   */
  onLastNameChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    let value = target.value;

    // Limite la longueur si nécessaire
    if (value.length > 50) {
      value = value.substring(0, 50);
      target.value = value;
    }

    this.lastName.set(value);
    this.updateFormDirtyState();
  }

  /**
   * Met à jour l'état "sale" du formulaire
   */
  private updateFormDirtyState(): void {
    this.isFormDirty.set(true);
  }

  /**
   * Remet à zéro le formulaire de profil
   */
  private resetForm(): void {
    this.firstName.set('');
    this.lastName.set('');
    this.isFormDirty.set(false);
    this.isSubmittingProfile.set(false);
  }

  // ===================
  // GESTION DU CHANGEMENT DE MOT DE PASSE
  // ===================

  /**
   * Bascule l'affichage de la section mot de passe
   */
  togglePasswordSection(): void {
    const newState = !this.showPasswordSection();
    this.showPasswordSection.set(newState);
    
    if (!newState) {
      this.resetPasswordForm();
    } else {
      // Focus automatique sur le premier champ de mot de passe
      setTimeout(() => {
        if (this.firstInputPassword?.nativeElement) {
          this.firstInputPassword.nativeElement.focus();
        }
      }, 100);
    }
  }

  /**
   * Gère le changement du mot de passe actuel
   */
  onCurrentPasswordChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.currentPassword.set(target.value);
    this.updatePasswordFormDirtyState();
  }

  /**
   * Gère le changement du nouveau mot de passe
   */
  onNewPasswordChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.newPassword.set(target.value);
    this.updatePasswordFormDirtyState();
  }

  /**
   * Gère le changement de la confirmation du mot de passe
   */
  onConfirmPasswordChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.confirmPassword.set(target.value);
    this.updatePasswordFormDirtyState();
  }

  /**
   * Met à jour l'état "sale" du formulaire de mot de passe
   */
  private updatePasswordFormDirtyState(): void {
    this.isPasswordFormDirty.set(true);
  }

  /**
   * Remet à zéro le formulaire de mot de passe
   */
  private resetPasswordForm(): void {
    this.showPasswordSection.set(false);
    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.isPasswordFormDirty.set(false);
    this.passwordLoadingState.set('idle');
    this.passwordError.set(null);
    this.passwordSuccessMessage.set('');
    this.isSubmittingPassword.set(false);
  }

  /**
   * Efface le message de succès après un délai
   */
  private clearPasswordSuccessMessage(): void {
    setTimeout(() => {
      this.passwordSuccessMessage.set('');
    }, 5000);
  }

  // ===================
  // MÉTHODES DE VALIDATION
  // ===================

  /**
   * Valide et retourne l'erreur du prénom
   */
  getFirstNameError(): string | null {
    if (!this.isFormDirty()) return null;

    const firstName = this.firstName().trim();
    if (firstName.length === 0) {
      return 'Le prénom est requis';
    }
    if (firstName.length < 2) {
      return 'Le prénom doit contenir au moins 2 caractères';
    }
    if (firstName.length > 50) {
      return 'Le prénom ne peut pas dépasser 50 caractères';
    }
    return null;
  }

  /**
   * Valide et retourne l'erreur du nom
   */
  getLastNameError(): string | null {
    if (!this.isFormDirty()) return null;

    const lastName = this.lastName().trim();
    if (lastName.length === 0) {
      return 'Le nom est requis';
    }
    if (lastName.length < 2) {
      return 'Le nom doit contenir au moins 2 caractères';
    }
    if (lastName.length > 50) {
      return 'Le nom ne peut pas dépasser 50 caractères';
    }
    return null;
  }

  /**
   * Valide et retourne l'erreur du mot de passe actuel
   */
  getCurrentPasswordError(): string | null {
    if (!this.isPasswordFormDirty()) return null;
    
    const currentPassword = this.currentPassword();
    if (currentPassword.length === 0) {
      return 'Le mot de passe actuel est requis';
    }
    return null;
  }

  /**
   * Valide et retourne l'erreur du nouveau mot de passe
   */
  getNewPasswordError(): string | null {
    if (!this.isPasswordFormDirty()) return null;
    
    const newPassword = this.newPassword();
    if (newPassword.length === 0) {
      return 'Le nouveau mot de passe est requis';
    }
    if (newPassword.length < 8) {
      return 'Le mot de passe doit contenir au moins 8 caractères';
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(newPassword)) {
      return 'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial';
    }
    if (newPassword === this.currentPassword()) {
      return 'Le nouveau mot de passe doit être différent de l\'ancien';
    }
    return null;
  }

  /**
   * Valide et retourne l'erreur de la confirmation du mot de passe
   */
  getConfirmPasswordError(): string | null {
    if (!this.isPasswordFormDirty()) return null;
    
    const confirmPassword = this.confirmPassword();
    if (confirmPassword.length === 0) {
      return 'La confirmation du mot de passe est requise';
    }
    if (confirmPassword !== this.newPassword()) {
      return 'Les mots de passe ne correspondent pas';
    }
    return null;
  }

  // ===================
  // MÉTHODES UTILITAIRES
  // ===================

  /**
   * Vérifie si le modal peut être fermé
   */
  canClose(): boolean {
    return this.loadingState() !== 'loading' && 
           this.passwordLoadingState() !== 'loading' &&
           !this.isSubmittingProfile() &&
           !this.isSubmittingPassword();
  }

  /**
   * Nettoie et sanitise un nom
   */
  private sanitizeName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ') // Remplace les espaces multiples par un seul
      .replace(/[<>]/g, ''); // Supprime les caractères potentiellement dangereux
  }

  /**
   * Met le focus sur le premier champ du profil
   */
  focusProfileInput(): void {
    setTimeout(() => {
      if (this.firstInputProfile?.nativeElement) {
        this.firstInputProfile.nativeElement.focus();
      }
    }, 0);
  }

  /**
   * Met le focus sur le premier champ de mot de passe
   */
  focusPasswordInput(): void {
    setTimeout(() => {
      if (this.firstInputPassword?.nativeElement) {
        this.firstInputPassword.nativeElement.focus();
      }
    }, 0);
  }

  /**
   * Sélectionne tout le texte dans un champ
   */
  selectAllText(inputRef: ElementRef<HTMLInputElement>): void {
    if (inputRef?.nativeElement) {
      inputRef.nativeElement.select();
    }
  }

  /**
   * Retourne l'état aria-busy pour l'accessibilité
   */
  getAriaBusyProfile(): boolean {
    return this.loadingState() === 'loading' || this.isSubmittingProfile();
  }

  /**
   * Retourne l'état aria-busy pour le mot de passe
   */
  getAriaBusyPassword(): boolean {
    return this.passwordLoadingState() === 'loading' || this.isSubmittingPassword();
  }

  /**
   * Valide un nom avec des règles personnalisées
   */
  validateName(name: string): { valid: boolean; error?: string } {
    const trimmedName = name.trim();
    
    if (trimmedName.length === 0) {
      return { valid: false, error: 'Le nom est requis' };
    }
    
    if (trimmedName.length < 2) {
      return { valid: false, error: 'Le nom doit contenir au moins 2 caractères' };
    }
    
    if (trimmedName.length > 50) {
      return { valid: false, error: 'Le nom ne peut pas dépasser 50 caractères' };
    }
    
    // Vérification de caractères spéciaux indésirables
    if (/<script|javascript:|on\w+=/i.test(trimmedName)) {
      return { valid: false, error: 'Le nom contient des caractères non autorisés' };
    }
    
    return { valid: true };
  }

  /**
   * Valide un mot de passe avec des règles renforcées
   */
  validatePassword(password: string): { valid: boolean; error?: string } {
    if (password.length === 0) {
      return { valid: false, error: 'Le mot de passe est requis' };
    }
    
    if (password.length < 8) {
      return { valid: false, error: 'Le mot de passe doit contenir au moins 8 caractères' };
    }
    
    if (password.length > 128) {
      return { valid: false, error: 'Le mot de passe ne peut pas dépasser 128 caractères' };
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      return { valid: false, error: 'Le mot de passe doit contenir au moins une lettre minuscule' };
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      return { valid: false, error: 'Le mot de passe doit contenir au moins une lettre majuscule' };
    }
    
    if (!/(?=.*\d)/.test(password)) {
      return { valid: false, error: 'Le mot de passe doit contenir au moins un chiffre' };
    }
    
    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
      return { valid: false, error: 'Le mot de passe doit contenir au moins un caractère spécial' };
    }
    
    return { valid: true };
  }

  /**
   * Génère un indicateur de force du mot de passe
   */
  getPasswordStrength(password: string): { strength: number; label: string; color: string } {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/(?=.*[a-z])/.test(password)) strength++;
    if (/(?=.*[A-Z])/.test(password)) strength++;
    if (/(?=.*\d)/.test(password)) strength++;
    if (/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) strength++;
    
    const labels = ['Très faible', 'Faible', 'Moyen', 'Bon', 'Fort', 'Très fort'];
    const colors = ['red', 'orange', 'yellow', 'blue', 'green', 'emerald'];
    
    return {
      strength: Math.min(strength, 5),
      label: labels[Math.min(strength, 5)],
      color: colors[Math.min(strength, 5)]
    };
  }
}
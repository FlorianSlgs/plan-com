import { Component, input, output, signal, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Services
import { AuthService } from '../../../../../services/auth.service';

// Modèles
import { UpdateProfileData, ChangePasswordData } from '../../../../../models/user.model';

@Component({
  selector: 'app-profile-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './profile-modal.component.html',
  styleUrl: './profile-modal.component.scss'
})
export class ProfileModalComponent {
  private authService = inject(AuthService);

  // Inputs - données reçues du composant parent
  isOpen = input.required<boolean>();
  userFirstName = input.required<string>();
  userLastName = input.required<string>();
  loadingState = input.required<'idle' | 'loading' | 'error'>();
  error = input<string | null>(null);
  successMessage = input<string>('');

  // Outputs - événements émis vers le composant parent
  close = output<void>();
  updateProfile = output<UpdateProfileData>();

  // État local du composant pour le formulaire
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

  constructor() {
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

  // Méthodes pour gérer les événements
  onClose() {
    this.resetForm();
    this.resetPasswordForm();
    this.close.emit();
  }

  onSubmit() {
    if (this.isFormValid() && this.hasChanges()) {
      const updateData: UpdateProfileData = {
        firstName: this.firstName().trim(),
        lastName: this.lastName().trim()
      };
      
      this.updateProfile.emit(updateData);
    }
  }

  // Méthodes pour la gestion du formulaire profil
  onFirstNameChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.firstName.set(target.value);
    this.updateFormDirtyState();
  }

  onLastNameChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.lastName.set(target.value);
    this.updateFormDirtyState();
  }

  private updateFormDirtyState() {
    this.isFormDirty.set(true);
  }

  private resetForm() {
    this.firstName.set('');
    this.lastName.set('');
    this.isFormDirty.set(false);
  }

  // Méthodes pour le changement de mot de passe
  togglePasswordSection() {
    this.showPasswordSection.set(!this.showPasswordSection());
    if (!this.showPasswordSection()) {
      this.resetPasswordForm();
    }
  }

  onCurrentPasswordChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.currentPassword.set(target.value);
    this.updatePasswordFormDirtyState();
  }

  onNewPasswordChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.newPassword.set(target.value);
    this.updatePasswordFormDirtyState();
  }

  onConfirmPasswordChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.confirmPassword.set(target.value);
    this.updatePasswordFormDirtyState();
  }

  private updatePasswordFormDirtyState() {
    this.isPasswordFormDirty.set(true);
  }

  private resetPasswordForm() {
    this.showPasswordSection.set(false);
    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.isPasswordFormDirty.set(false);
    this.passwordLoadingState.set('idle');
    this.passwordError.set(null);
    this.passwordSuccessMessage.set('');
  }

  onSubmitPasswordChange() {
    if (this.isPasswordFormValid()) {
      const passwordData: ChangePasswordData = {
        currentPassword: this.currentPassword(),
        newPassword: this.newPassword(),
        confirmPassword: this.confirmPassword()
      };

      this.passwordLoadingState.set('loading');
      this.passwordError.set(null);
      this.passwordSuccessMessage.set('');

      this.authService.changePassword(passwordData).subscribe({
        next: (response) => {
          this.passwordLoadingState.set('idle');
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
  }

  private clearPasswordSuccessMessage() {
    setTimeout(() => {
      this.passwordSuccessMessage.set('');
    }, 5000);
  }

  // Méthodes de validation pour le profil
  isFormValid(): boolean {
    return this.firstName().trim().length > 0 && 
           this.lastName().trim().length > 0;
  }

  hasChanges(): boolean {
    return this.firstName().trim() !== this.userFirstName() || 
           this.lastName().trim() !== this.userLastName();
  }

  getFirstNameError(): string | null {
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

  getLastNameError(): string | null {
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

  // Méthodes de validation pour le changement de mot de passe
  isPasswordFormValid(): boolean {
    return this.currentPassword().length > 0 &&
           this.newPassword().length >= 8 &&
           this.confirmPassword() === this.newPassword();
  }

  getCurrentPasswordError(): string | null {
    if (!this.isPasswordFormDirty()) return null;
    
    const currentPassword = this.currentPassword();
    if (currentPassword.length === 0) {
      return 'Le mot de passe actuel est requis';
    }
    return null;
  }

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
    return null;
  }

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
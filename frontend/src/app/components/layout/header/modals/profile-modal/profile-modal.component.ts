import { Component, input, output, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Modèles
import { UpdateProfileData } from '../../../../../models/user.model';

@Component({
  selector: 'app-profile-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './profile-modal.component.html',
  styleUrl: './profile-modal.component.scss'
})
export class ProfileModalComponent {
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

  constructor() {
    // Initialiser les champs quand la modal s'ouvre
    effect(() => {
      if (this.isOpen()) {
        this.firstName.set(this.userFirstName());
        this.lastName.set(this.userLastName());
        this.isFormDirty.set(false);
      }
    });
  }

  // Méthodes pour gérer les événements
  onClose() {
    this.resetForm();
    this.close.emit();

    // Rechargement de la page
    window.location.reload();
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

  // Méthodes pour la gestion du formulaire
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

  // Méthodes de validation
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
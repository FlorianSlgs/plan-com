import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { 
  FormBuilder, 
  FormGroup, 
  FormControl, 
  Validators, 
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { RegisterFormData } from '../../models/user.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink
],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit, OnDestroy {
  // Formulaire avec typage fort incluant la confirmation du mot de passe
  registerForm: FormGroup<{
    lastName: FormControl<string>;
    firstName: FormControl<string>;
    birthDate: FormControl<string>;
    email: FormControl<string>;
    password: FormControl<string>;
    confirmPassword: FormControl<string>;
  }>;

  errorMessage: string | null = null;
  isLoading = false;
  private destroy$ = new Subject<void>();

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    this.registerForm = this.fb.group({
      lastName: this.fb.control('', { 
        nonNullable: true, 
        validators: [Validators.required, Validators.minLength(2)]
      }),
      firstName: this.fb.control('', { 
        nonNullable: true, 
        validators: [Validators.required, Validators.minLength(2)]
      }),
      birthDate: this.fb.control('', { 
        nonNullable: true, 
        validators: [Validators.required, this.minimumAgeValidator(13)]
      }),
      email: this.fb.control('', { 
        nonNullable: true, 
        validators: [Validators.required, Validators.email]
      }),
      password: this.fb.control('', { 
        nonNullable: true, 
        validators: [
          Validators.required, 
          Validators.minLength(8),
          this.strongPasswordValidator()
        ]
      }),
      confirmPassword: this.fb.control('', { 
        nonNullable: true, 
        validators: [Validators.required]
      })
    }, { 
      // Validation au niveau du formulaire pour vérifier la correspondance des mots de passe
      validators: [this.passwordMatchValidator()]
    });
  }

  ngOnInit(): void {
    // Vérifier si l'utilisateur est déjà connecté
    if (this.authService.isUserLoggedIn()) {
      this.router.navigate(['/home']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Vérifie si un champ est invalide et a été touché/modifié
   */
  isFieldInvalid(fieldName: keyof typeof this.registerForm.controls): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Récupère le message d'erreur pour un champ donné
   */
  getFieldError(fieldName: keyof typeof this.registerForm.controls): string | null {
    const field = this.registerForm.get(fieldName);
    if (!field || !field.errors) return null;

    const errors = field.errors;
    const fieldLabels: Record<string, string> = {
      lastName: 'nom',
      firstName: 'prénom',
      birthDate: 'date de naissance',
      email: 'email',
      password: 'mot de passe',
      confirmPassword: 'confirmation du mot de passe'
    };

    const label = fieldLabels[fieldName];

    if (errors['required']) {
      return `Le ${label} est requis.`;
    }
    if (errors['minlength']) {
      return `Le ${label} doit contenir au moins ${errors['minlength'].requiredLength} caractères.`;
    }
    if (errors['email']) {
      return 'Veuillez entrer une adresse email valide.';
    }
    if (errors['minimumAge']) {
      return `Vous devez avoir au moins ${errors['minimumAge'].requiredAge} ans.`;
    }
    if (errors['strongPassword']) {
      return 'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial.';
    }

    return 'Champ invalide.';
  }

  /**
   * Récupère le message d'erreur pour la validation des mots de passe
   */
  getPasswordMatchError(): string | null {
    if (this.registerForm.errors?.['passwordMismatch'] && 
        this.registerForm.get('confirmPassword')?.touched) {
      return 'Les mots de passe ne correspondent pas.';
    }
    return null;
  }

  /**
   * Validator pour vérifier l'âge minimum
   */
  private minimumAgeValidator(minAge: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const birthDate = new Date(control.value);
      const today = new Date();
      
      // Vérifier si la date est valide
      if (isNaN(birthDate.getTime())) {
        return { invalidDate: true };
      }

      // Vérifier si la date n'est pas dans le futur
      if (birthDate > today) {
        return { futureDate: true };
      }

      // Calculer l'âge
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age >= minAge ? null : { 
        minimumAge: { 
          requiredAge: minAge, 
          actualAge: age 
        } 
      };
    };
  }

  /**
   * Validator pour un mot de passe fort
   */
  private strongPasswordValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const password = control.value;
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumber = /\d/.test(password);
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

      if (hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar) {
        return null;
      }

      return { strongPassword: true };
    };
  }

  /**
   * Validator pour vérifier que les mots de passe correspondent
   */
  private passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control) return null;

      const password = control.get('password')?.value;
      const confirmPassword = control.get('confirmPassword')?.value;

      if (!password || !confirmPassword) {
        return null;
      }

      return password === confirmPassword ? null : { passwordMismatch: true };
    };
  }

  /**
   * Soumission du formulaire
   */
  onSubmit(): void {
    this.errorMessage = null;

    if (this.registerForm.valid && !this.isLoading) {
      this.isLoading = true;
      
      // Extraire les données sans le champ confirmPassword
      const { confirmPassword, ...formData } = this.registerForm.value;
      const registerData: RegisterFormData = formData as RegisterFormData;

      this.authService.register(registerData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            // La redirection est gérée dans le service
            this.isLoading = false;
          },
          error: (err: Error) => {
            this.isLoading = false;
            this.errorMessage = err.message || "Une erreur inconnue est survenue lors de l'inscription.";
          }
        });
    } else {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      this.registerForm.markAllAsTouched();
      this.errorMessage = 'Veuillez corriger les erreurs dans le formulaire.';
    }
  }

  /**
   * Réinitialise le message d'erreur quand l'utilisateur commence à taper
   */
  onFieldChange(): void {
    if (this.errorMessage) {
      this.errorMessage = null;
    }
  }

  /**
   * Gestion spécifique du changement de mot de passe pour re-valider la confirmation
   */
  onPasswordChange(): void {
    this.onFieldChange();
    
    // Re-valider le champ de confirmation si il a été touché
    const confirmPasswordControl = this.registerForm.get('confirmPassword');
    if (confirmPasswordControl?.touched) {
      confirmPasswordControl.updateValueAndValidity();
    }
  }
}
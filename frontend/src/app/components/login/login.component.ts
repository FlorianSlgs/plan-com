import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';


import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink
],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage = signal<string | null>(null);
  isLoading = signal<boolean>(false);

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });

    // Effect pour gérer la redirection automatique basée sur le rôle
    effect(() => {
      if (this.authService.isLoggedIn()) {
        if (this.authService.isUserAdmin()) {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/home']);
        }
      }
    });
  }

  ngOnInit(): void {
    // Vérification initiale de l'état de connexion
    if (this.authService.isUserLoggedIn()) {
      if (this.authService.isUserAdmin()) {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/home']);
      }
    }
  }

  /**
   * Vérifie si un champ a une erreur et doit afficher le message d'erreur
   */
  hasError(controlName: string): boolean {
    const control = this.loginForm.get(controlName);
    return !!(control?.invalid && (control.dirty || control.touched));
  }

  /**
   * Vérifie si un champ a un type d'erreur spécifique
   */
  getError(controlName: string, errorType: string): boolean {
    return !!this.loginForm.get(controlName)?.errors?.[errorType];
  }

  /**
   * Récupère le contrôle de formulaire
   */
  getControl(controlName: string): AbstractControl | null {
    return this.loginForm.get(controlName);
  }

  /**
   * Soumission du formulaire de connexion
   */
  onSubmit(): void {
    this.errorMessage.set(null);
    
    if (this.loginForm.invalid) {
      this.markAllFieldsAsTouched();
      this.errorMessage.set('Veuillez remplir correctement tous les champs.');
      return;
    }

    this.isLoading.set(true);
    
    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        // La redirection est gérée automatiquement par le service auth et l'effect
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message || 'Une erreur inconnue est survenue.');
      }
    });
  }

  /**
   * Marque tous les champs comme touchés pour afficher les erreurs
   */
  private markAllFieldsAsTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Réinitialise le formulaire
   */
  resetForm(): void {
    this.loginForm.reset();
    this.errorMessage.set(null);
  }
}
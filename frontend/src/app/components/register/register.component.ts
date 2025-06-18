import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule, // Importer pour [formGroup], formControlName
    RouterLink           // Importer pour routerLink="/login"
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  errorMessage: string | null = null;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

constructor() {
    this.registerForm = this.fb.group({
      lastName: ['', Validators.required],
      firstName: ['', Validators.required],
      birthDate: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
     if (this.authService.isUserLoggedIn()) {
       this.router.navigate(['/home']);
     }
  }

  onSubmit(): void {
    this.errorMessage = null;
    if (this.registerForm.valid) {
      this.authService.register(this.registerForm.value).subscribe({
         // La redirection succès est dans le service
         error: (err: Error) => { // Récupérer l'erreur propagée
           this.errorMessage = err.message || "Une erreur inconnue est survenue lors de l'inscription.";
         }
      });
    } else {
      this.errorMessage = 'Veuillez remplir correctement tous les champs.';
    }
  }
}
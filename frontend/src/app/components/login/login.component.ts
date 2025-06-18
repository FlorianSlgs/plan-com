import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms'; // Importer ReactiveFormsModule ici
import { Router, RouterLink } from '@angular/router'; // Importer RouterLink
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule, // Importer pour [formGroup], formControlName
    RouterLink,           // Importer pour routerLink="/register"
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string | null = null;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
     // Si l'utilisateur est déjà connecté (vérifie la valeur initiale du signal)
     if (this.authService.isUserLoggedIn()) {
       this.router.navigate(['/home']);
     }
  }

  onSubmit(): void {
    this.errorMessage = null;
    if (this.loginForm.valid) {
      this.authService.login(this.loginForm.value).subscribe({
        // La redirection succès est dans le service
        error: (err: Error) => { // Récupérer l'erreur propagée
          this.errorMessage = err.message || 'Une erreur inconnue est survenue.';
        }
      });
    } else {
      this.errorMessage = 'Veuillez remplir correctement tous les champs.';
    }
  }
}
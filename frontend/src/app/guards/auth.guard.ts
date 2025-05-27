import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';

export const authGuard: CanActivateFn = ():
  Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree => {

  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isUserLoggedIn()) {
    return true; // Autorisé
  } else {
    // Non autorisé, redirection vers la page de login
    console.log('Access denied by authGuard - Redirecting to login');
    // Utiliser parseUrl pour retourner un UrlTree pour la redirection
    return router.parseUrl('/login');
  }
};
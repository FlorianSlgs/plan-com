import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export const authGuard: CanActivateFn = ():
  Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree => {

  const authService = inject(AuthService);
  const router = inject(Router);

  // Utilise checkAuth() pour vérifier côté serveur
  return authService.checkAuth().pipe(
    map(() => true), // Authentifié
    catchError(() => {
      console.log('Access denied by authGuard - Redirecting to login');
      return of(router.parseUrl('/login'));
    })
  );
};
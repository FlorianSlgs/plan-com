import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { catchError, map, take } from 'rxjs/operators';

export const adminGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.checkAuth().pipe(
    take(1),
    map((response: any) => {
      // Vérifier si l'utilisateur est connecté ET admin
      if (response && response.isAdmin) {
        return true;
      } else {
        // Si pas admin, rediriger vers la page d'accueil ou login selon le statut de connexion
        return authService.isUserLoggedIn() 
          ? router.parseUrl('/home') 
          : router.parseUrl('/login');
      }
    }),
    catchError((error) => {
      console.error('Authentication failed:', error);
      return of(router.parseUrl('/login'));
    })
  );
};
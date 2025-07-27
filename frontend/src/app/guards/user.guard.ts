import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { catchError, map, take } from 'rxjs/operators';

export const userGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.checkAuth().pipe(
    take(1),
    map((response: any) => {
      // Vérifier si l'utilisateur est connecté ET n'est PAS admin
      if (response && !response.isAdmin) {
        return true;
      } else if (response && response.isAdmin) {
        // Si admin, rediriger vers la page admin
        return router.parseUrl('/admin');
      } else {
        // Si pas connecté, rediriger vers login
        return router.parseUrl('/login');
      }
    }),
    catchError((error) => {
      console.error('Authentication failed:', error);
      return of(router.parseUrl('/login'));
    })
  );
};
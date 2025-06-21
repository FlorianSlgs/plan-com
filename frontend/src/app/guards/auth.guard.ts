import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { catchError, map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.checkAuth().pipe(
    take(1),
    map(() => true),
    catchError((error) => {
      console.error('Authentication failed:', error);
      // Optionnel : stocker l'URL tentée pour redirection post-login
      // router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      return of(router.parseUrl('/login'));
    })
  );
};
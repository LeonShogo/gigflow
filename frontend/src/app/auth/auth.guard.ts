import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, map, of } from 'rxjs';

import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return of(router.createUrlTree(['/login']));
  }
  if (auth.currentUser()) {
    return of(true);
  }
  return auth.loadCurrentUser().pipe(map(() => true));
};

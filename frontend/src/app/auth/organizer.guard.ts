import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, map, of } from 'rxjs';

import { AuthService } from './auth.service';

export const organizerGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return of(router.createUrlTree(['/login']));
  }
  if (auth.currentUser()) {
    return of(auth.isOrganizer() ? true : router.createUrlTree(['/']));
  }
  return auth
    .loadCurrentUser()
    .pipe(map(() => (auth.isOrganizer() ? true : router.createUrlTree(['/']))));
};

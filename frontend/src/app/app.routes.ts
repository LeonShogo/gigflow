import { Routes } from '@angular/router';

import { authGuard } from './auth/auth.guard';
import { organizerGuard } from './auth/organizer.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'events/new',
    canActivate: [organizerGuard],
    loadComponent: () =>
      import('./event-form/event-form.component').then((m) => m.EventFormComponent),
  },
  {
    path: 'events/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./event-detail/event-detail.component').then((m) => m.EventDetailComponent),
  },
  {
    path: 'musicians',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./musicians/musician-list.component').then((m) => m.MusicianListComponent),
  },
  {
    path: 'musicians/new',
    canActivate: [organizerGuard],
    loadComponent: () =>
      import('./musicians/musician-form.component').then((m) => m.MusicianFormComponent),
  },
  {
    path: 'musicians/:id/edit',
    canActivate: [organizerGuard],
    loadComponent: () =>
      import('./musicians/musician-form.component').then((m) => m.MusicianFormComponent),
  },
];

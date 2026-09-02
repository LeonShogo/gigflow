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
    path: 'calendar',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./calendar/calendar.component').then((m) => m.CalendarComponent),
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
    path: 'events/:id/print',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./print/event-print.component').then((m) => m.EventPrintComponent),
  },
  {
    path: 'print-demo',
    loadComponent: () =>
      import('./print/event-print-demo.component').then((m) => m.EventPrintDemoComponent),
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

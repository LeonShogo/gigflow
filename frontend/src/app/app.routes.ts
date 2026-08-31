import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'events/new',
    loadComponent: () =>
      import('./event-form/event-form.component').then(
        (m) => m.EventFormComponent,
      ),
  },
  {
    path: 'events/:id',
    loadComponent: () =>
      import('./event-detail/event-detail.component').then(
        (m) => m.EventDetailComponent,
      ),
  },
  {
    path: 'musicians',
    loadComponent: () =>
      import('./musicians/musician-list.component').then(
        (m) => m.MusicianListComponent,
      ),
  },
  {
    path: 'musicians/new',
    loadComponent: () =>
      import('./musicians/musician-form.component').then(
        (m) => m.MusicianFormComponent,
      ),
  },
  {
    path: 'musicians/:id/edit',
    loadComponent: () =>
      import('./musicians/musician-form.component').then(
        (m) => m.MusicianFormComponent,
      ),
  },
];

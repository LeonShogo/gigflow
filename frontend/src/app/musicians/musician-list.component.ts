import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Musician } from './musician.model';
import { MusicianService } from './musician.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-musician-list',
  imports: [RouterLink],
  templateUrl: './musician-list.component.html',
  styleUrl: './musician-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MusicianListComponent {
  private readonly musicianService = inject(MusicianService);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly musicians = signal<Musician[]>([]);

  protected readonly confirmingDelete = signal<Record<number, boolean>>({});
  protected readonly deleting = signal<Record<number, boolean>>({});
  protected readonly deleteError = signal<string | null>(null);

  protected readonly canDelete = this.auth.isOrganizer;

  constructor() {
    this.musicianService.loadMusicians().subscribe({
      next: (musicians) => {
        this.musicians.set(musicians);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Musiker*innen konnten nicht geladen werden.');
      },
    });
  }

  protected musicianName(musician: Musician): string {
    return [musician.firstName, musician.lastName].filter(Boolean).join(' ');
  }

  protected requestDelete(musician: Musician): void {
    this.deleteError.set(null);
    this.confirmingDelete.update((m) => ({ ...m, [musician.id]: true }));
  }

  protected cancelDelete(musician: Musician): void {
    this.confirmingDelete.update((m) => ({ ...m, [musician.id]: false }));
  }

  protected confirmDelete(musician: Musician): void {
    this.deleting.update((m) => ({ ...m, [musician.id]: true }));
    this.deleteError.set(null);
    this.musicianService.deleteMusician(musician.id).subscribe({
      next: () => {
        this.deleting.update((m) => ({ ...m, [musician.id]: false }));
        this.confirmingDelete.update((m) => ({ ...m, [musician.id]: false }));
        this.musicians.update((list) => list.filter((m) => m.id !== musician.id));
      },
      error: (err) => {
        this.deleting.update((m) => ({ ...m, [musician.id]: false }));
        this.confirmingDelete.update((m) => ({ ...m, [musician.id]: false }));
        this.deleteError.set(
          err?.error?.message ?? 'Musiker*in konnte nicht gelöscht werden.',
        );
      },
    });
  }
}

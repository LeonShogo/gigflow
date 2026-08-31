import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Musician } from './musician.model';
import { MusicianService } from './musician.service';

@Component({
  selector: 'app-musician-list',
  imports: [RouterLink],
  templateUrl: './musician-list.component.html',
  styleUrl: './musician-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MusicianListComponent {
  private readonly musicianService = inject(MusicianService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly musicians = signal<Musician[]>([]);

  constructor() {
    this.musicianService.loadMusicians().subscribe({
      next: (musicians) => {
        this.musicians.set(musicians);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Musiker:innen konnten nicht geladen werden.');
      },
    });
  }
}

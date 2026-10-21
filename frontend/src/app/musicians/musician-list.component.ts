import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import type { Musician } from './musician.model';
import { MusicianService } from './musician.service';
import { AuthService } from '../auth/auth.service';
import { EventService } from '../dashboard/event.service';
import type { Band, BandMembership } from '../dashboard/event.model';

@Component({
  selector: 'app-musician-list',
  imports: [RouterLink],
  templateUrl: './musician-list.component.html',
  styleUrl: './musician-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MusicianListComponent {
  private readonly musicianService = inject(MusicianService);
  private readonly eventService = inject(EventService);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly musicians = signal<Musician[]>([]);

  protected readonly bands = signal<Band[]>([]);
  protected readonly memberships = signal<BandMembership[]>([]);
  protected readonly membershipError = signal<string | null>(null);
  protected readonly membershipSaving = signal(false);

  protected readonly confirmingDelete = signal<Record<number, boolean>>({});
  protected readonly deleting = signal<Record<number, boolean>>({});
  protected readonly deleteError = signal<string | null>(null);

  protected readonly canDelete = this.auth.isOrganizer;
  protected readonly bandName = computed(() => {
    const names = new Map(this.bands().map((band) => [band.id, band.name]));
    return (bandId: number) => names.get(bandId) ?? `Band #${bandId}`;
  });

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

    this.eventService.loadBands().subscribe({
      next: (bands) => {
        this.bands.set(bands);
        if (bands.length > 0) {
          forkJoin(
            bands.map((band) => this.eventService.loadBandMemberships(band.id)),
          ).subscribe({
            next: (results) => this.memberships.set(results.flat()),
            error: () => this.membershipError.set('Band-Zuordnungen konnten nicht geladen werden.'),
          });
        }
      },
    });
  }

  protected membershipsFor(musicianId: number): BandMembership[] {
    return this.memberships().filter((membership) => membership.musicianId === musicianId);
  }

  protected assignableBands(musicianId: number): Band[] {
    const assigned = new Set(
      this.membershipsFor(musicianId).map((membership) => membership.bandId),
    );
    return this.bands().filter((band) => !assigned.has(band.id));
  }

  protected onAssignBand(musician: Musician, value: string): void {
    const bandId = Number(value);
    if (!bandId || this.membershipSaving()) {
      return;
    }
    this.membershipSaving.set(true);
    this.membershipError.set(null);
    this.eventService.addBandMembership({ bandId, musicianId: musician.id }).subscribe({
      next: (membership) => {
        this.memberships.update((list) => [...list, membership]);
        this.membershipSaving.set(false);
      },
      error: (err) => {
        this.membershipSaving.set(false);
        this.membershipError.set(
          err?.error?.message ?? 'Band-Zuordnung konnte nicht gespeichert werden.',
        );
      },
    });
  }

  protected removeMembership(membership: BandMembership): void {
    if (this.membershipSaving()) {
      return;
    }
    this.membershipSaving.set(true);
    this.membershipError.set(null);
    this.eventService.removeBandMembership(membership.id).subscribe({
      next: () => {
        this.memberships.update((list) => list.filter((m) => m.id !== membership.id));
        this.membershipSaving.set(false);
      },
      error: () => {
        this.membershipSaving.set(false);
        this.membershipError.set('Band-Zuordnung konnte nicht entfernt werden.');
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

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import type { Musician } from './musician.model';
import { MusicianService } from './musician.service';
import { AuthService } from '../auth/auth.service';
import { EventService } from '../dashboard/event.service';
import { ToastService } from '../notifications/toast.service';
import { ModalDialogComponent } from '../shared/modal-dialog.component';
import type { Band, BandMembership } from '../dashboard/event.model';
import { TranslatePipe } from '../language/translate.pipe';

@Component({
  selector: 'app-musician-list',
  imports: [RouterLink, FormsModule, ModalDialogComponent, TranslatePipe],
  templateUrl: './musician-list.component.html',
  styleUrl: './musician-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MusicianListComponent {
  private readonly musicianService = inject(MusicianService);
  private readonly eventService = inject(EventService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly musicians = signal<Musician[]>([]);

  protected readonly bands = signal<Band[]>([]);
  protected readonly memberships = signal<BandMembership[]>([]);
  protected readonly membershipError = signal<string | null>(null);
  protected readonly membershipSaving = signal(false);

  protected readonly createBandOpen = signal(false);
  protected readonly newBandName = signal('');
  protected readonly newBandGenre = signal('');
  protected readonly creatingBand = signal(false);
  protected readonly bandError = signal<string | null>(null);
  protected readonly bandToDelete = signal<Band | null>(null);
  protected readonly deletingBand = signal(false);

  protected readonly confirmingDelete = signal<Record<number, boolean>>({});
  protected readonly deleting = signal<Record<number, boolean>>({});
  protected readonly confirmingDeleteAll = signal(false);
  protected readonly deletingAll = signal(false);
  protected readonly deleteError = signal<string | null>(null);
  private deleteErrorTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly canDelete = computed(() => this.auth.currentUser() !== null);
  protected readonly bandName = computed(() => {
    const names = new Map(this.bands().map((band) => [band.id, band.name]));
    return (bandId: number) => names.get(bandId) ?? `Band #${bandId}`;
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.clearDeleteErrorTimer());

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
        this.toast.show('Band-Zuordnung entfernt.', {
          label: 'Rückgängig',
          run: () => this.restoreMembership(membership),
        });
      },
      error: () => {
        this.membershipSaving.set(false);
        this.membershipError.set('Band-Zuordnung konnte nicht entfernt werden.');
      },
    });
  }

  private restoreMembership(membership: BandMembership): void {
    this.eventService
      .addBandMembership({ bandId: membership.bandId, musicianId: membership.musicianId })
      .subscribe({
        next: (restored) => this.memberships.update((list) => [...list, restored]),
        error: () => this.membershipError.set('Wiederherstellen fehlgeschlagen.'),
      });
  }

  protected musicianName(musician: Musician): string {
    return [musician.firstName, musician.lastName].filter(Boolean).join(' ');
  }

  protected toggleCreateBand(): void {
    this.createBandOpen.update((open) => !open);
    this.bandError.set(null);
  }

  protected onNewBandName(event: Event): void {
    this.newBandName.set((event.target as HTMLInputElement).value);
  }

  protected onNewBandGenre(event: Event): void {
    this.newBandGenre.set((event.target as HTMLInputElement).value);
  }

  protected createBand(): void {
    const name = this.newBandName().trim();
    if (!name || this.creatingBand()) {
      return;
    }
    this.creatingBand.set(true);
    this.bandError.set(null);
    const genre = this.newBandGenre().trim();
    this.eventService.createBand({ name, genre: genre || undefined }).subscribe({
      next: (band) => {
        this.bands.update((list) => [...list, band]);
        this.newBandName.set('');
        this.newBandGenre.set('');
        this.creatingBand.set(false);
        this.createBandOpen.set(false);
        this.toast.show(`Band „${band.name}“ angelegt.`);
      },
      error: (err) => {
        this.creatingBand.set(false);
        this.bandError.set(err?.error?.message ?? 'Band konnte nicht angelegt werden.');
      },
    });
  }

  protected requestBandDelete(band: Band): void {
    this.dismissDeleteError();
    this.bandToDelete.set(band);
  }

  protected cancelBandDelete(): void {
    if (!this.deletingBand()) {
      this.bandToDelete.set(null);
    }
  }

  protected confirmBandDelete(): void {
    const band = this.bandToDelete();
    if (!band || this.deletingBand()) {
      return;
    }
    const memberships = this.memberships().filter((item) => item.bandId === band.id);
    this.deletingBand.set(true);
    this.eventService.deleteBand(band.id).subscribe({
      next: () => {
        this.bands.update((list) => list.filter((item) => item.id !== band.id));
        this.memberships.update((list) => list.filter((item) => item.bandId !== band.id));
        this.deletingBand.set(false);
        this.bandToDelete.set(null);
        this.toast.show(`Band „${band.name}“ gelöscht.`, {
          label: 'Rückgängig',
          run: () => this.restoreBand(band, memberships),
        });
      },
      error: (err) => {
        this.deletingBand.set(false);
        this.bandToDelete.set(null);
        this.showDeleteError(err?.error?.message ?? 'Band konnte nicht gelöscht werden.');
      },
    });
  }

  private restoreBand(band: Band, memberships: BandMembership[]): void {
    this.eventService
      .createBand({ name: band.name, genre: band.genre })
      .subscribe({
        next: (restored) => {
          this.bands.update((list) => [...list, restored]);
          if (memberships.length === 0) {
            return;
          }
          forkJoin(
            memberships.map((membership) =>
              this.eventService.addBandMembership({
                bandId: restored.id,
                musicianId: membership.musicianId,
              }),
            ),
          ).subscribe({
            next: (restoredMemberships) =>
              this.memberships.update((list) => [...list, ...restoredMemberships]),
            error: () =>
              this.showDeleteError(
                'Band wiederhergestellt, Zuordnungen konnten aber nicht wiederhergestellt werden.',
              ),
          });
        },
        error: (err) =>
          this.showDeleteError(
            err?.error?.message ?? 'Band konnte nicht wiederhergestellt werden.',
          ),
      });
  }

  protected requestDeleteAll(): void {
    this.dismissDeleteError();
    this.confirmingDeleteAll.set(true);
  }

  protected cancelDeleteAll(): void {
    if (this.deletingAll()) {
      return;
    }
    this.confirmingDeleteAll.set(false);
  }

  protected confirmDeleteAll(): void {
    if (this.deletingAll()) {
      return;
    }
    this.deletingAll.set(true);
    this.dismissDeleteError();
    this.musicianService.deleteAllMusicians().subscribe({
      next: () => {
        this.deletingAll.set(false);
        this.confirmingDeleteAll.set(false);
        this.musicians.set([]);
        this.memberships.set([]);
        this.toast.show('Alle Musiker*innen gelöscht.');
      },
      error: (err) => {
        this.deletingAll.set(false);
        this.confirmingDeleteAll.set(false);
        this.showDeleteError(
          err?.error?.message ?? 'Musiker*innen konnten nicht gelöscht werden.',
        );
      },
    });
  }

  protected requestDelete(musician: Musician): void {
    this.dismissDeleteError();
    this.confirmingDelete.update((m) => ({ ...m, [musician.id]: true }));
  }

  protected cancelDelete(musician: Musician): void {
    this.confirmingDelete.update((m) => ({ ...m, [musician.id]: false }));
  }

  protected dismissDeleteError(): void {
    this.clearDeleteErrorTimer();
    this.deleteError.set(null);
  }

  private showDeleteError(message: string): void {
    this.clearDeleteErrorTimer();
    this.deleteError.set(message);
    this.deleteErrorTimer = setTimeout(() => this.deleteError.set(null), 3000);
  }

  private clearDeleteErrorTimer(): void {
    if (this.deleteErrorTimer !== null) {
      clearTimeout(this.deleteErrorTimer);
      this.deleteErrorTimer = null;
    }
  }

  protected confirmDelete(musician: Musician): void {
    this.deleting.update((m) => ({ ...m, [musician.id]: true }));
    this.dismissDeleteError();
    this.musicianService.deleteMusician(musician.id).subscribe({
      next: () => {
        this.deleting.update((m) => ({ ...m, [musician.id]: false }));
        this.confirmingDelete.update((m) => ({ ...m, [musician.id]: false }));
        this.musicians.update((list) => list.filter((m) => m.id !== musician.id));
        this.toast.show('Musiker*in gelöscht.', {
          label: 'Rückgängig',
          run: () => this.restoreMusician(musician),
        });
      },
      error: (err) => {
        this.deleting.update((m) => ({ ...m, [musician.id]: false }));
        this.confirmingDelete.update((m) => ({ ...m, [musician.id]: false }));
        this.showDeleteError(
          err?.error?.message ?? 'Musiker*in konnte nicht gelöscht werden.',
        );
      },
    });
  }

  private restoreMusician(musician: Musician): void {
    this.musicianService
      .createMusician({
        firstName: musician.firstName,
        lastName: musician.lastName,
        instrument: musician.instrument ?? null,
        email: musician.email ?? null,
        emailPublic: musician.emailPublic ?? false,
      })
      .subscribe({
        next: (restored) =>
          this.musicians.update((list) => [...list, restored]),
        error: () =>
          this.showDeleteError('Musiker*in konnte nicht wiederhergestellt werden.'),
      });
  }
}

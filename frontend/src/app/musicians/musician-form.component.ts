import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import type { MusicianRequest } from './musician.model';
import { MusicianService } from './musician.service';
import { AuthService } from '../auth/auth.service';
import { EventService } from '../dashboard/event.service';
import { ToastService } from '../notifications/toast.service';
import type { Band, BandMembership } from '../dashboard/event.model';

@Component({
  selector: 'app-musician-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './musician-form.component.html',
  styleUrl: './musician-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MusicianFormComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly musicianService = inject(MusicianService);
  private readonly eventService = inject(EventService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly form = this.formBuilder.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(60)]],
    lastName: ['', [Validators.required, Validators.maxLength(60)]],
    instrument: ['', [Validators.maxLength(80)]],
    email: ['', [Validators.email, Validators.maxLength(120)]],
    bandIds: this.formBuilder.nonNullable.control<number[]>([]),
  });

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitError = signal<string | null>(null);
  protected readonly editId = signal<number | null>(null);
  protected readonly bands = signal<Band[]>([]);
  protected readonly bandsError = signal<string | null>(null);
  protected readonly canManageBands = this.auth.isOrganizer;

  private loadedMemberships: BandMembership[] = [];

  constructor() {
    this.eventService.loadBands().subscribe({
      next: (bands) => this.bands.set(bands),
      error: () => this.bandsError.set('Bands konnten nicht geladen werden.'),
    });

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id === null) {
        this.editId.set(null);
        this.loading.set(false);
        return;
      }

      this.editId.set(Number(id));
      this.loading.set(true);
      forkJoin({
        musician: this.musicianService.loadMusician(Number(id)),
        memberships: this.eventService.loadMusicianMemberships(Number(id)),
      }).subscribe({
        next: ({ musician, memberships }) => {
          this.form.patchValue({
            firstName: musician.firstName,
            lastName: musician.lastName,
            instrument: musician.instrument ?? '',
            email: musician.email ?? '',
          });
          this.loadedMemberships = memberships;
          this.form.controls.bandIds.setValue(memberships.map((membership) => membership.bandId));
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set('Musiker*in konnte nicht geladen werden.');
        },
      });
    });
  }

  protected isBandSelected(bandId: number): boolean {
    return this.form.controls.bandIds.value.includes(bandId);
  }

  protected toggleBand(bandId: number): void {
    const selected = this.form.controls.bandIds.value;
    this.form.controls.bandIds.setValue(
      selected.includes(bandId)
        ? selected.filter((id) => id !== bandId)
        : [...selected, bandId],
    );
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    this.submitError.set(null);
    if (this.form.invalid) {
      return;
    }

    const { firstName, lastName, instrument, email } = this.form.getRawValue();
    const payload: MusicianRequest = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      instrument: instrument.trim() || null,
      email: email.trim() || null,
    };

    const request =
      this.editId() !== null
        ? this.musicianService.updateMusician(this.editId()!, payload)
        : this.musicianService.createMusician(payload);

    this.saving.set(true);
    request.subscribe({
      next: (musician) => this.saveBands(musician.id),
      error: () => {
        this.saving.set(false);
        this.submitError.set('Speichern fehlgeschlagen.');
      },
    });
  }

  private saveBands(musicianId: number): void {
    if (!this.canManageBands()) {
      void this.router.navigate(['/musicians']);
      return;
    }

    const selected = this.form.controls.bandIds.value;
    const currentBandIds = new Set(this.loadedMemberships.map((membership) => membership.bandId));
    const requests = [
      ...selected
        .filter((bandId) => !currentBandIds.has(bandId))
        .map((bandId) => this.eventService.addBandMembership({ bandId, musicianId })),
      ...this.loadedMemberships
        .filter((membership) => !selected.includes(membership.bandId))
        .map((membership) => this.eventService.removeBandMembership(membership.id)),
    ];

    if (requests.length === 0) {
      void this.router.navigate(['/musicians']);
      return;
    }

    forkJoin(requests).subscribe({
      next: () => void this.router.navigate(['/musicians']),
      error: () => {
        this.toast.show('Musiker*in gespeichert, aber die Band-Zuordnung ist fehlgeschlagen.');
        void this.router.navigate(['/musicians']);
      },
    });
  }
}

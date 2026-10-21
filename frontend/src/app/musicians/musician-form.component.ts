import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import type { MusicianRequest } from './musician.model';
import { MusicianService } from './musician.service';

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

  protected readonly form = this.formBuilder.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(60)]],
    lastName: ['', [Validators.required, Validators.maxLength(60)]],
    instrument: ['', [Validators.maxLength(80)]],
    email: ['', [Validators.email, Validators.maxLength(120)]],
  });

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitError = signal<string | null>(null);
  protected readonly editId = signal<number | null>(null);

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id === null) {
        this.editId.set(null);
        this.loading.set(false);
        return;
      }

      this.editId.set(Number(id));
      this.loading.set(true);
      this.musicianService.loadMusician(Number(id)).subscribe({
        next: (musician) => {
          this.form.patchValue({
            firstName: musician.firstName,
            lastName: musician.lastName,
            instrument: musician.instrument ?? '',
            email: musician.email ?? '',
          });
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set('Musiker*in konnte nicht geladen werden.');
        },
      });
    });
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
      next: () => this.router.navigate(['/musicians']),
      error: () => {
        this.saving.set(false);
        this.submitError.set('Speichern fehlgeschlagen.');
      },
    });
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { EventService } from '../dashboard/event.service';
import type { Band, EventEditPolicy, EventItem, EventType, UserContact } from '../dashboard/event.model';
import { TranslatePipe } from '../language/translate.pipe';

@Component({
  selector: 'app-event-form',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './event-form.component.html',
  styleUrl: './event-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventFormComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);

  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    type: ['CONCERT' as EventType, [Validators.required]],
    date: ['', [Validators.required]],
    time: ['', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    bandId: [null as number | null, [Validators.required]],
    concert: [null as number | null],
    editPolicy: ['OWNER_ONLY' as EventEditPolicy],
  });

  protected readonly bands = signal<Band[]>([]);
  protected readonly concerts = signal<EventItem[]>([]);
  protected readonly choicesError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly isRehearsal = signal(false);
  protected readonly contacts = signal<UserContact[]>([]);
  protected readonly selectedEditorIds = signal<number[]>([]);

  constructor() {
    this.eventService.loadBands().subscribe({
      next: (bands) => {
        this.bands.set(bands);
        const first = bands[0];
        if (first) {
          this.form.controls.bandId.setValue(first.id);
        }
      },
      error: () => this.choicesError.set('Band konnte nicht geladen werden.'),
    });

    this.eventService.loadEvents().subscribe({
      next: (events) =>
        this.concerts.set(events.filter((event) => event.type === 'CONCERT' && event.canEdit)),
      error: () => this.choicesError.set('Vorhandene Gigs konnten nicht geladen werden.'),
    });

    this.eventService.loadContacts().subscribe({
      next: (contacts) => this.contacts.set(contacts),
    });

    this.form.controls.type.valueChanges.subscribe((value) => {
      this.isRehearsal.set(value === 'REHEARSAL');
      this.form.controls.concert.setValue(null);
    });
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    this.submitError.set(null);

    if (this.form.invalid) {
      if (this.bands().length === 0) {
        this.submitError.set('Es ist noch keine Band hinterlegt.');
      }
      return;
    }

    const { title, type, date, time, bandId, concert } = this.form.getRawValue();
    const payload = {
      title: title.trim(),
      dateTime: `${date}T${time}:00`,
      type,
      bandId: bandId as number,
      concertId: type === 'REHEARSAL' ? concert : null,
      editPolicy: this.form.controls.editPolicy.value,
      editorUserIds: this.form.controls.editPolicy.value === 'SELECTED_PARTICIPANTS'
        ? this.selectedEditorIds()
        : [],
    };

    this.saving.set(true);
    this.eventService.createEvent(payload).subscribe({
      next: () => void this.router.navigate(['/']),
      error: () => {
        this.saving.set(false);
        this.submitError.set('Event konnte nicht angelegt werden.');
      },
    });
  }

  protected toggleEditor(userId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedEditorIds.update((ids) =>
      checked ? [...new Set([...ids, userId])] : ids.filter((id) => id !== userId),
    );
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { RouterLink } from '@angular/router';

import type { EventItem, EventType } from './event.model';
import { EventService } from './event.service';
import { AuthService } from '../auth/auth.service';
import { formatDate, formatTime, typeLabel, dateContext } from '../event-format';

type Filter = 'ALL' | EventType;

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly eventService = inject(EventService);
  private readonly auth = inject(AuthService);

  protected readonly filter = signal<Filter>('ALL');
  protected readonly events = signal<EventItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly confirmingDelete = signal<Record<number, boolean>>({});
  protected readonly deleting = signal<Record<number, boolean>>({});
  protected readonly deleteError = signal<string | null>(null);

  protected readonly canDelete = this.auth.isOrganizer;

  protected readonly filteredEvents = computed(() => {
    const current = this.filter();
    if (current === 'ALL') {
      return this.events();
    }
    return this.events().filter((event) => event.type === current);
  });

  protected readonly filters: { value: Filter; label: string }[] = [
    { value: 'ALL', label: 'Alle' },
    { value: 'CONCERT', label: 'Gigs' },
    { value: 'REHEARSAL', label: 'Proben' },
  ];

  constructor() {
    this.eventService.loadEvents().subscribe({
      next: (events) => {
        this.events.set(events);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Events konnten nicht geladen werden.');
      },
    });
  }

  protected selectFilter(value: Filter): void {
    this.filter.set(value);
  }

  protected requestDelete(event: EventItem): void {
    this.deleteError.set(null);
    this.confirmingDelete.update((m) => ({ ...m, [event.id]: true }));
  }

  protected cancelDelete(event: EventItem): void {
    this.confirmingDelete.update((m) => ({ ...m, [event.id]: false }));
  }

  protected confirmDelete(event: EventItem): void {
    this.deleting.update((m) => ({ ...m, [event.id]: true }));
    this.deleteError.set(null);
    this.eventService.deleteEvent(event.id).subscribe({
      next: () => {
        this.deleting.update((m) => ({ ...m, [event.id]: false }));
        this.confirmingDelete.update((m) => ({ ...m, [event.id]: false }));
        this.events.update((list) => list.filter((e) => e.id !== event.id));
      },
      error: () => {
        this.deleting.update((m) => ({ ...m, [event.id]: false }));
        this.confirmingDelete.update((m) => ({ ...m, [event.id]: false }));
        this.deleteError.set('Termin konnte nicht gelöscht werden.');
      },
    });
  }

  protected typeLabel = typeLabel;

  protected formatDate = formatDate;

  protected formatTime = formatTime;

  protected dateContext = dateContext;
}

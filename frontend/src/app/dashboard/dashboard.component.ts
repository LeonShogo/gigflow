import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import type { EventItem, EventType } from './event.model';
import { EventService } from './event.service';
import { EventUndoService, type EventUndoSnapshot } from './event-undo.service';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../notifications/toast.service';
import { formatDate, formatTime, typeLabel, dateContext } from '../event-format';
import { TranslatePipe } from '../language/translate.pipe';
import { LanguageService } from '../language/language.service';

type Filter = 'ALL' | EventType;

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly eventService = inject(EventService);
  private readonly eventUndoService = inject(EventUndoService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly language = inject(LanguageService);

  protected readonly filter = signal<Filter>('ALL');
  protected readonly events = signal<EventItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly confirmingDelete = signal<Record<number, boolean>>({});
  protected readonly deleting = signal<Record<number, boolean>>({});
  protected readonly deleteError = signal<string | null>(null);
  protected readonly confirmingDeleteAll = signal(false);
  protected readonly deletingAll = signal(false);

  protected readonly ownedEvents = computed(() => {
    const userId = this.auth.currentUser()?.id;
    return userId == null ? [] : this.events().filter((event) => event.createdByUserId === userId);
  });
  protected readonly canCreateEvent = computed(() => this.auth.currentUser() !== null);
  protected readonly canDeleteAll = computed(() => this.ownedEvents().length > 0);

  protected canDelete(event: EventItem): boolean {
    return event.createdByUserId != null && event.createdByUserId === this.auth.currentUser()?.id;
  }

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

  protected async confirmDelete(event: EventItem): Promise<void> {
    this.deleting.update((m) => ({ ...m, [event.id]: true }));
    this.deleteError.set(null);
    try {
      const snapshot = await this.eventUndoService.capture(event.id);
      await firstValueFrom(this.eventService.deleteEvent(event.id));
      const deletedIds = new Set(snapshot.map((item) => item.eventId));
      this.deleting.update((m) => ({ ...m, [event.id]: false }));
      this.confirmingDelete.update((m) => ({ ...m, [event.id]: false }));
      this.events.update((list) => list.filter((e) => !deletedIds.has(e.id)));
      this.toast.show('Termin gelöscht.', {
        label: 'Rückgängig',
        run: () => void this.restoreEvent(snapshot),
      });
    } catch {
      this.deleting.update((m) => ({ ...m, [event.id]: false }));
      this.confirmingDelete.update((m) => ({ ...m, [event.id]: false }));
      this.deleteError.set('Termin konnte nicht gelöscht werden.');
    }
  }

  private async restoreEvent(snapshot: EventUndoSnapshot[]): Promise<void> {
    try {
      const restored = await this.eventUndoService.restore(snapshot);
      const restoredEvents = [...restored.values()];
      if (restoredEvents.length > 0) {
        this.events.update((list) =>
          [...list, ...restoredEvents].sort(
            (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
          ),
        );
      }
      this.toast.show(
        restoredEvents.length > 1 ? 'Termine wiederhergestellt.' : 'Termin wiederhergestellt.',
      );
    } catch {
      this.deleteError.set('Termin konnte nicht wiederhergestellt werden.');
    }
  }

  protected requestDeleteAll(): void {
    this.deleteError.set(null);
    this.confirmingDeleteAll.set(true);
  }

  protected cancelDeleteAll(): void {
    if (this.deletingAll()) {
      return;
    }
    this.confirmingDeleteAll.set(false);
  }

  protected deleteAllEvents(): void {
    if (this.deletingAll()) {
      return;
    }
    this.deletingAll.set(true);
    this.deleteError.set(null);
    this.eventService.deleteAllEvents().subscribe({
      next: () => {
        const deletedIds = new Set(this.ownedEvents().map((event) => event.id));
        this.events.update((events) => events.filter((event) => !deletedIds.has(event.id)));
        this.deletingAll.set(false);
        this.confirmingDeleteAll.set(false);
        this.toast.show('Alle Termine gelöscht.');
      },
      error: () => {
        this.deletingAll.set(false);
        this.deleteError.set('Termine konnten nicht gelöscht werden.');
      },
    });
  }

  protected typeLabel = (type: EventType): string => this.language.translate(typeLabel(type));

  protected formatDate = (dateTime: string): string => formatDate(dateTime, this.language.locale());

  protected formatTime = (dateTime: string): string => formatTime(dateTime, this.language.locale());

  protected dateContext = (dateTime: string): string | null => {
    const context = dateContext(dateTime);
    return context ? this.language.translate(context) : null;
  };
}

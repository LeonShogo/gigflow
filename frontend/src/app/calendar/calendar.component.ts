import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import type { EventItem } from '../dashboard/event.model';
import { EventService } from '../dashboard/event.service';
import { formatTime } from '../event-format';
import { buildIcs, downloadIcs, eventToIcal } from '../ical';

export interface CalendarDay {
  date: Date;
  dayNumber: number;
  otherMonth: boolean;
  isToday: boolean;
  events: EventItem[];
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const MONTHS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

const GRID_DAYS = 42;

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function shiftMonth(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

/** Monday-based week start. */
function startOfWeekMonday(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  return start;
}

function localKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

@Component({
  selector: 'app-calendar',
  imports: [RouterLink],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent {
  private readonly eventService = inject(EventService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly events = signal<EventItem[]>([]);
  protected readonly cursor = signal<Date>(startOfMonth(new Date()));

  protected readonly weekdays = WEEKDAYS;

  protected readonly monthLabel = computed(() => {
    const anchor = this.cursor();
    return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
  });

  protected readonly weeks = computed<CalendarDay[][]>(() => {
    const anchor = this.cursor();

    const byKey = new Map<string, EventItem[]>();
    for (const event of this.events()) {
      const key = localKey(new Date(event.dateTime));
      const list = byKey.get(key);
      if (list) {
        list.push(event);
      } else {
        byKey.set(key, [event]);
      }
    }

    const start = startOfWeekMonday(anchor);
    const todayKey = localKey(new Date());
    const cells: CalendarDay[] = [];
    for (let i = 0; i < GRID_DAYS; i++) {
      const date = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + i,
      );
      const key = localKey(date);
      cells.push({
        date,
        dayNumber: date.getDate(),
        otherMonth: date.getMonth() !== anchor.getMonth(),
        isToday: key === todayKey,
        events: byKey.get(key) ?? [],
      });
    }

    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < GRID_DAYS; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  });

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

  protected prevMonth(): void {
    this.cursor.set(shiftMonth(this.cursor(), -1));
  }

  protected nextMonth(): void {
    this.cursor.set(shiftMonth(this.cursor(), 1));
  }

  protected goToday(): void {
    this.cursor.set(startOfMonth(new Date()));
  }

  /** Exports every loaded event as a single .ics file (Google/Apple/Outlook). */
  protected exportAll(): void {
    const events = this.events();
    if (events.length === 0) {
      return;
    }
    const anchor = this.cursor();
    const month = String(anchor.getMonth() + 1).padStart(2, '0');
    downloadIcs(
      buildIcs(events.map((event) => eventToIcal(event))),
      `gigflow-kalender-${anchor.getFullYear()}-${month}.ics`,
    );
  }

  protected formatTime = formatTime;
}
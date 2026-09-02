import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, firstValueFrom, forkJoin, of, switchMap, throwError } from 'rxjs';
import { filter, map } from 'rxjs';

import { pdfToImages } from './pdf-images';

import { formatDate, formatTime, typeLabel } from '../event-format';
import type {
  EventItem,
  EventParticipation,
  ParticipationStatus,
} from '../dashboard/event.model';
import { EventService } from '../dashboard/event.service';
import { EventParticipationService } from '../dashboard/event-participation.service';
import type { SetlistEntry } from '../setlist/setlist.model';
import { SetlistService } from '../setlist/setlist.service';
import type {
  EquipmentRequirement,
  RequirementState,
} from '../equipment/equipment.model';
import { EquipmentRequirementService } from '../equipment/equipment.service';
import type { ScheduleItem } from '../schedule/schedule.model';
import { ScheduleService } from '../schedule/schedule.service';
import type { EventLocation, LocationType } from '../location/location.model';
import { LOCATION_TYPES } from '../location/location.model';
import { LocationService } from '../location/location.service';

const STATUS_LABELS: Record<ParticipationStatus, string> = {
  INVITED: 'Eingeladen',
  ACCEPTED: 'Zusage',
  DECLINED: 'Abgesagt',
};

const STATUS_ORDER: Record<ParticipationStatus, number> = {
  ACCEPTED: 0,
  INVITED: 1,
  DECLINED: 2,
};

/** Pre-loaded data for rendering the sheet without any HTTP request (used by the demo route). */
export interface EventPrintData {
  event: EventItem;
  participations: EventParticipation[];
  rehearsals: EventItem[];
  entries: SetlistEntry[];
  requirements: EquipmentRequirement[];
  scheduleItems: ScheduleItem[];
  locations: EventLocation[];
}

/** Rendered pages (as PNG data URLs) for one setlist position. */
export interface SheetPages {
  entryId: number;
  title: string;
  sources: string[];
}

@Component({
  selector: 'app-event-print',
  imports: [RouterLink],
  templateUrl: './event-print.component.html',
  styleUrl: './event-print.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventPrintComponent implements OnInit {
  /** Optional pre-loaded data; when provided the component renders without HTTP. */
  readonly data = input<EventPrintData | null>(null);

  private readonly route = inject(ActivatedRoute);
  private readonly eventService = inject(EventService);
  private readonly participationService = inject(EventParticipationService);
  private readonly setlistService = inject(SetlistService);
  private readonly requirementService = inject(EquipmentRequirementService);
  private readonly scheduleService = inject(ScheduleService);
  private readonly locationService = inject(LocationService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly event = signal<EventItem | null>(null);
  protected readonly participations = signal<EventParticipation[]>([]);
  protected readonly rehearsals = signal<EventItem[]>([]);
  protected readonly entries = signal<SetlistEntry[]>([]);
  protected readonly requirements = signal<EquipmentRequirement[]>([]);
  protected readonly scheduleItems = signal<ScheduleItem[]>([]);
  protected readonly locations = signal<EventLocation[]>([]);

  protected readonly includeSetlist = signal(true);
  protected readonly sheetsLoading = signal(false);
  protected readonly sheetFiles = signal<SheetPages[]>([]);

  private sheetsTriggered = false;
  private renderVersion = 0;

  protected readonly confirmedCount = computed(
    () => this.participations().filter((p) => p.status === 'ACCEPTED').length,
  );

  protected readonly sortedEntries = computed(() =>
    [...this.entries()].sort((a, b) => a.position - b.position),
  );

  protected readonly sortedParticipations = computed(() =>
    [...this.participations()].sort((a, b) => {
      const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (byStatus !== 0) {
        return byStatus;
      }
      const aName = `${a.musician?.lastName ?? ''} ${a.musician?.firstName ?? ''}`;
      const bName = `${b.musician?.lastName ?? ''} ${b.musician?.firstName ?? ''}`;
      return aName.localeCompare(bName, 'de');
    }),
  );

  ngOnInit(): void {
    const preset = this.data();
    if (preset) {
      this.apply(preset);
      this.loading.set(false);
      return;
    }
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        filter((id): id is string => id != null),
        switchMap((id) => {
          const eventId = Number(id);
          this.loading.set(true);
          this.error.set(null);
          return this.eventService.loadEvent(eventId).pipe(
            switchMap((event) =>
              forkJoin({
                event: of(event),
                participations: this.participationService.loadForEvent(eventId),
                rehearsals:
                  event.type === 'CONCERT'
                    ? this.eventService.loadRehearsalsForConcert(eventId)
                    : of([] as EventItem[]),
                entries: this.loadEntries(eventId),
                requirements: this.requirementService.loadForEvent(eventId),
                scheduleItems: this.scheduleService.loadForEvent(eventId),
                locations: this.locationService.loadForEvent(eventId),
              }),
            ),
          );
        }),
      )
      .subscribe({
        next: (data) => {
          this.apply(data);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.event.set(null);
          this.error.set('Gig-Sheet konnte nicht geladen werden.');
        },
      });
  }

  private apply(data: EventPrintData): void {
    this.event.set(data.event);
    this.participations.set(data.participations);
    this.rehearsals.set(data.rehearsals);
    this.entries.set(data.entries);
    this.requirements.set(data.requirements);
    this.scheduleItems.set(
      [...data.scheduleItems].sort((a, b) => a.time.localeCompare(b.time)),
    );
    this.locations.set(data.locations);
    this.triggerSheets();
  }

  protected setSetlist(include: boolean): void {
    if (this.includeSetlist() === include) {
      return;
    }
    this.includeSetlist.set(include);
    if (include) {
      this.sheetsTriggered = true;
      void this.renderSheets();
    }
  }

  private triggerSheets(): void {
    if (this.includeSetlist() && !this.sheetsTriggered) {
      this.sheetsTriggered = true;
      void this.renderSheets();
    }
  }

  /**
   * Downloads the sheet PDF of every setlist entry that has one and renders
   * its pages so they can be printed in setlist order. A failing sheet is
   * skipped silently so one broken PDF cannot block the whole printout.
   */
  private async renderSheets(): Promise<void> {
    const version = ++this.renderVersion;
    this.sheetsLoading.set(true);
    this.sheetFiles.set([]);
    const files: SheetPages[] = [];
    try {
      if (!this.data()) {
        const withPdf = this.sortedEntries().filter((e) => e.hasSheetPdf);
        for (const entry of withPdf) {
          try {
            const blob = await firstValueFrom(
              this.setlistService.downloadSheetPdf(entry.pieceId),
            );
            const sources = await pdfToImages(blob);
            if (version === this.renderVersion) {
              files.push({ entryId: entry.id, title: entry.pieceTitle, sources });
            }
          } catch {
            // einzelnes fehlerhaftes Notenblatt überspringen
          }
        }
      }
    } finally {
      if (version === this.renderVersion) {
        this.sheetFiles.set(files);
        this.sheetsLoading.set(false);
      }
    }
  }

  /**
   * Loads the setlist for an event without creating one implicitly.
   * A missing setlist (404) simply counts as empty.
   */
  private loadEntries(eventId: number) {
    return this.setlistService.getByEvent(eventId).pipe(
      catchError((err) => {
        if (err?.status === 404) {
          return of(null);
        }
        return throwError(() => err);
      }),
      switchMap((setlist) =>
        setlist ? this.setlistService.loadEntries(setlist.id) : of([] as SetlistEntry[]),
      ),
    );
  }

  protected statusLabel(status: ParticipationStatus): string {
    return STATUS_LABELS[status];
  }

  protected stateLabel(state: RequirementState): string {
    if (state === 'YES') {
      return 'Ja';
    }
    if (state === 'NO') {
      return 'Nein';
    }
    return 'Offen';
  }

  protected locationTypeLabel(type: LocationType): string {
    return LOCATION_TYPES.find((t) => t.value === type)?.label ?? type;
  }

  protected formatDate = formatDate;

  protected formatTime = formatTime;

  protected typeLabel = typeLabel;

  protected print(): void {
    window.print();
  }
}
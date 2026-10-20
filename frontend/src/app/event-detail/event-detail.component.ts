import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, filter, map, switchMap, tap } from 'rxjs';

import { SheetViewerComponent } from './sheet-viewer.component';

import { formatDate, formatTime, formatTimeOnly, typeLabel } from '../event-format';
import type {
  EventItem,
  EventParticipation,
  EventRequest,
  ParticipationStatus,
} from '../dashboard/event.model';
import { EventService } from '../dashboard/event.service';
import {
  EventParticipationService,
  type ParticipationRequest,
} from '../dashboard/event-participation.service';
import type { Musician } from '../musicians/musician.model';
import { MusicianService } from '../musicians/musician.service';
import type { SetlistEntry } from '../setlist/setlist.model';
import { SetlistService } from '../setlist/setlist.service';
import type {
  Equipment,
  EquipmentRequirement,
  EquipmentRequirementRequest,
  RequirementState,
} from '../equipment/equipment.model';
import {
  EquipmentRequirementService,
  EquipmentService,
} from '../equipment/equipment.service';
import type { ScheduleItem, ScheduleItemRequest } from '../schedule/schedule.model';
import { ScheduleService } from '../schedule/schedule.service';
import type { EventLocation, LocationRequest, LocationType } from '../location/location.model';
import { LOCATION_TYPES } from '../location/location.model';
import { LocationService } from '../location/location.service';
import { AuthService } from '../auth/auth.service';
import { buildIcs, downloadIcs, eventFilename, eventToIcal } from '../ical';

interface PanelMeta {
  title: string;
  description?: string;
}

const PANEL_ORDER_DEFAULT = ['members', 'setlist', 'rehearsals', 'equipment', 'locations', 'schedule'];

const PANEL_META: Record<string, PanelMeta> = {
  members: { title: 'Musiker / Zusagen', description: 'Besetzung & Zusagen' },
  setlist: { title: 'Setlist', description: 'Spielreihenfolge & Noten' },
  rehearsals: { title: 'Proben zu diesem Gig', description: 'Vorbereitung für diesen Gig' },
  equipment: { title: 'Equipment', description: 'Instrumente & Technik' },
  locations: { title: 'Orte & Logistik', description: 'Venue, Hotel, Catering & Treffpunkte' },
  schedule: { title: 'Ablauf / Zeiten', description: 'Aufbau, Soundcheck, Auftritt, Abbau' },
};

const STATUS_LABELS: Record<ParticipationStatus, string> = {
  INVITED: 'Eingeladen',
  ACCEPTED: 'Zusage',
  DECLINED: 'Abgesagt',
};

const SCHEDULE_CUSTOM = 'custom';

const SCHEDULE_PRESETS = [
  'Abfahrt',
  'Ankunft',
  'Hotel Check-in',
  'Aufbau',
  'Catering',
  'Soundcheck',
  'Einlass',
  'Erstes Set',
  'Pause',
  'Zweites Set',
  'Zugabe',
  'Abbau',
  'Hotel Check-out',
  'Rückfahrt',
];

@Component({
  selector: 'app-event-detail',
  imports: [RouterLink, FormsModule, DragDropModule, SheetViewerComponent],
  templateUrl: './event-detail.component.html',
  styleUrl: './event-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);
  private readonly participationService = inject(EventParticipationService);
  private readonly musicianService = inject(MusicianService);
  private readonly setlistService = inject(SetlistService);
  private readonly equipmentService = inject(EquipmentService);
  private readonly equipmentRequirementService = inject(EquipmentRequirementService);
  private readonly scheduleService = inject(ScheduleService);
  private readonly locationService = inject(LocationService);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly event = signal<EventItem | null>(null);

  protected readonly confirmingDelete = signal(false);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);
  protected readonly canDelete = computed(() => this.auth.isOrganizer());

  protected readonly participations = signal<EventParticipation[]>([]);
  protected readonly participantsLoading = signal(true);
  protected readonly participantsError = signal<string | null>(null);

  protected readonly pauseSaving = signal<Record<number, boolean>>({});
  protected readonly participationFeedback = signal<string | null>(null);
  protected readonly participationError = signal<string | null>(null);
  protected readonly confirmingRemoval = signal<Record<number, boolean>>({});
  protected readonly pickerOpen = signal(false);
  protected readonly musicians = signal<Musician[]>([]);
  protected readonly musiciansLoading = signal(false);
  protected readonly addingMusicians = signal<Record<number, boolean>>({});
  protected readonly newMusicianOpen = signal(false);
  protected readonly newMusicianSaving = signal(false);
  protected readonly newFirstName = signal('');
  protected readonly newLastName = signal('');
  protected readonly newInstrument = signal('');

  protected readonly confirmedCount = computed(
    () => this.participations().filter((p) => p.status === 'ACCEPTED').length,
  );
  protected readonly orderedParticipations = computed(() => {
    const priority: Record<ParticipationStatus, number> = {
      ACCEPTED: 0,
      INVITED: 1,
      DECLINED: 2,
    };
    return [...this.participations()].sort(
      (a, b) => priority[a.status] - priority[b.status],
    );
  });
  protected readonly participatingIds = computed(() => new Set(this.participations().map((p) => p.musicianId)));
  protected readonly availableMusicians = computed(() =>
    this.musicians().filter((m) => !this.participatingIds().has(m.id)),
  );
  protected readonly canAddNewMusician = computed(
    () =>
      !this.newMusicianSaving() &&
      this.newFirstName().trim().length > 0 &&
      this.newLastName().trim().length > 0,
  );
  protected readonly statusOptions: ParticipationStatus[] = ['INVITED', 'ACCEPTED', 'DECLINED'];
  protected readonly canManageMembers = computed(() => this.auth.isOrganizer());
  protected readonly canSelfJoin = computed(
    () => this.auth.isAuthenticated() && this.auth.musicianId() != null,
  );
  protected readonly myMusicianId = computed(() => this.auth.musicianId());
  protected readonly myParticipation = computed(() => {
    const musicianId = this.myMusicianId();
    if (musicianId == null) {
      return null;
    }
    return this.participations().find((p) => p.musicianId === musicianId) ?? null;
  });
  protected readonly selfSaving = signal(false);

  protected readonly panelOrder = signal<string[]>(PANEL_ORDER_DEFAULT);
  protected readonly dragStartDelay = { touch: 350, mouse: 0 };
  @ViewChild('board') protected readonly boardRef?: ElementRef<HTMLDivElement>;
  protected readonly panelCollapsed = signal<Record<string, boolean>>({});  protected readonly layoutLoading = signal(false);
  protected readonly layoutError = signal<string | null>(null);

  protected readonly setlistLoading = signal(false);
  protected readonly setlistError = signal<string | null>(null);
  protected readonly setlistId = signal<number | null>(null);
  protected readonly entries = signal<SetlistEntry[]>([]);
  protected readonly adding = signal(false);
  protected readonly newTitle = signal('');
  protected readonly canAdd = computed(() => this.adding() || !this.newTitle().trim());

  protected readonly canUploadSheets = computed(() => this.auth.isOrganizer());
  protected readonly sheetUploading = signal<Record<number, boolean>>({});
  protected readonly sheetFeedback = signal<string | null>(null);
  protected readonly sheetError = signal<string | null>(null);
  protected readonly sheetFile = signal<File | null>(null);
  protected readonly openSheetTitle = signal<string | null>(null);
  protected pendingPdfPieceId = signal<number | null>(null);
  @ViewChild('pdfInput') protected readonly pdfInputRef?: ElementRef<HTMLInputElement>;

  protected readonly mediaUploading = signal<Record<number, boolean>>({});
  protected readonly mediaFeedback = signal<string | null>(null);
  protected readonly mediaError = signal<string | null>(null);
  protected readonly demoPlaying = signal<{ pieceId: number; title: string; url: string } | null>(null);
  protected readonly youtubeEditing = signal<Record<number, boolean>>({});
  protected readonly youtubeDraft = signal<Record<number, string>>({});
  protected pendingAudioPieceId = signal<number | null>(null);
  @ViewChild('audioInput') protected readonly audioInputRef?: ElementRef<HTMLInputElement>;

  protected readonly rehearsals = signal<EventItem[]>([]);
  protected readonly rehearsalsLoading = signal(false);
  protected readonly rehearsalsError = signal<string | null>(null);
  protected readonly rehearsalsSaving = signal<Record<number, boolean>>({});
  protected readonly rehearsalsFeedback = signal<string | null>(null);
  protected readonly confirmingRehearsalUnlink = signal<Record<number, boolean>>({});
  protected readonly rehearsalPickerOpen = signal(false);
  protected readonly allRehearsals = signal<EventItem[]>([]);
  protected readonly allRehearsalsLoading = signal(false);
  protected readonly assigningRehearsal = signal<Record<number, boolean>>({});
  protected readonly newRehearsalOpen = signal(false);
  protected readonly newRehearsalSaving = signal(false);
  protected readonly newRehearsalTitle = signal('');
  protected readonly newRehearsalDate = signal('');
  protected readonly newRehearsalTime = signal('');

  protected readonly assignedRehearsalIds = computed(
    () => new Set(this.rehearsals().map((r) => r.id)),
  );
  protected readonly availableRehearsals = computed(() =>
    this.allRehearsals().filter((r) => !this.assignedRehearsalIds().has(r.id)),
  );
  protected readonly canAddNewRehearsal = computed(
    () =>
      !this.newRehearsalSaving() &&
      this.newRehearsalTitle().trim().length > 0 &&
      this.newRehearsalDate().length > 0 &&
      this.newRehearsalTime().length > 0,
  );

  protected readonly requirements = signal<EquipmentRequirement[]>([]);
  protected readonly requirementsLoading = signal(false);
  protected readonly requirementsError = signal<string | null>(null);
  protected readonly requirementsSaving = signal<Record<number, boolean>>({});
  protected readonly requirementsFeedback = signal<string | null>(null);
  protected readonly confirmingRequirementRemoval = signal<Record<number, boolean>>({});
  protected readonly equipmentPickerOpen = signal(false);
  protected readonly equipmentCatalog = signal<Equipment[]>([]);
  protected readonly equipmentCatalogLoading = signal(false);
  protected readonly addingEquipment = signal<Record<number, boolean>>({});
  protected readonly newEquipmentOpen = signal(false);
  protected readonly newEquipmentName = signal('');
  protected readonly newEquipmentCategory = signal('');
  protected readonly newEquipmentSaving = signal(false);

  protected readonly requiredEquipmentIds = computed(
    () => new Set(this.requirements().map((r) => r.equipmentId)),
  );
  protected readonly availableEquipment = computed(() =>
    this.equipmentCatalog().filter((e) => !this.requiredEquipmentIds().has(e.id)),
  );
  protected readonly canAddNewEquipment = computed(
    () => !this.newEquipmentSaving() && this.newEquipmentName().trim().length > 0,
  );
  protected readonly stateOptions: RequirementState[] = ['UNKNOWN', 'YES', 'NO'];
  protected readonly equipmentResolvedCount = computed(
    () =>
      this.requirements().filter(
        (r) => r.availableOnSite !== 'UNKNOWN' || r.needsToBeBrought !== 'UNKNOWN',
      ).length,
  );

  protected readonly scheduleItems = signal<ScheduleItem[]>([]);
  protected readonly scheduleLoading = signal(false);
  protected readonly scheduleError = signal<string | null>(null);
  protected readonly scheduleSaving = signal<Record<number, boolean>>({});
  protected readonly scheduleFeedback = signal<string | null>(null);
  protected readonly scheduleFormOpen = signal(false);
  protected readonly editingScheduleId = signal<number | null>(null);
  protected readonly scheduleType = signal('');
  protected readonly scheduleCustom = signal('');
  protected readonly scheduleTime = signal('');
  protected readonly canSaveSchedule = computed(() => {
    if (!this.scheduleTime().length || !this.scheduleType()) {
      return false;
    }
    if (this.scheduleType() === SCHEDULE_CUSTOM) {
      return this.scheduleCustom().trim().length > 0;
    }
    return this.schedulePresets.includes(this.scheduleType());
  });
  protected readonly schedulePresets = SCHEDULE_PRESETS;

  protected readonly locations = signal<EventLocation[]>([]);
  protected readonly locationsLoading = signal(false);
  protected readonly locationsError = signal<string | null>(null);
  protected readonly locationsFeedback = signal<string | null>(null);
  protected readonly locationsSaving = signal<Record<number, boolean>>({});
  protected readonly confirmingLocationRemoval = signal<Record<number, boolean>>({});
  protected readonly locationFormOpen = signal(false);
  protected readonly editingLocationId = signal<number | null>(null);
  protected readonly locationType = signal<LocationType | ''>('');
  protected readonly locationName = signal('');
  protected readonly locationAddress = signal('');
  protected readonly locationNote = signal('');
  protected readonly locationPhone = signal('');
  protected readonly locationMapsUrl = signal('');
  protected readonly locationTypes = LOCATION_TYPES;
  protected readonly canSaveLocation = computed(
    () =>
      !this.locationsSaving()[-1] &&
      this.locationType() !== '' &&
      this.locationName().trim().length > 0 &&
      this.locationAddress().trim().length > 0,
  );

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        filter((id): id is string => id != null),
        switchMap((id) => {
          this.loading.set(true);
          this.error.set(null);
          return this.eventService.loadEvent(Number(id));
        }),
      )
      .subscribe({
        next: (event) => {
          this.event.set(event);
          this.loading.set(false);
          this.loadParticipants(event.id);
          if (event.type === 'CONCERT') {
            this.loadRehearsals(event.id);
            this.loadSetlist(event.id);
            this.loadPanelLayout(event.id);
            this.loadRequirements(event.id);
            this.loadScheduleItems(event.id);
            this.loadLocations(event.id);
          }
        },
        error: () => {
          this.loading.set(false);
          this.event.set(null);
          this.error.set('Event konnte nicht geladen werden.');
        },
      });
  }

  private loadParticipants(eventId: number): void {
    this.participantsLoading.set(true);
    this.participantsError.set(null);
    this.participationService.loadForEvent(eventId).subscribe({
      next: (participations) => {
        this.participations.set(participations);
        this.participantsLoading.set(false);
      },
      error: () => {
        this.participantsLoading.set(false);
        this.participantsError.set('Teilnahmen konnten nicht geladen werden.');
      },
    });
  }

  protected statusLabel(status: ParticipationStatus): string {
    return STATUS_LABELS[status];
  }

  protected changeStatus(participation: EventParticipation, value: string): void {
    const status = value as ParticipationStatus;
    if (!status || status === participation.status) {
      return;
    }
    this.pauseSaving.update((m) => ({ ...m, [participation.id]: true }));
    this.participationError.set(null);
    this.participationFeedback.set(null);
    const previous = participation.status;
    this.participations.update((list) =>
      list.map((p) => (p.id === participation.id ? { ...p, status } : p)),
    );
    const request: ParticipationRequest = {
      eventId: participation.eventId,
      musicianId: participation.musicianId,
      status,
    };
    this.participationService.update(participation.id, request).subscribe({
      next: () => {
        this.pauseSaving.update((m) => ({ ...m, [participation.id]: false }));
        this.participationFeedback.set('Status gespeichert.');
      },
      error: () => {
        this.pauseSaving.update((m) => ({ ...m, [participation.id]: false }));
        this.participations.update((list) =>
          list.map((p) => (p.id === participation.id ? { ...p, status: previous } : p)),
        );
        this.participationError.set('Status konnte nicht gespeichert werden.');
      },
    });
  }

  protected requestRemoveParticipation(participation: EventParticipation): void {
    this.confirmingRemoval.update((m) => ({ ...m, [participation.id]: true }));
  }

  protected cancelRemoveParticipation(participation: EventParticipation): void {
    this.confirmingRemoval.update((m) => ({ ...m, [participation.id]: false }));
  }

  protected confirmRemoveParticipation(participation: EventParticipation): void {
    this.pauseSaving.update((m) => ({ ...m, [participation.id]: true }));
    this.participationError.set(null);
    this.participationFeedback.set(null);
    this.participationService.remove(participation.id).subscribe({
      next: () => {
        this.participations.update((list) => list.filter((p) => p.id !== participation.id));
        this.pauseSaving.update((m) => ({ ...m, [participation.id]: false }));
        this.confirmingRemoval.update((m) => ({ ...m, [participation.id]: false }));
        this.participationFeedback.set('Person entfernt.');
      },
      error: () => {
        this.pauseSaving.update((m) => ({ ...m, [participation.id]: false }));
        this.confirmingRemoval.update((m) => ({ ...m, [participation.id]: false }));
        this.participationError.set('Person konnte nicht entfernt werden.');
      },
    });
  }

  protected togglePicker(): void {
    if (this.pickerOpen()) {
      this.pickerOpen.set(false);
      this.newMusicianOpen.set(false);
      return;
    }
    this.pickerOpen.set(true);
    if (this.musicians().length === 0) {
      this.loadMusicians();
    }
  }

  protected joinSelf(): void {
    const event = this.event();
    if (!event || this.selfSaving()) {
      return;
    }
    this.selfSaving.set(true);
    this.participationError.set(null);
    this.participationFeedback.set(null);
    this.participationService.joinSelf(event.id).subscribe({
      next: (created) => {
        this.selfSaving.set(false);
        this.participations.update((list) => [...list, created]);
        this.participationFeedback.set('Teilnahme bestätigt.');
      },
      error: () => {
        this.selfSaving.set(false);
        this.participationError.set('Teilnahme fehlgeschlagen.');
      },
    });
  }

  protected changeOwnStatus(value: string): void {
    const participation = this.myParticipation();
    if (!participation || this.selfSaving()) {
      return;
    }
    const status = value as ParticipationStatus;
    if (!status || status === participation.status) {
      return;
    }
    this.selfSaving.set(true);
    this.participationError.set(null);
    this.participationFeedback.set(null);
    const request: ParticipationRequest = {
      eventId: participation.eventId,
      musicianId: participation.musicianId,
      status,
    };
    this.participationService.update(participation.id, request).subscribe({
      next: (updated) => {
        this.selfSaving.set(false);
        this.participations.update((list) =>
          list.map((p) => (p.id === updated.id ? updated : p)),
        );
        this.participationFeedback.set('Deine Zusage wurde aktualisiert.');
      },
      error: () => {
        this.selfSaving.set(false);
        this.participationError.set('Zusage konnte nicht aktualisiert werden.');
      },
    });
  }

  private loadMusicians(): void {
    this.musiciansLoading.set(true);
    this.musicianService.loadMusicians().subscribe({
      next: (musicians) => {
        this.musicians.set(musicians);
        this.musiciansLoading.set(false);
      },
      error: () => {
        this.musiciansLoading.set(false);
        this.participationError.set('Musiker:innen konnten nicht geladen werden.');
      },
    });
  }

  protected addExistingMusician(musician: Musician): void {
    const event = this.event();
    if (!event) {
      return;
    }
    this.addingMusicians.update((m) => ({ ...m, [musician.id]: true }));
    this.participationError.set(null);
    this.participationFeedback.set(null);
    const request: ParticipationRequest = { eventId: event.id, musicianId: musician.id, status: 'INVITED' };
    this.participationService.create(request).subscribe({
      next: (created) => {
        this.addingMusicians.update((m) => ({ ...m, [musician.id]: false }));
        this.participations.update((list) => [...list, created]);
        this.pickerOpen.set(false);
        this.participationFeedback.set('Person hinzugefügt.');
      },
      error: () => {
        this.addingMusicians.update((m) => ({ ...m, [musician.id]: false }));
        this.participationError.set('Person konnte nicht hinzugefügt werden.');
      },
    });
  }

  protected toggleNewMusician(): void {
    this.newMusicianOpen.update((open) => !open);
  }

  protected addNewMusician(): void {
    const event = this.event();
    const first = this.newFirstName().trim();
    const last = this.newLastName().trim();
    if (!event || !first || !last || this.newMusicianSaving()) {
      return;
    }
    this.newMusicianSaving.set(true);
    this.participationError.set(null);
    this.participationFeedback.set(null);
    const instrument = this.newInstrument().trim() || null;
    this.musicianService
      .createMusician({ firstName: first, lastName: last, instrument })
      .subscribe({
        next: (musician) => {
          const request: ParticipationRequest = { eventId: event.id, musicianId: musician.id, status: 'INVITED' };
          this.participationService.create(request).subscribe({
            next: (created) => {
              this.newMusicianSaving.set(false);
              this.musicians.update((list) => [...list, musician]);
              this.participations.update((list) => [...list, created]);
              this.newFirstName.set('');
              this.newLastName.set('');
              this.newInstrument.set('');
              this.newMusicianOpen.set(false);
              this.pickerOpen.set(false);
              this.participationFeedback.set('Person angelegt und hinzugefügt.');
            },
            error: () => {
              this.newMusicianSaving.set(false);
              this.participationError.set('Person wurde angelegt, konnte aber nicht zugeordnet werden.');
              this.musicians.update((list) => [...list, musician]);
            },
          });
        },
        error: () => {
          this.newMusicianSaving.set(false);
          this.participationError.set('Person konnte nicht angelegt werden.');
        },
      });
  }

  protected onNewFirstName(event: Event): void {
    this.newFirstName.set((event.target as HTMLInputElement).value);
  }

  protected onNewLastName(event: Event): void {
    this.newLastName.set((event.target as HTMLInputElement).value);
  }

  protected onNewInstrument(event: Event): void {
    this.newInstrument.set((event.target as HTMLInputElement).value);
  }

  protected panelTitle(key: string): string {
    return PANEL_META[key]?.title ?? key;
  }

  protected panelDescription(key: string): string | undefined {
    return PANEL_META[key]?.description;
  }

  protected isCollapsed(key: string): boolean {
    return this.panelCollapsed()[key] === true;
  }

  protected togglePanel(key: string): void {
    this.panelCollapsed.update((collapsed) => ({ ...collapsed, [key]: !(collapsed[key] === true) }));
    if (key === 'setlist' && !this.isCollapsed('setlist')) {
      const event = this.event();
      if (event) {
        this.loadSetlist(event.id);
      }
    }
    this.saveLayout();
  }

  protected onPanelDrop(event: CdkDragDrop<string[]>): void {
    const order = this.panelOrder();
    const targetIndex = this.resolvePanelTargetIndex(event);
    if (event.previousIndex === targetIndex) {
      return;
    }
    const next = [...order];
    const tmp = next[event.previousIndex];
    next[event.previousIndex] = next[targetIndex];
    next[targetIndex] = tmp;
    this.panelOrder.set(next);
    this.saveLayout();
  }

  /**
   * Determines which panel should be swapped with the dragged panel by matching
   * the pointer position against the nearest panel's center. This is far more
   * reliable than CDK's linear index in a responsive 2D grid (1/2/3 columns),
   * where horizontal neighbours and backwards moves cause flickering.
   */
  private resolvePanelTargetIndex(event: CdkDragDrop<string[]>): number {
    const panels = this.boardRef?.nativeElement?.querySelectorAll(':scope > .panel');
    const count = panels?.length ?? 0;
    if (!count) {
      return event.currentIndex;
    }
    const x = event.dropPoint.x;
    const y = event.dropPoint.y;
    let best = event.currentIndex;
    let bestDistance = Infinity;
    for (let i = 0; i < count; i++) {
      const rect = (panels![i] as HTMLElement).getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const distance = Math.hypot(x - cx, y - cy);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    return best;
  }

  private loadPanelLayout(eventId: number): void {
    this.layoutLoading.set(true);
    this.layoutError.set(null);
    this.eventService.loadPanelLayout(eventId).subscribe({
      next: (layout) => {
        this.applyLayout(layout);
        this.layoutLoading.set(false);
      },
      error: () => {
        this.layoutLoading.set(false);
        this.layoutError.set('Anordnung konnte nicht geladen werden.');
      },
    });
  }

  private applyLayout(layout: {
    order: string[];
    collapsed: Record<string, boolean>;
  }): void {
    const baseOrder = Array.isArray(layout.order) && layout.order.length > 0
      ? layout.order.filter((key) => key !== 'sheet')
      : [...PANEL_ORDER_DEFAULT];
    const mergedOrder = [...baseOrder];
    for (const key of PANEL_ORDER_DEFAULT) {
      if (!mergedOrder.includes(key)) {
        mergedOrder.push(key);
      }
    }
    this.panelOrder.set(mergedOrder);
    if (layout.collapsed) {
      this.panelCollapsed.set({ ...layout.collapsed });
    }
  }

  private saveLayout(): void {
    const event = this.event();
    if (!event) {
      return;
    }
    const collapsed: Record<string, boolean> = {};
    for (const key of this.panelOrder()) {
      if (this.isCollapsed(key)) {
        collapsed[key] = true;
      }
    }
    this.eventService
      .savePanelLayout(event.id, { order: this.panelOrder(), collapsed })
      .subscribe({
        error: () => this.layoutError.set('Anordnung konnte nicht gespeichert werden.'),
      });
  }

  protected responsibleValue(requirement: EquipmentRequirement): string | number {
    return requirement.responsibleMusicianId ?? '';
  }

  protected onResponsibleChange(requirement: EquipmentRequirement, value: string): void {
    const id = value === '' ? null : Number(value);
    this.setResponsible(requirement, id);
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

  protected stateMark(state: RequirementState): string {
    if (state === 'YES') {
      return '●';
    }
    if (state === 'NO') {
      return '×';
    }
    return '·';
  }

  private loadRequirements(eventId: number): void {
    this.requirementsLoading.set(true);
    this.requirementsError.set(null);
    this.equipmentRequirementService.loadForEvent(eventId).subscribe({
      next: (requirements) => {
        this.requirements.set(requirements);
        this.requirementsLoading.set(false);
      },
      error: () => {
        this.requirementsLoading.set(false);
        this.requirementsError.set('Equipment konnte nicht geladen werden.');
      },
    });
  }

  private loadScheduleItems(eventId: number): void {
    this.scheduleLoading.set(true);
    this.scheduleError.set(null);
    this.scheduleService.loadForEvent(eventId).subscribe({
      next: (items) => {
        this.scheduleItems.set(items);
        this.scheduleLoading.set(false);
      },
      error: () => {
        this.scheduleLoading.set(false);
        this.scheduleError.set('Ablauf konnte nicht geladen werden.');
      },
    });
  }

  protected toggleScheduleForm(): void {
    if (this.scheduleFormOpen()) {
      this.scheduleFormOpen.set(false);
      this.editingScheduleId.set(null);
      return;
    }
    this.scheduleFormOpen.set(true);
    this.editingScheduleId.set(null);
    this.scheduleType.set('');
    this.scheduleCustom.set('');
    this.scheduleTime.set('');
  }

  protected startEditSchedule(item: ScheduleItem): void {
    this.editingScheduleId.set(item.id);
    this.scheduleTime.set(item.time);
    if (this.schedulePresets.includes(item.label)) {
      this.scheduleType.set(item.label);
      this.scheduleCustom.set('');
    } else {
      this.scheduleType.set(SCHEDULE_CUSTOM);
      this.scheduleCustom.set(item.label);
    }
    this.scheduleFormOpen.set(true);
  }

  protected cancelScheduleEdit(): void {
    this.scheduleFormOpen.set(false);
    this.editingScheduleId.set(null);
    this.scheduleType.set('');
    this.scheduleCustom.set('');
    this.scheduleTime.set('');
  }

  protected onScheduleType(event: Event): void {
    this.scheduleType.set((event.target as HTMLSelectElement).value);
  }

  protected onScheduleCustom(event: Event): void {
    this.scheduleCustom.set((event.target as HTMLInputElement).value);
  }

  protected onScheduleTime(event: Event): void {
    this.scheduleTime.set((event.target as HTMLInputElement).value);
  }

  private currentScheduleLabel(): string {
    return this.scheduleType() === SCHEDULE_CUSTOM
      ? this.scheduleCustom().trim()
      : this.scheduleType();
  }

  protected saveScheduleItem(): void {
    const event = this.event();
    if (!event || !this.canSaveSchedule()) {
      return;
    }
    const label = this.currentScheduleLabel();
    const time = this.scheduleTime();
    const editingId = this.editingScheduleId();
    this.scheduleError.set(null);
    this.scheduleFeedback.set(null);
    if (editingId != null) {
      const existing = this.scheduleItems().find((i) => i.id === editingId);
      if (!existing) {
        return;
      }
      this.scheduleSaving.update((m) => ({ ...m, [editingId]: true }));
      const request: ScheduleItemRequest = { eventId: event.id, label, time };
      this.scheduleService.update(editingId, request).subscribe({
        next: (updated) => {
          this.scheduleSaving.update((m) => ({ ...m, [editingId]: false }));
          this.replaceScheduleItem(updated);
          this.cancelScheduleEdit();
          this.scheduleFeedback.set('Zeitpunkt gespeichert.');
        },
        error: () => {
          this.scheduleSaving.update((m) => ({ ...m, [editingId]: false }));
          this.scheduleError.set('Zeitpunkt konnte nicht gespeichert werden.');
        },
      });
      return;
    }
    this.scheduleSaving.update((m) => ({ ...m, [-1]: true }));
    const request: ScheduleItemRequest = { eventId: event.id, label, time };
    this.scheduleService.create(request).subscribe({
      next: (created) => {
        this.scheduleSaving.update((m) => {
          const { [-1]: _remove, ...rest } = m;
          return rest;
        });
        this.scheduleItems.update((list) => [...list, created].sort((a, b) => a.time.localeCompare(b.time)));
        this.cancelScheduleEdit();
        this.scheduleFeedback.set('Zeitpunkt hinzugefügt.');
      },
      error: () => {
        this.scheduleSaving.update((m) => {
          const { [-1]: _remove, ...rest } = m;
          return rest;
        });
        this.scheduleError.set('Zeitpunkt konnte nicht hinzugefügt werden.');
      },
    });
  }

  private replaceScheduleItem(updated: ScheduleItem): void {
    this.scheduleItems.update((list) =>
      list.map((i) => (i.id === updated.id ? updated : i)).sort((a, b) => a.time.localeCompare(b.time)),
    );
  }

  protected requestRemoveSchedule(item: ScheduleItem): void {
    this.scheduleSaving.update((m) => ({ ...m, [item.id]: true }));
    this.scheduleService.remove(item.id).subscribe({
      next: () => {
        this.scheduleSaving.update((m) => {
          const { [item.id]: _remove, ...rest } = m;
          return rest;
        });
        this.scheduleItems.update((list) => list.filter((i) => i.id !== item.id));
        this.scheduleFeedback.set('Zeitpunkt entfernt.');
      },
      error: () => {
        this.scheduleSaving.update((m) => ({ ...m, [item.id]: false }));
        this.scheduleError.set('Zeitpunkt konnte nicht entfernt werden.');
      },
    });
  }

  private loadLocations(eventId: number): void {
    this.locationsLoading.set(true);
    this.locationsError.set(null);
    this.locationService.loadForEvent(eventId).subscribe({
      next: (locations) => {
        this.locations.set(locations);
        this.locationsLoading.set(false);
      },
      error: () => {
        this.locationsLoading.set(false);
        this.locationsError.set('Orte konnten nicht geladen werden.');
      },
    });
  }

  protected locationTypeLabel(type: LocationType): string {
    return LOCATION_TYPES.find((t) => t.value === type)?.label ?? type;
  }

  protected mapsLink(location: EventLocation): string {
    const custom = location.mapsUrl?.trim();
    if (custom) {
      return custom;
    }
    const query = `${location.name}, ${location.address}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  /**
   * Exports the current event as an .ics file. The end time (if any) is
   * derived from the latest "Ablauf"-entry, the venue from the VENUE
   * location, and the description contains the setlist for concerts.
   */
  protected requestDelete(): void {
    this.deleteError.set(null);
    this.confirmingDelete.set(true);
  }

  protected cancelDelete(): void {
    this.confirmingDelete.set(false);
  }

  protected confirmDelete(): void {
    const current = this.event();
    if (!current) {
      return;
    }
    this.deleting.set(true);
    this.deleteError.set(null);
    this.eventService.deleteEvent(current.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmingDelete.set(false);
        this.router.navigate(['/']);
      },
      error: () => {
        this.deleting.set(false);
        this.confirmingDelete.set(false);
        this.deleteError.set('Termin konnte nicht gelöscht werden.');
      },
    });
  }

  protected exportToCalendar(): void {
    const event = this.event();
    if (!event) {
      return;
    }
    const start = new Date(event.dateTime);

    const latest = [...this.scheduleItems()]
      .sort((a, b) => a.time.localeCompare(b.time))
      .at(-1);
    let end: Date | undefined;
    if (latest) {
      const [hours, minutes] = latest.time.split(':').map(Number);
      const candidate = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate(),
        hours,
        minutes,
      );
      if (candidate.getTime() > start.getTime()) {
        end = candidate;
      }
    }

    const venue = this.locations().find((l) => l.type === 'VENUE') ?? this.locations()[0];
    const location = venue ? `${venue.name}, ${venue.address}` : undefined;

    const setlist = [...this.entries()]
      .sort((a, b) => a.position - b.position)
      .map((e) => e.pieceTitle);
    const setlistDescription = setlist.length
      ? `Setlist: ${setlist.join(' → ')}`
      : undefined;

    const ical = eventToIcal(event, { end, location, description: setlistDescription });
    downloadIcs(buildIcs([ical]), eventFilename(event));
  }

  protected toggleLocationForm(): void {
    if (this.locationFormOpen()) {
      this.locationFormOpen.set(false);
      this.editingLocationId.set(null);
      this.resetLocationForm();
      return;
    }
    this.resetLocationForm();
    this.locationFormOpen.set(true);
  }

  protected startEditLocation(location: EventLocation): void {
    this.editingLocationId.set(location.id);
    this.locationType.set(location.type);
    this.locationName.set(location.name);
    this.locationAddress.set(location.address);
    this.locationNote.set(location.note ?? '');
    this.locationPhone.set(location.phone ?? '');
    this.locationMapsUrl.set(location.mapsUrl ?? '');
    this.locationFormOpen.set(true);
  }

  protected cancelLocationEdit(): void {
    this.locationFormOpen.set(false);
    this.editingLocationId.set(null);
    this.resetLocationForm();
  }

  private resetLocationForm(): void {
    this.locationType.set('');
    this.locationName.set('');
    this.locationAddress.set('');
    this.locationNote.set('');
    this.locationPhone.set('');
    this.locationMapsUrl.set('');
    this.locationsError.set(null);
  }

  protected onLocationTypeChange(value: LocationType): void {
    this.locationType.set(value);
  }

  protected onLocationName(event: Event): void {
    this.locationName.set((event.target as HTMLInputElement).value);
  }

  protected onLocationAddress(event: Event): void {
    this.locationAddress.set((event.target as HTMLInputElement).value);
  }

  protected onLocationNote(event: Event): void {
    this.locationNote.set((event.target as HTMLInputElement).value);
  }

  protected onLocationPhone(event: Event): void {
    this.locationPhone.set((event.target as HTMLInputElement).value);
  }

  protected onLocationMapsUrl(event: Event): void {
    this.locationMapsUrl.set((event.target as HTMLInputElement).value);
  }

  protected saveLocation(): void {
    const event = this.event();
    if (!event || !this.canSaveLocation()) {
      return;
    }
    const request: LocationRequest = {
      eventId: event.id,
      type: this.locationType() as LocationType,
      name: this.locationName().trim(),
      address: this.locationAddress().trim(),
      note: this.locationNote().trim() || null,
      phone: this.locationPhone().trim() || null,
      mapsUrl: this.locationMapsUrl().trim() || null,
    };
    const editingId = this.editingLocationId();
    this.locationsError.set(null);
    this.locationsFeedback.set(null);
    if (editingId != null) {
      this.locationsSaving.update((m) => ({ ...m, [editingId]: true }));
      this.locationService.update(editingId, request).subscribe({
        next: (updated) => {
          this.locationsSaving.update((m) => ({ ...m, [editingId]: false }));
          this.locations.update((list) =>
            list.map((l) => (l.id === updated.id ? updated : l)),
          );
          this.cancelLocationEdit();
          this.locationsFeedback.set('Ort gespeichert.');
        },
        error: () => {
          this.locationsSaving.update((m) => ({ ...m, [editingId]: false }));
          this.locationsError.set('Ort konnte nicht gespeichert werden.');
        },
      });
      return;
    }
    this.locationsSaving.update((m) => ({ ...m, [-1]: true }));
    this.locationService.create(request).subscribe({
      next: (created) => {
        this.locationsSaving.update((m) => {
          const { [-1]: _remove, ...rest } = m;
          return rest;
        });
        this.locations.update((list) => [...list, created]);
        this.cancelLocationEdit();
        this.locationsFeedback.set('Ort hinzugefügt.');
      },
      error: () => {
        this.locationsSaving.update((m) => {
          const { [-1]: _remove, ...rest } = m;
          return rest;
        });
        this.locationsError.set('Ort konnte nicht hinzugefügt werden.');
      },
    });
  }

  protected requestRemoveLocation(location: EventLocation): void {
    this.confirmingLocationRemoval.update((m) => ({ ...m, [location.id]: true }));
  }

  protected cancelRemoveLocation(location: EventLocation): void {
    this.confirmingLocationRemoval.update((m) => ({ ...m, [location.id]: false }));
  }

  protected confirmRemoveLocation(location: EventLocation): void {
    this.locationsSaving.update((m) => ({ ...m, [location.id]: true }));
    this.locationsError.set(null);
    this.locationsFeedback.set(null);
    this.locationService.remove(location.id).subscribe({
      next: () => {
        this.locations.update((list) => list.filter((l) => l.id !== location.id));
        this.locationsSaving.update((m) => ({ ...m, [location.id]: false }));
        this.confirmingLocationRemoval.update((m) => ({ ...m, [location.id]: false }));
        this.locationsFeedback.set('Ort entfernt.');
      },
      error: () => {
        this.locationsSaving.update((m) => ({ ...m, [location.id]: false }));
        this.confirmingLocationRemoval.update((m) => ({ ...m, [location.id]: false }));
        this.locationsError.set('Ort konnte nicht entfernt werden.');
      },
    });
  }

  protected toggleRequirementState(
    requirement: EquipmentRequirement,
    field: 'availableOnSite' | 'needsToBeBrought',
  ): void {
    const current = requirement[field];
    const next: RequirementState = current === 'YES' ? 'NO' : current === 'NO' ? 'YES' : 'YES';
    this.saveRequirement(requirement, { [field]: next });
  }

  protected setResponsible(requirement: EquipmentRequirement, musicianId: number | null): void {
    this.saveRequirement(requirement, { responsibleMusicianId: musicianId });
  }

  private saveRequirement(
    requirement: EquipmentRequirement,
    patch: Partial<{
      availableOnSite: RequirementState;
      needsToBeBrought: RequirementState;
      responsibleMusicianId: number | null;
    }>,
  ): void {
    this.requirementsSaving.update((m) => ({ ...m, [requirement.id]: true }));
    this.requirementsError.set(null);
    this.requirementsFeedback.set(null);
    const previous = { ...requirement };
    this.requirements.update((list) =>
      list.map((r) => (r.id === requirement.id ? { ...r, ...patch } : r)),
    );
    const request: EquipmentRequirementRequest = {
      eventId: requirement.eventId,
      equipmentId: requirement.equipmentId,
      availableOnSite: 'availableOnSite' in patch ? (patch.availableOnSite as RequirementState) : requirement.availableOnSite,
      needsToBeBrought: 'needsToBeBrought' in patch ? (patch.needsToBeBrought as RequirementState) : requirement.needsToBeBrought,
      responsibleMusicianId: patch.responsibleMusicianId !== undefined
        ? (patch.responsibleMusicianId as number | null)
        : (requirement.responsibleMusicianId ?? null),
    };
    this.equipmentRequirementService.update(requirement.id, request).subscribe({
      next: (updated) => {
        this.requirementsSaving.update((m) => ({ ...m, [requirement.id]: false }));
        this.requirements.update((list) => list.map((r) => (r.id === updated.id ? updated : r)));
        this.requirementsFeedback.set('Equipment gespeichert.');
      },
      error: () => {
        this.requirementsSaving.update((m) => ({ ...m, [requirement.id]: false }));
        this.requirements.update((list) => list.map((r) => (r.id === previous.id ? previous : r)));
        this.requirementsError.set('Änderung konnte nicht gespeichert werden.');
      },
    });
  }

  protected requestRemoveRequirement(requirement: EquipmentRequirement): void {
    this.confirmingRequirementRemoval.update((m) => ({ ...m, [requirement.id]: true }));
  }

  protected cancelRemoveRequirement(requirement: EquipmentRequirement): void {
    this.confirmingRequirementRemoval.update((m) => ({ ...m, [requirement.id]: false }));
  }

  protected confirmRemoveRequirement(requirement: EquipmentRequirement): void {
    this.requirementsSaving.update((m) => ({ ...m, [requirement.id]: true }));
    this.requirementsError.set(null);
    this.requirementsFeedback.set(null);
    this.equipmentRequirementService.remove(requirement.id).subscribe({
      next: () => {
        this.requirements.update((list) => list.filter((r) => r.id !== requirement.id));
        this.requirementsSaving.update((m) => ({ ...m, [requirement.id]: false }));
        this.confirmingRequirementRemoval.update((m) => ({ ...m, [requirement.id]: false }));
        this.requirementsFeedback.set('Equipment entfernt.');
      },
      error: () => {
        this.requirementsSaving.update((m) => ({ ...m, [requirement.id]: false }));
        this.confirmingRequirementRemoval.update((m) => ({ ...m, [requirement.id]: false }));
        this.requirementsError.set('Equipment konnte nicht entfernt werden.');
      },
    });
  }

  protected toggleEquipmentPicker(): void {
    if (this.equipmentPickerOpen()) {
      this.equipmentPickerOpen.set(false);
      this.newEquipmentOpen.set(false);
      return;
    }
    this.equipmentPickerOpen.set(true);
    if (this.equipmentCatalog().length === 0) {
      this.loadEquipmentCatalog();
    }
  }

  private loadEquipmentCatalog(): void {
    this.equipmentCatalogLoading.set(true);
    this.equipmentService.loadEquipment().subscribe({
      next: (equipment) => {
        this.equipmentCatalog.set(equipment);
        this.equipmentCatalogLoading.set(false);
      },
      error: () => {
        this.equipmentCatalogLoading.set(false);
        this.requirementsError.set('Equipment-Katalog konnte nicht geladen werden.');
      },
    });
  }

  protected toggleNewEquipment(): void {
    this.newEquipmentOpen.update((open) => !open);
  }

  protected addExistingEquipment(equipment: Equipment): void {
    const event = this.event();
    if (!event) {
      return;
    }
    this.addingEquipment.update((m) => ({ ...m, [equipment.id]: true }));
    this.requirementsError.set(null);
    this.requirementsFeedback.set(null);
    const request: EquipmentRequirementRequest = {
      eventId: event.id,
      equipmentId: equipment.id,
      availableOnSite: 'UNKNOWN',
      needsToBeBrought: 'UNKNOWN',
      responsibleMusicianId: null,
    };
    this.equipmentRequirementService.create(request).subscribe({
      next: (created) => {
        this.addingEquipment.update((m) => ({ ...m, [equipment.id]: false }));
        this.requirements.update((list) => [...list, created]);
        this.equipmentPickerOpen.set(false);
        this.requirementsFeedback.set('Equipment hinzugefügt.');
      },
      error: () => {
        this.addingEquipment.update((m) => ({ ...m, [equipment.id]: false }));
        this.requirementsError.set('Equipment konnte nicht hinzugefügt werden.');
      },
    });
  }

  protected addNewEquipment(): void {
    const event = this.event();
    const name = this.newEquipmentName().trim();
    if (!event || !name || this.newEquipmentSaving()) {
      return;
    }
    this.newEquipmentSaving.set(true);
    this.requirementsError.set(null);
    this.requirementsFeedback.set(null);
    const category = this.newEquipmentCategory().trim() || undefined;
    this.equipmentService.createEquipment({ name, category }).subscribe({
      next: (equipment) => {
        const request: EquipmentRequirementRequest = {
          eventId: event.id,
          equipmentId: equipment.id,
          availableOnSite: 'UNKNOWN',
          needsToBeBrought: 'UNKNOWN',
          responsibleMusicianId: null,
        };
        this.equipmentRequirementService.create(request).subscribe({
          next: (created) => {
            this.newEquipmentSaving.set(false);
            this.equipmentCatalog.update((list) => [...list, equipment]);
            this.requirements.update((list) => [...list, created]);
            this.newEquipmentName.set('');
            this.newEquipmentCategory.set('');
            this.newEquipmentOpen.set(false);
            this.equipmentPickerOpen.set(false);
            this.requirementsFeedback.set('Equipment angelegt und hinzugefügt.');
          },
          error: () => {
            this.newEquipmentSaving.set(false);
            this.equipmentCatalog.update((list) => [...list, equipment]);
            this.requirementsError.set('Equipment angelegt, aber nicht zugeordnet.');
          },
        });
      },
      error: () => {
        this.newEquipmentSaving.set(false);
        this.requirementsError.set('Equipment konnte nicht angelegt werden.');
      },
    });
  }

  protected onNewEquipmentName(event: Event): void {
    this.newEquipmentName.set((event.target as HTMLInputElement).value);
  }

  protected onNewEquipmentCategory(event: Event): void {
    this.newEquipmentCategory.set((event.target as HTMLInputElement).value);
  }

  protected loadRehearsals(concertId: number): void {
    this.rehearsalsLoading.set(true);
    this.rehearsalsError.set(null);
    this.eventService.loadRehearsalsForConcert(concertId).subscribe({
      next: (rehearsals) => {
        this.rehearsals.set(rehearsals);
        this.rehearsalsLoading.set(false);
      },
      error: () => {
        this.rehearsalsLoading.set(false);
        this.rehearsalsError.set('Proben konnten nicht geladen werden.');
      },
    });
  }

  protected toggleRehearsalPicker(): void {
    if (this.rehearsalPickerOpen()) {
      this.rehearsalPickerOpen.set(false);
      this.newRehearsalOpen.set(false);
      return;
    }
    this.rehearsalPickerOpen.set(true);
    if (this.allRehearsals().length === 0) {
      this.loadAllRehearsals();
    }
  }

  private loadAllRehearsals(): void {
    this.allRehearsalsLoading.set(true);
    this.eventService.loadEvents().subscribe({
      next: (events) => {
        this.allRehearsals.set(events.filter((e) => e.type === 'REHEARSAL'));
        this.allRehearsalsLoading.set(false);
      },
      error: () => {
        this.allRehearsalsLoading.set(false);
        this.rehearsalsError.set('Proben konnten nicht geladen werden.');
      },
    });
  }

  protected toggleNewRehearsal(): void {
    this.newRehearsalOpen.update((open) => !open);
  }

  protected addExistingRehearsal(rehearsal: EventItem): void {
    const event = this.event();
    if (!event) {
      return;
    }
    this.assigningRehearsal.update((m) => ({ ...m, [rehearsal.id]: true }));
    this.rehearsalsError.set(null);
    this.rehearsalsFeedback.set(null);
    const request: EventRequest = {
      title: rehearsal.title,
      dateTime: rehearsal.dateTime,
      type: 'REHEARSAL',
      bandId: rehearsal.bandId ?? event.bandId ?? 0,
      concertId: event.id,
    };
    this.eventService.updateEvent(rehearsal.id, request).subscribe({
      next: (updated) => {
        this.assigningRehearsal.update((m) => ({ ...m, [rehearsal.id]: false }));
        this.rehearsals.update((list) =>
          [...list, updated].sort(
            (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
          ),
        );
        this.allRehearsals.update((list) => list.filter((r) => r.id !== updated.id));
        this.rehearsalPickerOpen.set(false);
        this.rehearsalsFeedback.set('Probe zugeordnet.');
      },
      error: () => {
        this.assigningRehearsal.update((m) => ({ ...m, [rehearsal.id]: false }));
        this.rehearsalsError.set('Probe konnte nicht zugeordnet werden.');
      },
    });
  }

  protected createRehearsal(): void {
    const event = this.event();
    if (!event || !this.canAddNewRehearsal()) {
      return;
    }
    this.newRehearsalSaving.set(true);
    this.rehearsalsError.set(null);
    this.rehearsalsFeedback.set(null);
    const dateTime = `${this.newRehearsalDate()}T${this.newRehearsalTime()}`;
    const request: EventRequest = {
      title: this.newRehearsalTitle().trim(),
      dateTime,
      type: 'REHEARSAL',
      bandId: event.bandId ?? 0,
      concertId: event.id,
    };
    this.eventService.createEvent(request).subscribe({
      next: (created) => {
        this.newRehearsalSaving.set(false);
        this.rehearsals.update((list) =>
          [...list, created].sort(
            (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
          ),
        );
        this.allRehearsals.update((list) => [...list, created]);
        this.newRehearsalTitle.set('');
        this.newRehearsalDate.set('');
        this.newRehearsalTime.set('');
        this.newRehearsalOpen.set(false);
        this.rehearsalPickerOpen.set(false);
        this.rehearsalsFeedback.set('Probe angelegt und zugeordnet.');
      },
      error: () => {
        this.newRehearsalSaving.set(false);
        this.rehearsalsError.set('Probe konnte nicht angelegt werden.');
      },
    });
  }

  protected requestUnlinkRehearsal(rehearsal: EventItem): void {
    this.confirmingRehearsalUnlink.update((m) => ({ ...m, [rehearsal.id]: true }));
  }

  protected cancelUnlinkRehearsal(rehearsal: EventItem): void {
    this.confirmingRehearsalUnlink.update((m) => ({ ...m, [rehearsal.id]: false }));
  }

  protected confirmUnlinkRehearsal(rehearsal: EventItem): void {
    const event = this.event();
    if (!event) {
      return;
    }
    this.rehearsalsSaving.update((m) => ({ ...m, [rehearsal.id]: true }));
    this.rehearsalsError.set(null);
    this.rehearsalsFeedback.set(null);
    const request: EventRequest = {
      title: rehearsal.title,
      dateTime: rehearsal.dateTime,
      type: 'REHEARSAL',
      bandId: rehearsal.bandId ?? event.bandId ?? 0,
      concertId: null,
    };
    this.eventService.updateEvent(rehearsal.id, request).subscribe({
      next: (updated) => {
        this.rehearsalsSaving.update((m) => ({ ...m, [rehearsal.id]: false }));
        this.confirmingRehearsalUnlink.update((m) => ({ ...m, [rehearsal.id]: false }));
        this.rehearsals.update((list) => list.filter((r) => r.id !== updated.id));
        this.allRehearsals.update((list) => [...list, updated]);
        this.rehearsalsFeedback.set('Probe vom Gig gelöst.');
      },
      error: () => {
        this.rehearsalsSaving.update((m) => ({ ...m, [rehearsal.id]: false }));
        this.confirmingRehearsalUnlink.update((m) => ({ ...m, [rehearsal.id]: false }));
        this.rehearsalsError.set('Probe konnte nicht gelöst werden.');
      },
    });
  }

  protected onNewRehearsalTitle(event: Event): void {
    this.newRehearsalTitle.set((event.target as HTMLInputElement).value);
  }

  protected onNewRehearsalDate(event: Event): void {
    this.newRehearsalDate.set((event.target as HTMLInputElement).value);
  }

  protected onNewRehearsalTime(event: Event): void {
    this.newRehearsalTime.set((event.target as HTMLInputElement).value);
  }

  private loadSetlist(eventId: number): void {
    this.setlistLoading.set(true);
    this.setlistError.set(null);
    this.setlistService
      .getOrCreateForEvent(eventId)
      .pipe(
        tap((setlist) => this.setlistId.set(setlist.id)),
        switchMap((setlist) => this.setlistService.loadEntries(setlist.id)),
      )
      .subscribe({
        next: (entries) => {
          this.entries.set(entries);
          this.setlistLoading.set(false);
        },
        error: () => {
          this.setlistLoading.set(false);
          this.setlistError.set('Setlist konnte nicht geladen werden.');
        },
      });
  }

  protected addPiece(): void {
    const setlistId = this.setlistId();
    const title = this.newTitle().trim();
    if (setlistId == null || !title || this.adding()) {
      return;
    }
    this.adding.set(true);
    this.setlistService
      .addPieceToSetlist(setlistId, title, this.entries().length)
      .subscribe({
        next: (entry) => {
          this.entries.update((list) => [...list, entry]);
          this.newTitle.set('');
          this.adding.set(false);
        },
        error: () => {
          this.adding.set(false);
          this.setlistError.set('Stück konnte nicht hinzugefügt werden.');
        },
      });
  }

  protected onTitleInput(event: Event): void {
    this.newTitle.set((event.target as HTMLInputElement).value);
  }

  protected onTitleEnter(event: Event): void {
    event.preventDefault();
    this.addPiece();
  }

  protected removeEntry(entryId: number): void {
    this.setlistService.removeEntry(entryId).subscribe({
      next: () => this.entries.update((list) => list.filter((e) => e.id !== entryId)),
      error: () => this.setlistError.set('Stück konnte nicht entfernt werden.'),
    });
  }

  protected selectSheetPdf(entry: SetlistEntry): void {
    this.pendingPdfPieceId.set(entry.pieceId);
    this.sheetError.set(null);
    this.sheetFeedback.set(null);
    this.pdfInputRef?.nativeElement.click();
  }

  protected onSheetFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const pieceId = this.pendingPdfPieceId();
    input.value = '';
    this.pendingPdfPieceId.set(null);
    if (!pieceId || !file) {
      return;
    }
    this.sheetUploading.update((m) => ({ ...m, [pieceId]: true }));
    this.sheetError.set(null);
    this.sheetFeedback.set(null);
    this.setlistService.uploadSheetPdf(pieceId, file).subscribe({
      next: (piece) => {
        this.sheetUploading.update((m) => ({ ...m, [pieceId]: false }));
        this.entries.update((list) =>
          list.map((e) => (e.pieceId === pieceId ? { ...e, hasSheetPdf: piece.hasSheetPdf } : e)),
        );
        this.sheetFeedback.set('Noten hochgeladen.');
      },
      error: () => {
        this.sheetUploading.update((m) => ({ ...m, [pieceId]: false }));
        this.sheetError.set('Noten konnten nicht hochgeladen werden.');
      },
    });
  }

  protected openSheetPdf(entry: SetlistEntry): void {
    this.sheetError.set(null);
    this.sheetFeedback.set(null);
    this.setlistService.downloadSheetPdf(entry.pieceId).subscribe({
      next: (blob) => {
        this.sheetFile.set(new File([blob], `${entry.pieceTitle}.pdf`, { type: 'application/pdf' }));
        this.openSheetTitle.set(entry.pieceTitle);
      },
      error: () => this.sheetError.set('Noten konnten nicht geöffnet werden.'),
    });
  }

  protected closeSheet(): void {
    this.sheetFile.set(null);
    this.openSheetTitle.set(null);
  }

  protected removeSheetPdf(entry: SetlistEntry): void {
    this.sheetUploading.update((m) => ({ ...m, [entry.pieceId]: true }));
    this.sheetError.set(null);
    this.sheetFeedback.set(null);
    this.setlistService.removeSheetPdf(entry.pieceId).subscribe({
      next: () => {
        this.sheetUploading.update((m) => ({ ...m, [entry.pieceId]: false }));
        this.entries.update((list) =>
          list.map((e) => (e.pieceId === entry.pieceId ? { ...e, hasSheetPdf: false } : e)),
        );
        this.sheetFeedback.set('Noten entfernt.');
      },
      error: () => {
        this.sheetUploading.update((m) => ({ ...m, [entry.pieceId]: false }));
        this.sheetError.set('Noten konnten nicht entfernt werden.');
      },
    });
  }

  protected toggleDemo(entry: SetlistEntry): void {
    const current = this.demoPlaying();
    if (current?.pieceId === entry.pieceId) {
      this.stopDemo();
      return;
    }
    this.stopDemo();
    this.mediaError.set(null);
    this.mediaFeedback.set(null);
    this.setlistService.downloadDemoAudio(entry.pieceId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.demoPlaying.set({ pieceId: entry.pieceId, title: entry.pieceTitle, url });
      },
      error: () => this.mediaError.set('Demo konnte nicht geladen werden.'),
    });
  }

  protected stopDemo(): void {
    const current = this.demoPlaying();
    if (current) {
      URL.revokeObjectURL(current.url);
      this.demoPlaying.set(null);
    }
  }

  protected selectDemoAudio(entry: SetlistEntry): void {
    this.pendingAudioPieceId.set(entry.pieceId);
    this.mediaError.set(null);
    this.mediaFeedback.set(null);
    this.audioInputRef?.nativeElement.click();
  }

  protected onAudioFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const pieceId = this.pendingAudioPieceId();
    input.value = '';
    this.pendingAudioPieceId.set(null);
    if (!pieceId || !file) {
      return;
    }
    this.mediaUploading.update((m) => ({ ...m, [pieceId]: true }));
    this.mediaError.set(null);
    this.mediaFeedback.set(null);
    this.setlistService.uploadDemoAudio(pieceId, file).subscribe({
      next: (piece) => {
        this.mediaUploading.update((m) => ({ ...m, [pieceId]: false }));
        this.entries.update((list) =>
          list.map((e) => (e.pieceId === pieceId ? { ...e, hasDemoAudio: piece.hasDemoAudio } : e)),
        );
        this.mediaFeedback.set('Demo hochgeladen.');
      },
      error: () => {
        this.mediaUploading.update((m) => ({ ...m, [pieceId]: false }));
        this.mediaError.set('Demo konnte nicht hochgeladen werden.');
      },
    });
  }

  protected removeDemoAudio(entry: SetlistEntry): void {
    const current = this.demoPlaying();
    if (current?.pieceId === entry.pieceId) {
      this.stopDemo();
    }
    this.mediaUploading.update((m) => ({ ...m, [entry.pieceId]: true }));
    this.mediaError.set(null);
    this.mediaFeedback.set(null);
    this.setlistService.removeDemoAudio(entry.pieceId).subscribe({
      next: () => {
        this.mediaUploading.update((m) => ({ ...m, [entry.pieceId]: false }));
        this.entries.update((list) =>
          list.map((e) => (e.pieceId === entry.pieceId ? { ...e, hasDemoAudio: false } : e)),
        );
        this.mediaFeedback.set('Demo entfernt.');
      },
      error: () => {
        this.mediaUploading.update((m) => ({ ...m, [entry.pieceId]: false }));
        this.mediaError.set('Demo konnte nicht entfernt werden.');
      },
    });
  }

  protected openYoutube(entry: SetlistEntry): void {
    if (entry.youtubeUrl) {
      window.open(entry.youtubeUrl, '_blank', 'noopener,noreferrer');
    }
  }

  protected editYoutube(entry: SetlistEntry): void {
    this.youtubeDraft.update((d) => ({ ...d, [entry.pieceId]: entry.youtubeUrl ?? '' }));
    this.youtubeEditing.update((e) => ({ ...e, [entry.pieceId]: true }));
    this.mediaError.set(null);
    this.mediaFeedback.set(null);
  }

  protected onYoutubeDraftInput(entry: SetlistEntry, event: Event): void {
    this.youtubeDraft.update((d) => ({ ...d, [entry.pieceId]: (event.target as HTMLInputElement).value }));
  }

  protected cancelYoutubeEdit(entry: SetlistEntry): void {
    const nextDraft = { ...this.youtubeDraft() };
    delete nextDraft[entry.pieceId];
    this.youtubeDraft.set(nextDraft);
    const nextEditing = { ...this.youtubeEditing() };
    delete nextEditing[entry.pieceId];
    this.youtubeEditing.set(nextEditing);
  }

  protected saveYoutube(entry: SetlistEntry): void {
    const url = (this.youtubeDraft()[entry.pieceId] ?? '').trim() || null;
    this.mediaUploading.update((m) => ({ ...m, [entry.pieceId]: true }));
    this.mediaError.set(null);
    this.mediaFeedback.set(null);
    this.setlistService.setYoutubeUrl(entry.pieceId, url).subscribe({
      next: (piece) => {
        this.mediaUploading.update((m) => ({ ...m, [entry.pieceId]: false }));
        this.entries.update((list) =>
          list.map((e) => (e.pieceId === entry.pieceId ? { ...e, youtubeUrl: piece.youtubeUrl ?? null } : e)),
        );
        this.cancelYoutubeEdit(entry);
        this.mediaFeedback.set(url ? 'YouTube-Link gespeichert.' : 'YouTube-Link entfernt.');
      },
      error: () => {
        this.mediaUploading.update((m) => ({ ...m, [entry.pieceId]: false }));
        this.mediaError.set('YouTube-Link konnte nicht gespeichert werden.');
      },
    });
  }

  protected removeYoutube(entry: SetlistEntry): void {
    this.youtubeDraft.update((d) => ({ ...d, [entry.pieceId]: '' }));
    this.saveYoutube(entry);
  }

  protected moveEntry(index: number, delta: -1 | 1): void {
    const entries = this.entries();
    const target = index + delta;
    if (target < 0 || target >= entries.length) {
      return;
    }
    const next = [...entries];
    [next[index], next[target]] = [next[target], next[index]];
    this.applyOrder(next);
  }

  protected onDrop(event: CdkDragDrop<SetlistEntry[]>): void {
    const entries = this.entries();
    const { previousIndex, currentIndex } = event;
    if (previousIndex === currentIndex || entries.length === 0) {
      return;
    }
    const next = [...entries];
    const [moved] = next.splice(previousIndex, 1);
    next.splice(currentIndex, 0, moved);
    this.applyOrder(next);
  }

  private applyOrder(next: SetlistEntry[]): void {
    const setlistId = this.setlistId();
    if (setlistId == null) {
      return;
    }
    const previous = this.entries();
    const normalized = next.map((entry, index) => ({ ...entry, position: index }));
    this.entries.set(normalized);
    const updates = next
      .map((entry, index) => ({ entry, desired: index }))
      .filter(({ entry, desired }) => entry.position !== desired)
      .map(({ entry, desired }) =>
        this.setlistService.setEntryPosition(
          entry.id,
          setlistId,
          entry.pieceId,
          desired,
        ),
      );
    if (updates.length === 0) {
      return;
    }
    forkJoin(updates).subscribe({
      error: () => {
        this.entries.set(previous);
        this.setlistError.set('Reihenfolge konnte nicht gespeichert werden.');
      },
    });
  }

  protected typeLabel = typeLabel;

  protected formatDate = formatDate;

  protected formatTime = formatTime;

  protected formatTimeOnly = formatTimeOnly;
}

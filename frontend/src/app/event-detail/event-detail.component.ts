import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, filter, map, switchMap, tap } from 'rxjs';

import { formatDate, formatTime, typeLabel } from '../event-format';
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

interface PanelMeta {
  title: string;
  description?: string;
}

const PANEL_ORDER_DEFAULT = ['members', 'setlist', 'rehearsals', 'equipment', 'schedule'];

const PANEL_META: Record<string, PanelMeta> = {
  members: { title: 'Musiker / Zusagen' },
  setlist: { title: 'Setlist' },
  rehearsals: { title: 'Proben zu diesem Gig' },
  equipment: { title: 'Equipment', description: 'Instrumente & Technik' },
  schedule: { title: 'Ablauf / Zeiten', description: 'Aufbau, Soundcheck, Auftritt, Abbau' },
};

const STATUS_LABELS: Record<ParticipationStatus, string> = {
  INVITED: 'Eingeladen',
  ACCEPTED: 'Zusage',
  DECLINED: 'Abgesagt',
};

@Component({
  selector: 'app-event-detail',
  imports: [RouterLink, DragDropModule],
  templateUrl: './event-detail.component.html',
  styleUrl: './event-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly eventService = inject(EventService);
  private readonly participationService = inject(EventParticipationService);
  private readonly musicianService = inject(MusicianService);
  private readonly setlistService = inject(SetlistService);
  private readonly equipmentService = inject(EquipmentService);
  private readonly equipmentRequirementService = inject(EquipmentRequirementService);
  private readonly scheduleService = inject(ScheduleService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly event = signal<EventItem | null>(null);

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

  protected readonly panelOrder = signal<string[]>(PANEL_ORDER_DEFAULT);
  protected readonly panelCollapsed = signal<Record<string, boolean>>({});
  protected readonly layoutLoading = signal(false);
  protected readonly layoutError = signal<string | null>(null);

  protected readonly setlistLoading = signal(false);
  protected readonly setlistError = signal<string | null>(null);
  protected readonly setlistId = signal<number | null>(null);
  protected readonly entries = signal<SetlistEntry[]>([]);
  protected readonly adding = signal(false);
  protected readonly newTitle = signal('');
  protected readonly canAdd = computed(() => this.adding() || !this.newTitle().trim());

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

  protected readonly scheduleItems = signal<ScheduleItem[]>([]);
  protected readonly scheduleLoading = signal(false);
  protected readonly scheduleError = signal<string | null>(null);
  protected readonly scheduleSaving = signal<Record<number, boolean>>({});
  protected readonly scheduleFeedback = signal<string | null>(null);
  protected readonly scheduleFormOpen = signal(false);
  protected readonly editingScheduleId = signal<number | null>(null);
  protected readonly scheduleLabel = signal('');
  protected readonly scheduleTime = signal('');
  protected readonly canSaveSchedule = computed(
    () => this.scheduleLabel().trim().length > 0 && this.scheduleTime().length > 0,
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
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    const next = [...order];
    const [moved] = next.splice(event.previousIndex, 1);
    next.splice(event.currentIndex, 0, moved);
    this.panelOrder.set(next);
    this.saveLayout();
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
    if (Array.isArray(layout.order) && layout.order.length > 0) {
      this.panelOrder.set(layout.order);
    }
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
    this.scheduleLabel.set('');
    this.scheduleTime.set('');
  }

  protected startEditSchedule(item: ScheduleItem): void {
    this.editingScheduleId.set(item.id);
    this.scheduleLabel.set(item.label);
    this.scheduleTime.set(item.time);
    this.scheduleFormOpen.set(true);
  }

  protected cancelScheduleEdit(): void {
    this.scheduleFormOpen.set(false);
    this.editingScheduleId.set(null);
    this.scheduleLabel.set('');
    this.scheduleTime.set('');
  }

  protected onScheduleLabel(event: Event): void {
    this.scheduleLabel.set((event.target as HTMLInputElement).value);
  }

  protected onScheduleTime(event: Event): void {
    this.scheduleTime.set((event.target as HTMLInputElement).value);
  }

  protected saveScheduleItem(): void {
    const event = this.event();
    if (!event || !this.canSaveSchedule()) {
      return;
    }
    const label = this.scheduleLabel().trim();
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
}

import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import type {
  EventItem,
  EventRequest,
  ParticipationStatus,
} from './event.model';
import { EventParticipationService } from './event-participation.service';
import { EventService, type PanelLayout } from './event.service';
import { EquipmentRequirementService } from '../equipment/equipment.service';
import type { EquipmentRequirementRequest } from '../equipment/equipment.model';
import { LocationService } from '../location/location.service';
import type { LocationRequest } from '../location/location.model';
import { ScheduleService } from '../schedule/schedule.service';
import { SetlistService } from '../setlist/setlist.service';

export interface EventUndoSnapshot {
  eventId: number;
  request: EventRequest;
  layout: PanelLayout | null;
  hasSetlist: boolean;
  participations: { musicianId: number; status: ParticipationStatus }[];
  entries: { pieceId: number; position: number }[];
  scheduleItems: { label: string; time: string }[];
  locations: Omit<LocationRequest, 'eventId'>[];
  requirements: Omit<EquipmentRequirementRequest, 'eventId'>[];
}

@Injectable({ providedIn: 'root' })
export class EventUndoService {
  private readonly eventService = inject(EventService);
  private readonly participationService = inject(EventParticipationService);
  private readonly scheduleService = inject(ScheduleService);
  private readonly locationService = inject(LocationService);
  private readonly equipmentRequirementService = inject(EquipmentRequirementService);
  private readonly setlistService = inject(SetlistService);

  async capture(eventId: number): Promise<EventUndoSnapshot[]> {
    const event = await firstValueFrom(this.eventService.loadEvent(eventId));
    const rehearsals =
      event.type === 'CONCERT'
        ? await firstValueFrom(this.eventService.loadRehearsalsForConcert(event.id))
        : [];

    const events = new Map<number, EventItem>();
    for (const item of [event, ...rehearsals]) {
      events.set(item.id, item);
    }

    return Promise.all([...events.values()].map((item) => this.captureEvent(item)));
  }

  async restore(snapshots: EventUndoSnapshot[]): Promise<Map<number, EventItem>> {
    const restored = new Map<number, EventItem>();
    const capturedIds = new Set(snapshots.map((snapshot) => snapshot.eventId));
    const pending = [...snapshots];

    while (pending.length > 0) {
      const index = pending.findIndex((snapshot) => {
        const concertId = snapshot.request.concertId;
        return (
          concertId == null || !capturedIds.has(concertId) || restored.has(concertId)
        );
      });
      if (index < 0) {
        throw new Error('Termin-Abhängigkeiten konnten nicht wiederhergestellt werden.');
      }

      const [snapshot] = pending.splice(index, 1);
      const oldConcertId = snapshot.request.concertId ?? null;
      const concertId =
        oldConcertId != null && restored.has(oldConcertId)
          ? restored.get(oldConcertId)?.id ?? null
          : oldConcertId;

      const event = await firstValueFrom(
        this.eventService.createEvent({ ...snapshot.request, concertId }),
      );
      restored.set(snapshot.eventId, event);
      await this.restoreDetails(snapshot, event.id);
    }

    return restored;
  }

  private async captureEvent(event: EventItem): Promise<EventUndoSnapshot> {
    const bandId = event.bandId;
    if (bandId == null) {
      throw new Error('Termin ohne Band kann nicht wiederhergestellt werden.');
    }

    const [layout, participations, scheduleItems, locations, requirements, setlist] =
      await Promise.all([
        firstValueFrom(this.eventService.loadPanelLayout(event.id)),
        firstValueFrom(this.participationService.loadForEvent(event.id)),
        firstValueFrom(this.scheduleService.loadForEvent(event.id)),
        firstValueFrom(this.locationService.loadForEvent(event.id)),
        firstValueFrom(this.equipmentRequirementService.loadForEvent(event.id)),
        this.loadSetlist(event.id),
      ]);
    const entries = setlist
      ? await firstValueFrom(this.setlistService.loadEntries(setlist.id))
      : [];

    return {
      eventId: event.id,
      request: {
        title: event.title,
        dateTime: event.dateTime,
        type: event.type,
        bandId,
        concertId: event.concertId ?? null,
      },
      layout: layout.stored ? layout : null,
      hasSetlist: setlist !== null,
      participations: participations.map((participation) => ({
        musicianId: participation.musicianId,
        status: participation.status,
      })),
      entries: entries.map((entry) => ({
        pieceId: entry.pieceId,
        position: entry.position,
      })),
      scheduleItems: scheduleItems.map((item) => ({
        label: item.label,
        time: item.time,
      })),
      locations: locations.map((location) => ({
        type: location.type,
        name: location.name,
        address: location.address,
        note: location.note,
        phone: location.phone,
        mapsUrl: location.mapsUrl,
      })),
      requirements: requirements.map((requirement) => ({
        equipmentId: requirement.equipmentId,
        availableOnSite: requirement.availableOnSite,
        needsToBeBrought: requirement.needsToBeBrought,
        responsibleMusicianId: requirement.responsibleMusicianId ?? null,
      })),
    };
  }

  private async loadSetlist(eventId: number) {
    try {
      return await firstValueFrom(this.setlistService.getByEvent(eventId));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  private async restoreDetails(
    snapshot: EventUndoSnapshot,
    eventId: number,
  ): Promise<void> {
    const tasks: Promise<unknown>[] = [];

    if (snapshot.layout != null) {
      tasks.push(firstValueFrom(this.eventService.savePanelLayout(eventId, snapshot.layout)));
    }
    for (const participation of snapshot.participations) {
      tasks.push(
        firstValueFrom(
          this.participationService.create({
            eventId,
            musicianId: participation.musicianId,
            status: participation.status,
          }),
        ),
      );
    }
    for (const item of snapshot.scheduleItems) {
      tasks.push(
        firstValueFrom(
          this.scheduleService.create({ eventId, label: item.label, time: item.time }),
        ),
      );
    }
    for (const location of snapshot.locations) {
      tasks.push(
        firstValueFrom(this.locationService.create({ eventId, ...location })),
      );
    }
    for (const requirement of snapshot.requirements) {
      tasks.push(
        firstValueFrom(
          this.equipmentRequirementService.create({ eventId, ...requirement }),
        ),
      );
    }

    if (snapshot.hasSetlist) {
      const setlist = await firstValueFrom(
        this.setlistService.getOrCreateForEvent(eventId),
      );
      for (const entry of snapshot.entries) {
        tasks.push(
          firstValueFrom(
            this.setlistService.addEntry({
              setlistId: setlist.id,
              pieceId: entry.pieceId,
              position: entry.position,
            }),
          ),
        );
      }
    }

    await Promise.all(tasks);
  }
}

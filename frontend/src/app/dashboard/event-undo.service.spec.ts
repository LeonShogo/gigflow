import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { EventUndoService } from './event-undo.service';
import type { EventItem } from './event.model';

const CONCERT: EventItem = {
  id: 1,
  title: 'Hafenrocker',
  type: 'CONCERT',
  dateTime: '2026-09-12T20:00:00',
  bandId: 3,
  concertId: null,
};

const REHEARSAL: EventItem = {
  id: 2,
  title: 'Generalprobe',
  type: 'REHEARSAL',
  dateTime: '2026-09-11T18:00:00',
  bandId: 3,
  concertId: 1,
};

const LAYOUT = {
  order: ['members', 'setlist', 'rehearsals', 'equipment', 'locations', 'schedule'],
  collapsed: { schedule: true },
  stored: true,
};

async function tick(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
}

describe('EventUndoService', () => {
  let httpMock: HttpTestingController;
  let service: EventUndoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(EventUndoService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  async function flushCaptureDetails(
    eventId: number,
    setlistId: number | null,
  ): Promise<void> {
    httpMock.expectOne(`/api/events/${eventId}/layout`).flush(LAYOUT);
    httpMock
      .expectOne(`/api/event-participations/event/${eventId}`)
      .flush(
        eventId === 1
          ? [{ id: 11, eventId, musicianId: 7, status: 'ACCEPTED' }]
          : [],
      );
    httpMock
      .expectOne(`/api/schedule-items/event/${eventId}`)
      .flush(eventId === 1 ? [{ id: 12, eventId, label: 'Soundcheck', time: '18:30' }] : []);
    httpMock
      .expectOne(`/api/event-locations/event/${eventId}`)
      .flush(
        eventId === 1
          ? [
              {
                id: 13,
                eventId,
                type: 'VENUE',
                name: 'Klangbar',
                address: 'Hafenstraße 1',
                note: null,
                phone: null,
                mapsUrl: null,
              },
            ]
          : [],
      );
    httpMock
      .expectOne(`/api/equipment-requirements/event/${eventId}`)
      .flush(
        eventId === 1
          ? [
              {
                id: 14,
                eventId,
                equipmentId: 5,
                equipmentName: 'Bassamp',
                availableOnSite: 'YES',
                needsToBeBrought: 'NO',
                responsibleMusicianId: 7,
              },
            ]
          : [],
      );

    const setlist = httpMock.expectOne(`/api/setlists/event/${eventId}`);
    if (setlistId == null) {
      setlist.flush(null, { status: 404, statusText: 'Not Found' });
      return;
    }

    setlist.flush({ id: setlistId, eventId });
    await tick();
    httpMock
      .expectOne(`/api/setlist-entries/by-setlist/${setlistId}`)
      .flush([{ id: 31, setlistId, pieceId: 8, position: 0 }]);
  }

  async function flushRestoreDetails(
    eventId: number,
    setlistId: number | null,
    withDetails = true,
  ): Promise<void> {
    const layout = httpMock.expectOne(`/api/events/${eventId}/layout`);
    expect(layout.request.method).toBe('PUT');
    layout.flush(LAYOUT);
    if (!withDetails) {
      return;
    }

    httpMock.expectOne('/api/event-participations').flush({
      id: 21,
      eventId,
      musicianId: 7,
      status: 'ACCEPTED',
    });
    httpMock.expectOne('/api/schedule-items').flush({
      id: 22,
      eventId,
      label: 'Soundcheck',
      time: '18:30',
    });
    httpMock.expectOne('/api/event-locations').flush({
      id: 23,
      eventId,
      type: 'VENUE',
      name: 'Klangbar',
      address: 'Hafenstraße 1',
    });
    httpMock.expectOne('/api/equipment-requirements').flush({
      id: 24,
      eventId,
      equipmentId: 5,
      equipmentName: 'Bassamp',
    });

    if (setlistId == null) {
      return;
    }

    httpMock
      .expectOne(`/api/setlists/event/${eventId}`)
      .flush(null, { status: 404, statusText: 'Not Found' });
    await tick();
    httpMock.expectOne('/api/setlists').flush({ id: setlistId, eventId });
    await tick();
    httpMock.expectOne('/api/setlist-entries').flush({
      id: 25,
      setlistId,
      pieceId: 8,
      position: 0,
    });
  }

  it('should capture an event with its linked rehearsal and restore both', async () => {
    const capture = service.capture(CONCERT.id);

    httpMock.expectOne('/api/events/1').flush(CONCERT);
    await tick();
    httpMock.expectOne('/api/events/by-concert/1').flush([REHEARSAL]);
    await tick();

    await flushCaptureDetails(1, 10);
    await flushCaptureDetails(2, null);

    const snapshots = await capture;
    expect(snapshots).toHaveLength(2);
    expect(snapshots.find((snapshot) => snapshot.eventId === 1)).toMatchObject({
      request: {
        title: 'Hafenrocker',
        bandId: 3,
        concertId: null,
      },
      hasSetlist: true,
      participations: [{ musicianId: 7, status: 'ACCEPTED' }],
      entries: [{ pieceId: 8, position: 0 }],
      scheduleItems: [{ label: 'Soundcheck', time: '18:30' }],
      locations: [{ type: 'VENUE', name: 'Klangbar' }],
      requirements: [{ equipmentId: 5, responsibleMusicianId: 7 }],
    });

    const restore = service.restore(snapshots);

    const concert = httpMock.expectOne('/api/events');
    expect(concert.request.method).toBe('POST');
    expect(concert.request.body).toMatchObject({
      title: 'Hafenrocker',
      bandId: 3,
      concertId: null,
    });
    concert.flush({ ...CONCERT, id: 100 });
    await tick();

    await flushRestoreDetails(100, 110);
    await tick();
    await tick();

    const rehearsal = httpMock.expectOne('/api/events');
    expect(rehearsal.request.method).toBe('POST');
    expect(rehearsal.request.body).toMatchObject({
      title: 'Generalprobe',
      type: 'REHEARSAL',
      concertId: 100,
    });
    rehearsal.flush({ ...REHEARSAL, id: 101, concertId: 100 });
    await tick();

    await flushRestoreDetails(101, null, false);

    const restored = await restore;
    expect(restored.get(1)?.id).toBe(100);
    expect(restored.get(2)?.id).toBe(101);
    expect(restored.get(2)?.concertId).toBe(100);
  });

  it('should restore an event without setlist data', async () => {
    const restore = service.restore([
      {
        eventId: 4,
        request: {
          title: 'Solo-Probe',
          dateTime: '2026-10-01T17:00:00',
          type: 'REHEARSAL',
          bandId: 3,
          concertId: null,
        },
        layout: null,
        hasSetlist: false,
        participations: [],
        entries: [],
        scheduleItems: [],
        locations: [],
        requirements: [],
      },
    ]);

    const event = httpMock.expectOne('/api/events');
    event.flush({
      id: 40,
      title: 'Solo-Probe',
      type: 'REHEARSAL',
      dateTime: '2026-10-01T17:00:00',
      bandId: 3,
    });

    const restored = await restore;
    expect(restored.get(4)?.id).toBe(40);
    httpMock.expectNone('/api/setlists');
  });
});

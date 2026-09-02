import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { EventPrintComponent } from './event-print.component';
import type { EventItem } from '../dashboard/event.model';

const CONCERT: EventItem = {
  id: 1,
  title: 'Hafenrocker',
  type: 'CONCERT',
  dateTime: '2026-09-12T20:00:00',
  bandName: 'The Dockyarders',
};

const EMPTY_SETLIST = { id: 10, eventId: 1 };

describe('EventPrintComponent', () => {
  let httpMock: HttpTestingController;

  function flushFullData(): void {
    httpMock.expectOne('/api/event-participations/event/1').flush([
      {
        id: 1,
        eventId: 1,
        musicianId: 1,
        status: 'ACCEPTED',
        musician: { id: 1, firstName: 'Ada', lastName: 'Lovelace', instrument: 'Gitarre' },
      },
      {
        id: 2,
        eventId: 1,
        musicianId: 2,
        status: 'INVITED',
        musician: { id: 2, firstName: 'Grace', lastName: 'Hopper', instrument: 'Bass' },
      },
    ]);
    httpMock.expectOne('/api/events/by-concert/1').flush([
      {
        id: 4,
        title: 'Generalprobe',
        type: 'REHEARSAL',
        dateTime: '2026-09-11T18:00:00',
      },
    ]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([
      {
        id: 7,
        eventId: 1,
        equipmentId: 3,
        equipmentName: 'Verstärker',
        category: 'Amp',
        availableOnSite: 'YES',
        needsToBeBrought: 'NO',
        responsibleMusician: { id: 1, firstName: 'Ada', lastName: 'Lovelace' },
      },
    ]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([
      { id: 1, eventId: 1, label: 'Soundcheck', time: '18:00' },
      { id: 2, eventId: 1, label: 'Erstes Set', time: '21:00' },
    ]);
    httpMock.expectOne('/api/event-locations/event/1').flush([
      {
        id: 9,
        eventId: 1,
        type: 'VENUE',
        name: 'Kulturfabrik',
        address: 'Musterstraße 1, 12345 Berlin',
        note: 'Ladestrom hinter der Bühne',
        phone: null,
        mapsUrl: null,
      },
    ]);
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([
      { id: 1, setlistId: 10, pieceId: 1, pieceTitle: 'Ode an die Freude', position: 0 },
    ]);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventPrintComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '1' })) } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should render event header and all filled sections', () => {
    const fixture = TestBed.createComponent(EventPrintComponent);
    const el: HTMLElement = fixture.nativeElement;

    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    flushFullData();
    fixture.detectChanges();

    expect(el.querySelector('.sheet__title')?.textContent).toBe('Hafenrocker');
    expect(el.querySelector('.sheet__chip')?.textContent?.trim()).toBe('Gig');
    expect(el.textContent).toContain('The Dockyarders');
    expect(el.textContent).toContain('Sa, 12. September 2026');
    expect(el.textContent).toContain('20:00 Uhr');

    expect(el.textContent).toContain('Ablauf / Zeiten');
    expect(el.textContent).toContain('Soundcheck');
    expect(el.textContent).toContain('Orte & Logistik');
    expect(el.textContent).toContain('Kulturfabrik');
    expect(el.textContent).toContain('Musiker / Zusagen');
    expect(el.textContent).toContain('1 von 2 bestätigt');
    expect(el.textContent).toContain('Setlist');
    expect(el.textContent).toContain('Equipment');
    expect(el.textContent).toContain('Verstärker');
    expect(el.textContent).toContain('Proben zu diesem Gig');
    expect(el.textContent).toContain('Generalprobe');
  });

  it('should omit sections without data', () => {
    const fixture = TestBed.createComponent(EventPrintComponent);
    const el: HTMLElement = fixture.nativeElement;

    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([]);
    fixture.detectChanges();

    expect(el.querySelector('.sheet__title')?.textContent).toBe('Hafenrocker');
    expect(el.textContent).not.toContain('Ablauf / Zeiten');
    expect(el.textContent).not.toContain('Orte & Logistik');
    expect(el.textContent).not.toContain('Musiker / Zusagen');
    expect(el.textContent).not.toContain('Equipment');
    expect(el.textContent).not.toContain('Proben zu diesem Gig');
    expect(el.querySelector('.sheet')?.textContent).toContain('Keine Setlist hinterlegt.');
  });

  it('should treat a missing setlist as empty', () => {
    const fixture = TestBed.createComponent(EventPrintComponent);
    const el: HTMLElement = fixture.nativeElement;

    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([
      {
        id: 1,
        eventId: 1,
        musicianId: 1,
        status: 'ACCEPTED',
        musician: { id: 1, firstName: 'Ada', lastName: 'Lovelace' },
      },
    ]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(null, {
      status: 404,
      statusText: 'Not Found',
    });
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();

    expect(el.querySelector('.sheet__title')?.textContent).toBe('Hafenrocker');
    expect(el.textContent).toContain('Musiker / Zusagen');
    expect(el.querySelector('.sheet')?.textContent).toContain('Keine Setlist hinterlegt.');
  });

  it('should trigger the browser print dialog', () => {
    const fixture = TestBed.createComponent(EventPrintComponent);
    const el: HTMLElement = fixture.nativeElement;
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);

    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([]);
    fixture.detectChanges();

    (el.querySelector('.toolbar__btn') as HTMLButtonElement).click();
    expect(printSpy).toHaveBeenCalled();
  });

  it('should hide setlist and notes in "Nur Event-Daten" mode', () => {
    const fixture = TestBed.createComponent(EventPrintComponent);
    const el: HTMLElement = fixture.nativeElement;
    const buttons = el.querySelectorAll<HTMLButtonElement>('.seg');
    expect(buttons.length).toBe(2);

    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    flushFullData();
    fixture.detectChanges();

    const sheet = el.querySelector('.sheet') as HTMLElement;
    expect(sheet.textContent).toContain('Ode an die Freude');

    buttons[1].click();
    fixture.detectChanges();

    expect(sheet.textContent).not.toContain('Ode an die Freude');
    expect(sheet.textContent).not.toContain('Notenblätter');
    expect(sheet.textContent).not.toContain('Keine Setlist hinterlegt.');
  });

  it('should show the setlist list by default', () => {
    const fixture = TestBed.createComponent(EventPrintComponent);
    const el: HTMLElement = fixture.nativeElement;

    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    flushFullData();
    fixture.detectChanges();

    expect(el.querySelector('.sheet')?.textContent).toContain('Setlist');
    expect(el.querySelector('.sheet')?.textContent).toContain('Ode an die Freude');
    expect(el.querySelector('.sheet')?.textContent).toContain('Notenblätter');
  });

  it('should render provided demo data without HTTP requests', () => {
    const fixture = TestBed.createComponent(EventPrintComponent);
    const el: HTMLElement = fixture.nativeElement;

    fixture.componentRef.setInput('data', {
      event: CONCERT,
      participations: [
        {
          id: 1,
          eventId: 1,
          musicianId: 1,
          status: 'ACCEPTED',
          musician: { id: 1, firstName: 'Ada', lastName: 'Lovelace', instrument: 'Gitarre' },
        },
      ],
      rehearsals: [
        { id: 4, title: 'Generalprobe', type: 'REHEARSAL', dateTime: '2026-09-11T18:00:00' },
      ],
      entries: [{ id: 1, setlistId: 10, pieceId: 1, pieceTitle: 'Ode an die Freude', position: 0 }],
      requirements: [
        {
          id: 7,
          eventId: 1,
          equipmentId: 3,
          equipmentName: 'Verstärker',
          category: 'Amp',
          availableOnSite: 'YES',
          needsToBeBrought: 'NO',
        },
      ],
      scheduleItems: [{ id: 1, eventId: 1, label: 'Soundcheck', time: '18:00' }],
      locations: [
        {
          id: 9,
          eventId: 1,
          type: 'VENUE',
          name: 'Kulturfabrik',
          address: 'Musterstraße 1',
          note: null,
          phone: null,
          mapsUrl: null,
        },
      ],
    });
    fixture.detectChanges();

    expect(el.querySelector('.sheet__title')?.textContent).toBe('Hafenrocker');
    expect(el.textContent).toContain('Soundcheck');
    expect(el.textContent).toContain('Generalprobe');
    expect(el.textContent).toContain('Ada Lovelace');
  });
});
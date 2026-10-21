import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { EventDetailComponent } from './event-detail.component';
import type { EventItem } from '../dashboard/event.model';
import { AuthService } from '../auth/auth.service';
import { expectNoA11yViolations } from '../testing/expect-no-axe-violations';

const CONCERT: EventItem = {
  id: 1,
  title: 'Hafenrocker',
  type: 'CONCERT',
  dateTime: '2026-09-12T20:00:00',
};

const REHEARSAL: EventItem = {
  id: 1,
  title: 'Donnerstagsprobe',
  type: 'REHEARSAL',
  dateTime: '2026-09-10T18:00:00',
};

const EMPTY_SETLIST = { id: 10, eventId: 1 };

const DEFAULT_LAYOUT = {
  order: ['members', 'setlist', 'rehearsals', 'equipment', 'locations', 'schedule'],
  collapsed: {},
  stored: true,
};

describe('EventDetailComponent', () => {
  let httpMock: HttpTestingController;

  function setup(): ComponentFixture<EventDetailComponent> {
    return TestBed.createComponent(EventDetailComponent);
  }

  /** Loads a CONCERT with no participants, no rehearsals, an empty setlist and the default layout. */
  function loadConcert(fixture: ComponentFixture<EventDetailComponent>): void {
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([])
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();
  }

  /** Flushes a setlist with the given entries and returns the fixture. */
function loadConcertWithEntries(
  fixture: ComponentFixture<EventDetailComponent>,
  entries: unknown[],
): void {
  fixture.detectChanges();
  httpMock.expectOne('/api/events/1').flush(CONCERT);
  fixture.detectChanges();
  httpMock.expectOne('/api/event-participations/event/1').flush([]);
  httpMock.expectOne('/api/events/by-concert/1').flush([]);
  httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
  httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
  httpMock.expectOne('/api/event-locations/event/1').flush([]);
  fixture.detectChanges();
  httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush(entries);
  httpMock.expectOne('/api/equipment-requirements/event/1').flush([])
  httpMock.expectOne('/api/schedule-items/event/1').flush([]);
  fixture.detectChanges();
}

/** Loads a CONCERT with the given locations for the "Orte & Logistik" panel. */
function loadConcertWithLocations(
  fixture: ComponentFixture<EventDetailComponent>,
  locations: unknown[],
): void {
  fixture.detectChanges();
  httpMock.expectOne('/api/events/1').flush(CONCERT);
  fixture.detectChanges();
  httpMock.expectOne('/api/event-participations/event/1').flush([]);
  httpMock.expectOne('/api/events/by-concert/1').flush([]);
  httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
  httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
  httpMock.expectOne('/api/event-locations/event/1').flush(locations);
  fixture.detectChanges();
  httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([]);
  httpMock.expectOne('/api/equipment-requirements/event/1').flush([]);
  httpMock.expectOne('/api/schedule-items/event/1').flush([]);
  fixture.detectChanges();
}

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventDetailComponent],
      providers: [
        provideRouter([]),
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

  it('should load and render a concert with sections', () => {
    const fixture = setup();
    loadConcert(fixture);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.title')?.textContent).toBe('Hafenrocker');
    expect(el.querySelector('.type')?.textContent?.trim()).toBe('Gig');
    const panels = el.querySelectorAll('.panel');
    expect(panels.length).toBe(6);
    expect(el.textContent).toContain('Setlist');
    expect(el.textContent).toContain('Equipment');
  });

  it('has no axe accessibility violations in the loaded state', async () => {
    const fixture = setup();
    loadConcert(fixture);
    await expectNoA11yViolations(fixture.nativeElement);
  });

  it('should render participants with name, instrument, status and opt-in email', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([
      {
        id: 1,
        eventId: 1,
        musicianId: 3,
        musician: {
          id: 3,
          firstName: 'Anna',
          lastName: 'Becker',
          instrument: 'Gesang',
          email: 'anna@example.org',
        },
        status: 'ACCEPTED',
      },
      {
        id: 2,
        eventId: 1,
        musicianId: 4,
        musician: {
          id: 4,
          firstName: 'Jonas',
          lastName: 'Keller',
          instrument: 'Gitarre',
        },
        status: 'INVITED',
      },
    ]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([])
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const members = el.querySelectorAll('.member');
    expect(members.length).toBe(2);

    const first = members[0] as HTMLElement;
    expect(first.textContent).toContain('Anna Becker');
    expect(first.textContent).toContain('Gesang');
    expect(first.textContent).toContain('Zusage');
    // E-Mail nicht dauerhaft anzeigen (nur bei Opt-in in separaten Views) -> nicht in der Liste
    expect(first.querySelector('.member__email')).toBeNull();

    const second = members[1] as HTMLElement;
    expect(second.textContent).toContain('Jonas Keller');
    expect(second.textContent).toContain('Eingeladen');
  });

  it('should show the empty state when no participants exist', () => {
    const fixture = setup();
    loadConcert(fixture);

    expect(fixture.nativeElement.textContent).toContain('Noch keine Musiker*innen');
  });

  it('should render rehearsals for the concert, sorted by date', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([
      { id: 2, title: 'Spätere Probe', type: 'REHEARSAL', dateTime: '2026-09-11T18:00:00' },
      { id: 3, title: 'Frühere Probe', type: 'REHEARSAL', dateTime: '2026-09-09T18:00:00' },
    ]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([])
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();

    const rehearsals = fixture.nativeElement.querySelectorAll('.rehearsal');
    expect(rehearsals.length).toBe(2);
    expect((rehearsals[0] as HTMLElement).textContent).toContain('Frühere Probe');
    expect((rehearsals[1] as HTMLElement).textContent).toContain('Spätere Probe');
  });

  it('should show an empty state when the concert has no rehearsals', () => {
    const fixture = setup();
    loadConcert(fixture);

    expect(fixture.nativeElement.textContent).toContain('Noch keine Proben für diesen Gig geplant.');
  });

  it('should open the setlist and render pieces in order', () => {
    const fixture = setup();
    loadConcertWithEntries(fixture, [
      { id: 5, setlistId: 10, pieceId: 3, pieceTitle: 'Hallo Welt', position: 0 },
      { id: 6, setlistId: 10, pieceId: 4, pieceTitle: 'Nachtfahrt', position: 1 },
    ]);

    const entries = fixture.nativeElement.querySelectorAll('.entry');
    expect(entries.length).toBe(2);
    const first = entries[0] as HTMLElement;
    expect(first.querySelector('.entry__pos')?.textContent?.trim()).toBe('1');
    expect(first.querySelector('.entry__title')?.textContent).toContain('Hallo Welt');
  });

  it('should show an empty state when the setlist has no pieces', () => {
    const fixture = setup();
    loadConcert(fixture);

    expect(fixture.nativeElement.textContent).toContain('Noch keine Stücke in der Setlist.');
  });

  it('should render panels from the stored layout order', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush({
      order: ['equipment', 'members', 'schedule', 'rehearsals', 'setlist'],
      collapsed: {},
      stored: true,
    });
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([])
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();

    const titles = fixture.nativeElement.querySelectorAll('.panel__title');
    expect((titles[0] as HTMLElement).textContent?.trim()).toBe('Equipment');
    expect((titles[1] as HTMLElement).textContent?.trim()).toBe('Musiker*innen / Zusagen');
  });

  it('should swap two panels via drag & drop and persist', () => {
    const fixture = setup();
    loadConcert(fixture);

    const board = fixture.debugElement.query(By.css('.board'));
    const panelEls: HTMLElement[] = Array.from(
      board.nativeElement.querySelectorAll(':scope > .panel'),
    ) as HTMLElement[];
    panelEls.forEach((el, i) => {
      const left = i * 100;
      el.getBoundingClientRect = () =>
        ({
          left,
          top: 0,
          width: 100,
          height: 100,
          right: left + 100,
          bottom: 100,
          x: left,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect;
    });

    const dropList = board.injector.get(CdkDropList) as CdkDropList<string[]>;
    dropList.dropped.emit({
      previousIndex: 0,
      currentIndex: 2,
      item: null as never,
      container: dropList,
      previousContainer: dropList,
      isPointerOverContainer: true,
      distance: { x: 0, y: 0 },
      dropPoint: { x: 250, y: 50 },
      event: new MouseEvent('mouseup'),
    });
    fixture.detectChanges();

    const saveReq = httpMock.expectOne('/api/events/1/layout');
    expect(saveReq.request.method).toBe('PUT');
    expect((saveReq.request.body as { order: string[] }).order).toEqual([
      'rehearsals',
      'setlist',
      'members',
      'equipment',
      'locations',
      'schedule',
    ]);
    saveReq.flush({
      order: ['rehearsals', 'setlist', 'members', 'equipment', 'locations', 'schedule'],
      collapsed: {},
      stored: true,
    });
    fixture.detectChanges();

    const titles = fixture.nativeElement.querySelectorAll('.panel__title');
    expect((titles[0] as HTMLElement).textContent?.trim()).toBe('Proben zu diesem Gig');
    expect((titles[1] as HTMLElement).textContent?.trim()).toBe('Setlist');
  });

  it('should require a deliberate hold before dragging on touch devices', () => {
    const fixture = setup();
    loadConcertWithEntries(fixture, [
      { id: 5, setlistId: 10, pieceId: 3, pieceTitle: 'Hallo Welt', position: 0 },
    ]);

    const drags = fixture.debugElement.queryAll(By.directive(CdkDrag));
    expect(drags.length).toBeGreaterThan(6);
    for (const element of drags) {
      expect(element.injector.get(CdkDrag).dragStartDelay).toEqual({ touch: 350, mouse: 0 });
    }
  });

  it('should collapse and reopen a section and persist', () => {
    const fixture = setup();
    loadConcert(fixture);

    const el: HTMLElement = fixture.nativeElement;
    const membersCollapse = el.querySelector(
      '.panel--members .panel__collapse',
    ) as HTMLButtonElement;
    expect(membersCollapse.getAttribute('aria-expanded')).toBe('true');

    membersCollapse.click();
    fixture.detectChanges();
    expect(el.querySelector('.panel--members .members')).toBeNull();
    expect(
      (el.querySelector('.panel--members .panel__collapse') as HTMLButtonElement).getAttribute(
        'aria-expanded',
      ),
    ).toBe('false');

    const saveReq = httpMock.expectOne('/api/events/1/layout');
    expect(((saveReq.request.body as { collapsed: Record<string, boolean> }).collapsed)['members']).toBe(true);
    saveReq.flush({
      order: DEFAULT_LAYOUT.order,
      collapsed: { members: true },
      stored: true,
    });
    fixture.detectChanges();

    const membersCollapse2 = el.querySelector(
      '.panel--members .panel__collapse',
    ) as HTMLButtonElement;
    membersCollapse2.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Noch keine Musiker*innen');
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
  });

  it('should show all panels expanded when the stored layout has none collapsed', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([])
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.panel').length).toBe(6);
    expect(el.textContent).toContain('Noch keine Musiker*innen');
  });

  it('should start with every panel collapsed on the first visit', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush({
      order: DEFAULT_LAYOUT.order,
      collapsed: {},
      stored: false,
    });
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([])
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.panel').length).toBe(6);
    const collapses = el.querySelectorAll('.panel__collapse');
    expect(collapses.length).toBe(6);
    for (const button of Array.from(collapses)) {
      expect(button.getAttribute('aria-expanded')).toBe('false');
    }
    expect(el.querySelector('.members')).toBeNull();
  });

  it('should add a new piece to the setlist', () => {
    const fixture = setup();
    loadConcert(fixture);

    const input = fixture.nativeElement.querySelector('.setlist__input') as HTMLInputElement;
    input.value = 'Neuer Song';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const submitBtn = fixture.nativeElement.querySelector('.setlist__submit') as HTMLButtonElement;
    expect(submitBtn.type).toBe('button');
    submitBtn.click();
    fixture.detectChanges();

    httpMock.expectOne('/api/pieces').flush({ id: 9, title: 'Neuer Song' });
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries').flush({
      id: 7,
      setlistId: 10,
      pieceId: 9,
      pieceTitle: 'Neuer Song',
      position: 0,
    });
    fixture.detectChanges();

    const titles = fixture.nativeElement.querySelectorAll('.entry__title');
    expect(titles.length).toBe(1);
    expect((titles[0] as HTMLElement).textContent).toContain('Neuer Song');
  });

  it('should add a piece via Enter key without submitting the form', () => {
    const fixture = setup();
    loadConcert(fixture);

    const input = fixture.nativeElement.querySelector('.setlist__input') as HTMLInputElement;
    input.value = 'Enter-Song';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    httpMock.expectOne('/api/pieces').flush({ id: 11, title: 'Enter-Song' });
    fixture.detectChanges();
    const entryReq = httpMock.expectOne('/api/setlist-entries');
    expect(entryReq.request.method).toBe('POST');
    entryReq.flush({
      id: 8,
      setlistId: 10,
      pieceId: 11,
      pieceTitle: 'Enter-Song',
      position: 0,
    });
    fixture.detectChanges();

    const titles = fixture.nativeElement.querySelectorAll('.entry__title');
    expect(titles.length).toBe(1);
    expect((titles[0] as HTMLElement).textContent).toContain('Enter-Song');
  });

  it('should remove a piece from the setlist', () => {
    const fixture = setup();
    loadConcertWithEntries(fixture, [
      { id: 5, setlistId: 10, pieceId: 3, pieceTitle: 'Hallo Welt', position: 0 },
    ]);

    (fixture.nativeElement.querySelector('.entry__btn--danger') as HTMLButtonElement).click();
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/5').flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Noch keine Stücke in der Setlist.');
  });

  it('should move a piece up in the setlist', () => {
    const fixture = setup();
    loadConcertWithEntries(fixture, [
      { id: 5, setlistId: 10, pieceId: 3, pieceTitle: 'Hallo Welt', position: 0 },
      { id: 6, setlistId: 10, pieceId: 4, pieceTitle: 'Nachtfahrt', position: 1 },
    ]);

    const secondRow = fixture.nativeElement.querySelectorAll('.entry')[1] as HTMLElement;
    (secondRow.querySelector('.entry__btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    httpMock.expectOne('/api/setlist-entries/6').flush({
      id: 6,
      setlistId: 10,
      pieceId: 4,
      pieceTitle: 'Nachtfahrt',
      position: 0,
    });
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/5').flush({
      id: 5,
      setlistId: 10,
      pieceId: 3,
      pieceTitle: 'Hallo Welt',
      position: 1,
    });
    fixture.detectChanges();

    const titles = fixture.nativeElement.querySelectorAll('.entry__title');
    expect((titles[0] as HTMLElement).textContent).toContain('Nachtfahrt');
    expect((titles[1] as HTMLElement).textContent).toContain('Hallo Welt');
  });

  it('should reorder pieces via drag & drop', () => {
    const fixture = setup();
    loadConcertWithEntries(fixture, [
      { id: 5, setlistId: 10, pieceId: 3, pieceTitle: 'Hallo Welt', position: 0 },
      { id: 6, setlistId: 10, pieceId: 4, pieceTitle: 'Nachtfahrt', position: 1 },
      { id: 7, setlistId: 10, pieceId: 2, pieceTitle: 'Feuertanz', position: 2 },
    ]);

    const setlistEl = fixture.debugElement.query(By.css('.setlist__entries'));
    const dropList = setlistEl.injector.get(CdkDropList) as CdkDropList<unknown>;
    dropList.dropped.emit({
      previousIndex: 2,
      currentIndex: 0,
      item: null as never,
      container: dropList,
      previousContainer: dropList,
      isPointerOverContainer: true,
      distance: { x: 0, y: 0 },
      dropPoint: { x: 0, y: 0 },
      event: new MouseEvent('mouseup'),
    });
    fixture.detectChanges();

    httpMock.expectOne('/api/setlist-entries/7').flush({
      id: 7,
      setlistId: 10,
      pieceId: 2,
      pieceTitle: 'Feuertanz',
      position: 0,
    });
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/5').flush({
      id: 5,
      setlistId: 10,
      pieceId: 3,
      pieceTitle: 'Hallo Welt',
      position: 1,
    });
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/6').flush({
      id: 6,
      setlistId: 10,
      pieceId: 4,
      pieceTitle: 'Nachtfahrt',
      position: 2,
    });
    fixture.detectChanges();

    const titles = fixture.nativeElement.querySelectorAll('.entry__title');
    expect((titles[0] as HTMLElement).textContent).toContain('Feuertanz');
    expect((titles[1] as HTMLElement).textContent).toContain('Hallo Welt');
    expect((titles[2] as HTMLElement).textContent).toContain('Nachtfahrt');
  });

  it('should render a simple view for a rehearsal', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(REHEARSAL);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.type')?.textContent?.trim()).toBe('Probe');
    expect(el.querySelectorAll('.panel').length).toBe(0);
    expect(el.textContent).toContain('Dieser Termin ist eine Probe.');
  });

  it('should show an error message when loading fails', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(null, {
      status: 404,
      statusText: 'Not Found',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('p[role="alert"]')).toBeTruthy();
  });

  it('should render equipment requirements with status chips and responsibility', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([
      {
        id: 11,
        eventId: 1,
        equipmentId: 5,
        equipmentName: 'Mischpult',
        category: 'Ton',
        availableOnSite: 'YES',
        needsToBeBrought: 'UNKNOWN',
        responsibleMusicianId: null,
      },
    ]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Mischpult');
    expect(el.textContent).toContain('Vor Ort: Ja');
    expect(el.textContent).toContain('Mitbringen: Offen');
  });

  it('should toggle a requirement status via PUT', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([
      {
        id: 11,
        eventId: 1,
        equipmentId: 5,
        equipmentName: 'Mischpult',
        category: 'Ton',
        availableOnSite: 'UNKNOWN',
        needsToBeBrought: 'UNKNOWN',
        responsibleMusicianId: null,
      },
    ]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();

    const chip = fixture.nativeElement.querySelectorAll('.eq__chip')[0] as HTMLButtonElement;
    chip.click();
    const req = httpMock.expectOne('/api/equipment-requirements/11');
    expect(req.request.method).toBe('PUT');
    req.flush({
      id: 11,
      eventId: 1,
      equipmentId: 5,
      equipmentName: 'Mischpult',
      category: 'Ton',
      availableOnSite: 'YES',
      needsToBeBrought: 'UNKNOWN',
      responsibleMusicianId: null,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Vor Ort: Ja');
    expect(fixture.nativeElement.textContent).toContain('Equipment gespeichert.');
  });

  it('should add an existing equipment item as a requirement', () => {
    const fixture = setup();
    loadConcert(fixture);

    const addBtn = fixture.nativeElement.querySelector('.equipment__add') as HTMLButtonElement;
    addBtn.click();
    fixture.detectChanges();

    httpMock.expectOne('/api/equipment').flush([
      { id: 5, name: 'Mischpult', category: 'Ton' },
      { id: 6, name: 'Monitor', category: 'Ton' },
    ]);
    fixture.detectChanges();

    const item = Array.from(
      fixture.nativeElement.querySelectorAll('.picker__item'),
    ).find((n) => (n as HTMLElement).textContent?.includes('Mischpult')) as HTMLElement;
    (item.querySelector('.picker__add') as HTMLButtonElement).click();

    const req = httpMock.expectOne('/api/equipment-requirements');
    expect(req.request.method).toBe('POST');
    req.flush({
      id: 12,
      eventId: 1,
      equipmentId: 5,
      equipmentName: 'Mischpult',
      category: 'Ton',
      availableOnSite: 'UNKNOWN',
      needsToBeBrought: 'UNKNOWN',
      responsibleMusicianId: null,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Equipment hinzugefügt.');
  });

  it('should render schedule items sorted by time', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([
      { id: 1, eventId: 1, label: 'Soundcheck', time: '17:00' },
      { id: 2, eventId: 1, label: 'Auftritt', time: '20:00' },
    ]);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.sched');
    expect(items.length).toBe(2);
    expect((items[0] as HTMLElement).textContent).toContain('Soundcheck');
    expect((items[1] as HTMLElement).textContent).toContain('Auftritt');
  });

  it('should show an empty state when the concert has no schedule items', () => {
    const fixture = setup();
    loadConcert(fixture);

    expect(fixture.nativeElement.textContent).toContain('Noch kein Ablauf für diesen Gig erfasst.');
  });

  it('should add a new schedule item from a preset', () => {
    const fixture = setup();
    loadConcert(fixture);

    const comp = fixture.componentInstance as unknown as {
      scheduleFormOpen: { set(v: boolean): void };
      scheduleType: { set(v: string): void };
      scheduleTime: { set(v: string): void };
      saveScheduleItem(): void;
    };
    comp.scheduleFormOpen.set(true);
    comp.scheduleType.set('Soundcheck');
    comp.scheduleTime.set('17:00');
    fixture.detectChanges();

    comp.saveScheduleItem();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/schedule-items');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ eventId: 1, label: 'Soundcheck', time: '17:00' });
    req.flush({ id: 3, eventId: 1, label: 'Soundcheck', time: '17:00' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Soundcheck');
    expect(fixture.nativeElement.textContent).toContain('Zeitpunkt hinzugefügt.');
  });

  it('should add a schedule item from a custom entry', () => {
    const fixture = setup();
    loadConcert(fixture);

    const comp = fixture.componentInstance as unknown as {
      scheduleFormOpen: { set(v: boolean): void };
      scheduleType: { set(v: string): void };
      scheduleCustom: { set(v: string): void };
      scheduleTime: { set(v: string): void };
      saveScheduleItem(): void;
    };
    comp.scheduleFormOpen.set(true);
    comp.scheduleType.set('custom');
    comp.scheduleCustom.set('Meet & Greet');
    comp.scheduleTime.set('16:00');
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('#schedule-custom') as HTMLInputElement)).toBeTruthy();

    comp.saveScheduleItem();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/schedule-items');
    expect(req.request.body).toEqual({ eventId: 1, label: 'Meet & Greet', time: '16:00' });
    req.flush({ id: 4, eventId: 1, label: 'Meet & Greet', time: '16:00' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Meet & Greet');
  });

  it('should edit an existing schedule item', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([
      { id: 5, eventId: 1, label: 'Soundcheck', time: '17:00' },
    ]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.sched__btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    const comp = fixture.componentInstance as unknown as {
      scheduleType: { set(v: string): void };
      scheduleTime: { set(v: string): void };
      saveScheduleItem(): void;
    };
    comp.scheduleType.set('Pause');
    comp.scheduleTime.set('18:00');
    fixture.detectChanges();
    comp.saveScheduleItem();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/schedule-items/5');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ eventId: 1, label: 'Pause', time: '18:00' });
    req.flush({ id: 5, eventId: 1, label: 'Pause', time: '18:00' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Pause');
    expect(fixture.nativeElement.textContent).toContain('Zeitpunkt gespeichert.');
  });

  it('should edit a free-text schedule entry as a custom entry', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([
      { id: 6, eventId: 1, label: 'Meet & Greet', time: '16:00' },
    ]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.sched__btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    const comp = fixture.componentInstance as unknown as {
      scheduleType: () => string;
      scheduleCustom: { set(v: string): void };
      scheduleTime: { set(v: string): void };
      saveScheduleItem(): void;
    };
    expect(comp.scheduleType()).toBe('custom');
    expect(
      (fixture.nativeElement.querySelector('#schedule-custom') as HTMLInputElement).value,
    ).toBe('Meet & Greet');

    comp.scheduleCustom.set('Meet & Greet (neu)');
    comp.scheduleTime.set('16:30');
    fixture.detectChanges();
    comp.saveScheduleItem();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/schedule-items/6');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ eventId: 1, label: 'Meet & Greet (neu)', time: '16:30' });
    req.flush({ id: 6, eventId: 1, label: 'Meet & Greet (neu)', time: '16:30' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Meet & Greet (neu)');
  });

  it('should remove a schedule item', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([
      { id: 5, eventId: 1, label: 'Soundcheck', time: '17:00' },
    ]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.sched__btn--danger') as HTMLButtonElement).click();
    fixture.detectChanges();

    httpMock.expectOne('/api/schedule-items/5').flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Noch kein Ablauf für diesen Gig erfasst.');
  });

  it('should assign an existing rehearsal to the concert', () => {
    const fixture = setup();
    loadConcert(fixture);

    const addBtn = fixture.nativeElement.querySelector('.rehearsals__add') as HTMLButtonElement;
    addBtn.click();
    fixture.detectChanges();
    httpMock.expectOne('/api/events').flush([
      { id: 7, title: 'Studio-Probe', type: 'REHEARSAL', dateTime: '2026-09-05T18:00:00' },
    ]);
    fixture.detectChanges();

    const item = Array.from(
      fixture.nativeElement.querySelectorAll('.picker__item'),
    ).find((n) => (n as HTMLElement).textContent?.includes('Studio-Probe')) as HTMLElement;
    (item.querySelector('.picker__add') as HTMLButtonElement).click();

    const req = httpMock.expectOne('/api/events/7');
    expect(req.request.method).toBe('PUT');
    req.flush({
      id: 7,
      title: 'Studio-Probe',
      type: 'REHEARSAL',
      dateTime: '2026-09-05T18:00:00',
      concertId: 1,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Studio-Probe');
    expect(fixture.nativeElement.textContent).toContain('Probe zugeordnet.');
  });

  it('should create and assign a new rehearsal', () => {
    const fixture = setup();
    loadConcert(fixture);

    (fixture.nativeElement.querySelector('.rehearsals__add') as HTMLButtonElement).click();
    fixture.detectChanges();
    httpMock.expectOne('/api/events').flush([]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.picker__toggle-new') as HTMLButtonElement).click();
    fixture.detectChanges();

    const comp = fixture.componentInstance as unknown as {
      newRehearsalTitle: { set(v: string): void };
      newRehearsalDate: { set(v: string): void };
      newRehearsalTime: { set(v: string): void };
      createRehearsal(): void;
    };
    comp.newRehearsalTitle.set('Bühnenprobe');
    comp.newRehearsalDate.set('2026-09-06');
    comp.newRehearsalTime.set('20:00');
    fixture.detectChanges();

    comp.createRehearsal();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/events');
    expect(req.request.method).toBe('POST');
    req.flush({
      id: 8,
      title: 'Bühnenprobe',
      type: 'REHEARSAL',
      dateTime: '2026-09-06T20:00:00',
      concertId: 1,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Bühnenprobe');
    expect(fixture.nativeElement.textContent).toContain('Probe angelegt und zugeordnet.');
  });

  it('should unlink a rehearsal from the concert without deleting it', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([
      { id: 7, title: 'Studio-Probe', type: 'REHEARSAL', dateTime: '2026-09-05T18:00:00' },
    ]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([])
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();

    const unlinkBtn = fixture.nativeElement.querySelector('.rehearsal__unlink-btn') as HTMLButtonElement;
    unlinkBtn.click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.rehearsal__unlink-btn--danger') as HTMLButtonElement).click();
    const req = httpMock.expectOne('/api/events/7');
    expect(req.request.method).toBe('PUT');
    req.flush({
      id: 7,
      title: 'Studio-Probe',
      type: 'REHEARSAL',
      dateTime: '2026-09-05T18:00:00',
      concertId: null,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Probe vom Gig gelöst.');
    expect(fixture.nativeElement.querySelector('.rehearsal')).toBeNull();
  });

  it('should offer self-join for an authenticated musician and join via /join', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'm@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 2, email: 'm@gigflow.local', organizer: false, musicianId: 3 },
    });
    fixture.detectChanges();

    const joinBtn = fixture.nativeElement.querySelector('.members__add--primary') as HTMLButtonElement;
    expect(joinBtn).toBeTruthy();
    joinBtn.click();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/events/1/join');
    expect(req.request.method).toBe('POST');
    req.flush({ id: 20, eventId: 1, musicianId: 3, status: 'ACCEPTED' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Teilnahme bestätigt.');
    expect(fixture.nativeElement.querySelector('.members__self-hint')?.textContent).toContain('Zusage');
  });

  it('should not show the member-management add button for a non-organizer', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'm@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 2, email: 'm@gigflow.local', organizer: false, musicianId: 3 },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.members__add')?.textContent?.trim()).toBe('Ich mache mit');
  });

  it('should show a PDF badge and an open button for a piece with sheet music', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([
      { id: 5, setlistId: 10, pieceId: 3, pieceTitle: 'Hallo Welt', position: 0, hasSheetPdf: true },
      { id: 6, setlistId: 10, pieceId: 4, pieceTitle: 'Nachtfahrt', position: 1, hasSheetPdf: false },
    ]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'o@gigflow.local', organizer: true, musicianId: null },
    });
    fixture.detectChanges();

    const first = fixture.nativeElement.querySelectorAll('.entry')[0] as HTMLElement;
    expect(first.querySelector('.entry__sheet')?.textContent?.trim()).toBe('PDF');
    expect(first.querySelector('.entry__btn--pdf')?.textContent?.trim()).toBe('Öffnen');

    const second = fixture.nativeElement.querySelectorAll('.entry')[1] as HTMLElement;
    expect(second.querySelector('.entry__sheet')).toBeNull();
    expect(second.querySelector('.entry__btn--pdf')?.textContent?.trim()).toBe('PDF laden');
  });

  it('should upload a sheet PDF and show the badge afterwards', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([
      { id: 5, setlistId: 10, pieceId: 3, pieceTitle: 'Hallo Welt', position: 0, hasSheetPdf: false },
    ]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'o@gigflow.local', organizer: true, musicianId: null },
    });
    fixture.detectChanges();

    const first = fixture.nativeElement.querySelectorAll('.entry')[0] as HTMLElement;
    (first.querySelector('.entry__btn--pdf') as HTMLButtonElement).click();

    const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['%PDF-1.4'], 'noten.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/pieces/3/sheet-pdf');
    expect(req.request.method).toBe('POST');
    req.flush({ id: 3, title: 'Hallo Welt', hasSheetPdf: true });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Noten hochgeladen.');
    expect(first.querySelector('.entry__sheet')).toBeTruthy();
  });

  it('should download and open an existing sheet PDF inline', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([
      { id: 5, setlistId: 10, pieceId: 3, pieceTitle: 'Hallo Welt', position: 0, hasSheetPdf: true },
    ]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'o@gigflow.local', organizer: true, musicianId: null },
    });
    fixture.detectChanges();

    const first = fixture.nativeElement.querySelectorAll('.entry')[0] as HTMLElement;
    (first.querySelector('.entry__btn--pdf') as HTMLButtonElement).click();
    const req = httpMock.expectOne('/api/pieces/3/sheet-pdf');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Noten konnten nicht geöffnet werden.');
    expect(fixture.nativeElement.querySelector('app-sheet-viewer')).toBeTruthy();
  });

  it('should download a single sheet PDF as an attachment', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([
      { id: 5, setlistId: 10, pieceId: 3, pieceTitle: 'Hallo Welt', position: 0, hasSheetPdf: true },
    ]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();

    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    vi.spyOn(URL, 'createObjectURL').mockImplementation(createObjectURL);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revokeObjectURL);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    const first = fixture.nativeElement.querySelectorAll('.entry')[0] as HTMLElement;
    (first.querySelector('.entry__btn--pdf-download') as HTMLButtonElement).click();
    const req = httpMock.expectOne('/api/pieces/3/sheet-pdf?download=true');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
    fixture.detectChanges();

    expect(click).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('„Hallo Welt“ heruntergeladen.');
    vi.restoreAllMocks();
  });

  it('should offer setlist downloads and save the info PDF', async () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([
      { id: 5, setlistId: 10, pieceId: 3, pieceTitle: 'Hallo Welt', position: 0, hasSheetPdf: true },
    ]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();

    let savedFilename = '';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      savedFilename = this.download;
    });

    const toggle = fixture.nativeElement.querySelector(
      '.setlist__download-btn',
    ) as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    toggle.click();
    fixture.detectChanges();

    const infoItem = fixture.nativeElement.querySelector(
      '.setlist__download-item',
    ) as HTMLButtonElement;
    infoItem.click();
    for (let i = 0; i < 50 && !savedFilename; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      fixture.detectChanges();
    }

    expect(savedFilename).toBe('gigflow-hafenrocker-infos.pdf');
    expect(fixture.nativeElement.textContent).toContain('Infos als PDF gespeichert.');
    vi.restoreAllMocks();
  });

  it('should show Demo and YouTube badges and play a demo inline', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([
      {
        id: 5,
        setlistId: 10,
        pieceId: 3,
        pieceTitle: 'Hallo Welt',
        position: 0,
        hasSheetPdf: true,
        hasDemoAudio: true,
        youtubeUrl: 'https://youtu.be/abc123',
      },
    ]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'o@gigflow.local', organizer: true, musicianId: null },
    });
    fixture.detectChanges();

    const first = fixture.nativeElement.querySelectorAll('.entry')[0] as HTMLElement;
    expect(first.querySelector('.entry__sheet--audio')?.textContent?.trim()).toBe('Demo');
    expect(first.querySelector('.entry__sheet--youtube')?.textContent?.trim()).toBe('YouTube');
    expect((first.querySelector('.entry__sheet--youtube') as HTMLAnchorElement).getAttribute('href')).toBe(
      'https://youtu.be/abc123',
    );

    (first.querySelector('.entry__btn--audio') as HTMLButtonElement).click();
    const req = httpMock.expectOne('/api/pieces/3/demo-audio');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/mpeg' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.entry__player audio')).toBeTruthy();
  });

  it('should upload a demo audio MP3 and show the badge afterwards', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([
      { id: 5, setlistId: 10, pieceId: 3, pieceTitle: 'Hallo Welt', position: 0, hasSheetPdf: false },
    ]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'o@gigflow.local', organizer: true, musicianId: null },
    });
    fixture.detectChanges();

    const first = fixture.nativeElement.querySelectorAll('.entry')[0] as HTMLElement;
    expect(first.querySelector('.entry__btn--audio')?.textContent?.trim()).toBe('Audio laden');
    (first.querySelector('.entry__btn--audio') as HTMLButtonElement).click();

    const inputs = fixture.nativeElement.querySelectorAll('input[type="file"]');
    const input = inputs[1] as HTMLInputElement;
    const file = new File(['abc'], 'demo.mp3', { type: 'audio/mpeg' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/pieces/3/demo-audio');
    expect(req.request.method).toBe('POST');
    req.flush({ id: 3, title: 'Hallo Welt', hasDemoAudio: true });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Demo hochgeladen.');
    expect(first.querySelector('.entry__sheet--audio')).toBeTruthy();
  });

  it('should remove a demo audio and drop the badge', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([
      { id: 5, setlistId: 10, pieceId: 3, pieceTitle: 'Hallo Welt', position: 0, hasDemoAudio: true },
    ]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'o@gigflow.local', organizer: true, musicianId: null },
    });
    fixture.detectChanges();

    const first = fixture.nativeElement.querySelectorAll('.entry')[0] as HTMLElement;
    (first.querySelector('.entry__btn--audio-remove') as HTMLButtonElement).click();
    const req = httpMock.expectOne('/api/pieces/3/demo-audio');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Demo entfernt.');
    expect(first.querySelector('.entry__sheet--audio')).toBeNull();
  });

  it('should save and show a YouTube link via the inline form', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([
      { id: 5, setlistId: 10, pieceId: 3, pieceTitle: 'Hallo Welt', position: 0 },
    ]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'o@gigflow.local', organizer: true, musicianId: null },
    });
    fixture.detectChanges();

    const first = fixture.nativeElement.querySelectorAll('.entry')[0] as HTMLElement;
    (first.querySelector('.entry__btn--youtube') as HTMLButtonElement).click();
    fixture.detectChanges();

    const input = first.querySelector('.entry__link-form input') as HTMLInputElement;
    expect(input).toBeTruthy();
    input.value = 'https://www.youtube.com/watch?v=abc123';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (first.querySelector('.entry__link-form .setlist__submit') as HTMLButtonElement).click();
    const req = httpMock.expectOne('/api/pieces/3/youtube');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
    });
    req.flush({ id: 3, title: 'Hallo Welt', youtubeUrl: 'https://www.youtube.com/watch?v=abc123' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('YouTube-Link gespeichert.');
    expect((first.querySelector('.entry__sheet--youtube') as HTMLAnchorElement).getAttribute('href')).toBe(
      'https://www.youtube.com/watch?v=abc123',
    );
  });

  it('should render locations with type, name, address, phone, note and maps link', () => {
    const fixture = setup();
    loadConcertWithLocations(fixture, [
      {
        id: 1,
        eventId: 1,
        type: 'VENUE',
        name: 'Klangbar Hamburg',
        address: 'Reeperbahn 42, 20359 Hamburg',
        note: 'Backstage-Eingang hinten rechts',
        phone: '+49 40 12345678',
        mapsUrl: 'https://maps.google.com/?q=Klangbar+Hamburg',
      },
      {
        id: 2,
        eventId: 1,
        type: 'HOTEL',
        name: 'Hotel Meeresblick',
        address: 'Stresemannstraße 120, 22769 Hamburg',
        note: null,
        phone: null,
        mapsUrl: null,
      },
    ]);

    const items = fixture.nativeElement.querySelectorAll('.loc');
    expect(items.length).toBe(2);

    const first = items[0] as HTMLElement;
    expect(first.querySelector('.loc__type')?.textContent?.trim()).toBe('Venue / Club');
    expect(first.querySelector('.loc__name')?.textContent?.trim()).toBe('Klangbar Hamburg');
    expect(first.textContent).toContain('Reeperbahn 42, 20359 Hamburg');
    expect(first.textContent).toContain('Tel: +49 40 12345678');
    expect(first.textContent).toContain('Backstage-Eingang hinten rechts');
    expect((first.querySelector('.loc__map') as HTMLAnchorElement).getAttribute('href')).toBe(
      'https://maps.google.com/?q=Klangbar+Hamburg',
    );
    expect((first.querySelector('.loc__map') as HTMLAnchorElement).getAttribute('target')).toBe('_blank');
    expect(fixture.nativeElement.textContent).toContain('Orte & Logistik');
  });

  it('should derive a maps link from name and address when no custom link is set', () => {
    const fixture = setup();
    loadConcertWithLocations(fixture, [
      {
        id: 3,
        eventId: 1,
        type: 'MEETING_POINT',
        name: 'Treffpunkt Backstage',
        address: 'Reeperbahn 42, 20359 Hamburg',
        note: null,
        phone: null,
        mapsUrl: null,
      },
    ]);

    const map = fixture.nativeElement.querySelector('.loc__map') as HTMLAnchorElement;
    expect(map.getAttribute('href')).toBe(
      'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent('Treffpunkt Backstage, Reeperbahn 42, 20359 Hamburg'),
    );
  });

  it('should add a new location via the form', () => {
    const fixture = setup();
    loadConcertWithLocations(fixture, []);

    const addBtn = fixture.nativeElement.querySelector('.panel--locations .schedule__add') as HTMLButtonElement;
    addBtn.click();
    fixture.detectChanges();

    const comp = fixture.componentInstance as unknown as {
      locationType: { set(v: string): void };
      locationName: { set(v: string): void };
      locationAddress: { set(v: string): void };
      locationPhone: { set(v: string): void };
      saveLocation(): void;
    };
    comp.locationType.set('HOTEL');
    comp.locationName.set('Hotel Stadt');
    comp.locationAddress.set('Bahnhofstraße 1, 20095 Hamburg');
    comp.locationPhone.set('040 555 666');
    fixture.detectChanges();
    comp.saveLocation();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/event-locations');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      eventId: 1,
      type: 'HOTEL',
      name: 'Hotel Stadt',
      address: 'Bahnhofstraße 1, 20095 Hamburg',
      note: null,
      phone: '040 555 666',
      mapsUrl: null,
    });
    req.flush({
      id: 9,
      eventId: 1,
      type: 'HOTEL',
      name: 'Hotel Stadt',
      address: 'Bahnhofstraße 1, 20095 Hamburg',
      note: null,
      phone: '040 555 666',
      mapsUrl: null,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Hotel Stadt');
    expect(fixture.nativeElement.textContent).toContain('Ort hinzugefügt.');
  });

  it('should edit an existing location via PUT', () => {
    const fixture = setup();
    loadConcertWithLocations(fixture, [
      {
        id: 5,
        eventId: 1,
        type: 'RESTAURANT',
        name: 'Pizzeria Da Miro',
        address: 'Kleine Straße 3',
        note: null,
        phone: null,
        mapsUrl: null,
      },
    ]);

    (fixture.nativeElement.querySelector('.panel--locations .sched__btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    const comp = fixture.componentInstance as unknown as {
      locationName: { set(v: string): void };
      locationNote: { set(v: string): void };
      saveLocation(): void;
    };
    comp.locationName.set('Pizzeria Da Miro (Tisch reserviert)');
    comp.locationNote.set('Tisch für 8 Personen');
    fixture.detectChanges();
    comp.saveLocation();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/event-locations/5');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      eventId: 1,
      type: 'RESTAURANT',
      name: 'Pizzeria Da Miro (Tisch reserviert)',
      address: 'Kleine Straße 3',
      note: 'Tisch für 8 Personen',
      phone: null,
      mapsUrl: null,
    });
    req.flush({
      id: 5,
      eventId: 1,
      type: 'RESTAURANT',
      name: 'Pizzeria Da Miro (Tisch reserviert)',
      address: 'Kleine Straße 3',
      note: 'Tisch für 8 Personen',
      phone: null,
      mapsUrl: null,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Pizzeria Da Miro (Tisch reserviert)');
    expect(fixture.nativeElement.textContent).toContain('Ort gespeichert.');
  });

  it('should allow changing the type of an existing VENUE location', () => {
    const fixture = setup();
    loadConcertWithLocations(fixture, [
      {
        id: 6,
        eventId: 1,
        type: 'VENUE',
        name: 'Klangbar',
        address: 'Reeperbahn 1, 20359 Hamburg',
        note: null,
        phone: null,
        mapsUrl: null,
      },
    ]);

    (fixture.nativeElement.querySelector('.panel--locations .sched__btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    const comp = fixture.componentInstance as unknown as {
      locationType: () => string;
      saveLocation(): void;
    };
    const select = fixture.nativeElement.querySelector(
      '#location-type',
    ) as HTMLSelectElement;
    expect(comp.locationType()).toBe('VENUE');
    const optionLabels = Array.from(select.options).map((o) => o.textContent?.trim());
    expect(optionLabels).toContain('Venue / Club');
    expect(optionLabels).toContain('Hotel');

    (fixture.componentInstance as unknown as {
      onLocationTypeChange: (v: string) => void;
    }).onLocationTypeChange('HOTEL');
    fixture.detectChanges();
    expect(comp.locationType()).toBe('HOTEL');

    comp.saveLocation();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/event-locations/6');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.type).toBe('HOTEL');
    req.flush({
      id: 6,
      eventId: 1,
      type: 'HOTEL',
      name: 'Klangbar',
      address: 'Reeperbahn 1, 20359 Hamburg',
      note: null,
      phone: null,
      mapsUrl: null,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Hotel');
  });

  it('should show an empty state when the concert has no locations', () => {
    const fixture = setup();
    loadConcertWithLocations(fixture, []);

    expect(fixture.nativeElement.textContent).toContain('Noch keine Orte für diesen Gig erfasst.');
  });

  it('should remove a location after confirmation', () => {
    const fixture = setup();
    loadConcertWithLocations(fixture, [
      {
        id: 7,
        eventId: 1,
        type: 'VENUE',
        name: 'Klangbar Hamburg',
        address: 'Reeperbahn 42',
        note: null,
        phone: null,
        mapsUrl: null,
      },
    ]);

    const buttons = fixture.nativeElement.querySelectorAll(
      '.panel--locations .sched__btn',
    ) as NodeListOf<HTMLButtonElement>;
    buttons[1].click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.panel--locations .sched__btn--danger') as HTMLButtonElement).click();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/event-locations/7');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ort entfernt.');
    expect(fixture.nativeElement.textContent).toContain('Noch keine Orte für diesen Gig erfasst.');
  });

  it('should show a delete action for organizers and delete the event after confirmation', () => {
    const fixture = setup();
    loadConcert(fixture);

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'o@gigflow.local', organizer: true, musicianId: null },
    });
    fixture.detectChanges();

    const deleteTrigger = fixture.nativeElement.querySelector('.detail__print--delete') as HTMLButtonElement;
    expect(deleteTrigger).toBeTruthy();
    deleteTrigger.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Hafenrocker');
    (fixture.nativeElement.querySelector('.detail__print--danger') as HTMLButtonElement).click();
    const req = httpMock.expectOne('/api/events/1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();
  });

  it('should hide the delete action for non-organizers', () => {
    const fixture = setup();
    loadConcert(fixture);

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'm@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 2, email: 'm@gigflow.local', organizer: false, musicianId: 3 },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.detail__print--delete')).toBeNull();
  });

  it('should invite the whole band and render the resulting participants', () => {
    const fixture = setup();
    loadConcert(fixture);

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'o@gigflow.local', organizer: true, musicianId: null },
    });
    fixture.detectChanges();

    const invite = fixture.nativeElement.querySelector(
      '.members__invite-band',
    ) as HTMLButtonElement;
    expect(invite).toBeTruthy();
    invite.click();

    const req = httpMock.expectOne('/api/events/1/invite-band');
    expect(req.request.method).toBe('POST');
    req.flush([
      {
        id: 7,
        eventId: 1,
        musicianId: 5,
        musician: { id: 5, firstName: 'Anna', lastName: 'Becker', instrument: 'Gesang' },
        status: 'INVITED',
      },
    ]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Band-Mitglieder eingeladen.');
    expect(el.textContent).toContain('Anna Becker');
  });
});
    

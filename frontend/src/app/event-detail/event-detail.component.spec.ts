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
import { EventUndoService } from '../dashboard/event-undo.service';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../notifications/toast.service';
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

const SHEET_GUITAR = { id: 101, pieceId: 3, label: 'Gitarre', originalName: 'Gitarre.pdf' };
const SHEET_BASS = { id: 102, pieceId: 3, label: 'Bass', originalName: 'Bass.pdf' };

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

  /** Loads a CONCERT with the given participants, no rehearsals, an empty setlist and the default layout. */
  function loadConcert(
    fixture: ComponentFixture<EventDetailComponent>,
    participations: unknown[] = [],
  ): void {
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush(participations);
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

/** Logs in as the organizer so management controls become visible. */
function loginAsOrganizer(fixture: ComponentFixture<EventDetailComponent>): void {
  const auth = TestBed.inject(AuthService);
  auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
  httpMock.expectOne('/api/auth/login').flush({
    token: 't',
    user: { id: 1, email: 'o@gigflow.local', organizer: true, musicianId: null },
  });
  fixture.detectChanges();
}

/** Waits for the promise chain triggered by a flushed HTTP response. */
async function settle(fixture: ComponentFixture<EventDetailComponent>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
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
    vi.restoreAllMocks();
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
  }, 15000);

  it('should render participants with distinct status colors', () => {
    const fixture = setup();
    loadConcert(fixture, [
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
      {
        id: 3,
        eventId: 1,
        musicianId: 5,
        musician: { id: 5, firstName: 'Mia', lastName: 'Sommer', instrument: 'Bass' },
        status: 'SUGGESTED',
      },
      {
        id: 4,
        eventId: 1,
        musicianId: 6,
        musician: { id: 6, firstName: 'Tom', lastName: 'Winter', instrument: 'Schlagzeug' },
        status: 'DECLINED',
      },
    ]);

    const el: HTMLElement = fixture.nativeElement;
    const members = el.querySelectorAll('.member');
    expect(members.length).toBe(4);

    const classesOf = (member: Element): string[] =>
      Array.from((member.querySelector('.member__status') as HTMLElement).classList)
        .filter((name) => name.startsWith('member__status--'));

    expect(members[0].textContent).toContain('Anna Becker');
    expect(members[0].textContent).toContain('Zusage');
    expect(classesOf(members[0])).toEqual(['member__status--accepted']);
    // E-Mail nicht dauerhaft anzeigen (nur bei Opt-in in separaten Views) -> nicht in der Liste
    expect(members[0].querySelector('.member__email')).toBeNull();

    expect(members[1].textContent).toContain('Jonas Keller');
    expect(members[1].textContent).toContain('Eingeladen');
    expect(classesOf(members[1])).toEqual(['member__status--invited']);

    expect(members[2].textContent).toContain('Mia Sommer');
    expect(members[2].textContent).toContain('Vorschlag');
    expect(classesOf(members[2])).toEqual(['member__status--suggested']);

    expect(members[3].textContent).toContain('Tom Winter');
    expect(members[3].textContent).toContain('Abgesagt');
    expect(classesOf(members[3])).toEqual(['member__status--declined']);

    const options = Array.from(
      (el.querySelector('#status-1') as HTMLSelectElement).options,
    );
    expect(options.map((option) => option.textContent?.trim())).toEqual([
      'Vorschlag',
      'Eingeladen',
      'Zusage',
      'Abgesagt',
    ]);
    expect(options.map((option) => option.className)).toEqual([
      'member__status--suggested',
      'member__status--invited',
      'member__status--accepted',
      'member__status--declined',
    ]);
  });

  it('should save a suggested status', () => {
    const fixture = setup();
    loadConcert(fixture, [
      {
        id: 2,
        eventId: 1,
        musicianId: 4,
        musician: { id: 4, firstName: 'Jonas', lastName: 'Keller' },
        status: 'INVITED',
      },
    ]);

    const select = fixture.nativeElement.querySelector('#status-2') as HTMLSelectElement;
    select.value = 'SUGGESTED';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(select.classList).toContain('member__status--suggested');

    const req = httpMock.expectOne('/api/event-participations/2');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      eventId: 1,
      musicianId: 4,
      status: 'SUGGESTED',
    });
    req.flush({ id: 2, eventId: 1, musicianId: 4, status: 'SUGGESTED' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Status gespeichert.');
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
      { id: 5, setlistId: 10, pieceId: 3, pieceTitle: 'Hallo Welt', position: 0, sheets: [] },
      { id: 6, setlistId: 10, pieceId: 4, pieceTitle: 'Nachtfahrt', position: 1, sheets: [] },
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

    expect(fixture.nativeElement.textContent).toContain('Noch keine Stücke hinterlegt.');
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
      { id: 5, setlistId: 10, pieceId: 3, pieceTitle: 'Hallo Welt', position: 0, sheets: [] },
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
      sheets: [],
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
      sheets: [],
    });
    fixture.detectChanges();

    const titles = fixture.nativeElement.querySelectorAll('.entry__title');
    expect(titles.length).toBe(1);
    expect((titles[0] as HTMLElement).textContent).toContain('Enter-Song');
  });

  it('should remove a piece from the setlist', () => {
    const fixture = setup();
    loadConcertWithEntries(fixture, [
      { id: 5, setlistId: 10, pieceId: 3, pieceTitle: 'Hallo Welt', position: 0, sheets: [] },
    ]);

    (fixture.nativeElement.querySelector('.entry__btn--danger') as HTMLButtonElement).click();
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/5').flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Noch keine Stücke hinterlegt.');
  });

  it('should move a piece up in the setlist', () => {
    const fixture = setup();
    loadConcertWithEntries(fixture, [
      { id: 5, setlistId: 10, pieceId: 3, pieceTitle: 'Hallo Welt', position: 0, sheets: [] },
      { id: 6, setlistId: 10, pieceId: 4, pieceTitle: 'Nachtfahrt', position: 1, sheets: [] },
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
      sheets: [],
    });
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/5').flush({
      id: 5,
      setlistId: 10,
      pieceId: 3,
      pieceTitle: 'Hallo Welt',
      position: 1,
      sheets: [],
    });
    fixture.detectChanges();

    const titles = fixture.nativeElement.querySelectorAll('.entry__title');
    expect((titles[0] as HTMLElement).textContent).toContain('Nachtfahrt');
    expect((titles[1] as HTMLElement).textContent).toContain('Hallo Welt');
  });

  it('should reorder pieces via drag & drop', () => {
    const fixture = setup();
    loadConcertWithEntries(fixture, [
      { id: 5, setlistId: 10, pieceId: 3, pieceTitle: 'Hallo Welt', position: 0, sheets: [] },
      { id: 6, setlistId: 10, pieceId: 4, pieceTitle: 'Nachtfahrt', position: 1, sheets: [] },
      { id: 7, setlistId: 10, pieceId: 2, pieceTitle: 'Feuertanz', position: 2, sheets: [] },
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
      sheets: [],
    });
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/5').flush({
      id: 5,
      setlistId: 10,
      pieceId: 3,
      pieceTitle: 'Hallo Welt',
      position: 1,
      sheets: [],
    });
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/6').flush({
      id: 6,
      setlistId: 10,
      pieceId: 4,
      pieceTitle: 'Nachtfahrt',
      position: 2,
      sheets: [],
    });
    fixture.detectChanges();

    const titles = fixture.nativeElement.querySelectorAll('.entry__title');
    expect((titles[0] as HTMLElement).textContent).toContain('Feuertanz');
    expect((titles[1] as HTMLElement).textContent).toContain('Hallo Welt');
    expect((titles[2] as HTMLElement).textContent).toContain('Nachtfahrt');
  });

  it('should render shared detail panels for a rehearsal', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(REHEARSAL);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    httpMock.expectOne('/api/event-locations/event/1').flush([]);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.type')?.textContent?.trim()).toBe('Probe');
    expect(el.querySelectorAll('.panel').length).toBe(5);
    expect(el.querySelector('.panel--rehearsals')).toBeNull();
    expect(el.textContent).toContain('Probenrepertoire');
    expect(el.textContent).toContain('Musiker*innen / Zusagen');
    expect(el.textContent).toContain('Equipment');
    expect(el.textContent).toContain('Orte & Logistik');
    expect(el.textContent).toContain('Ablauf / Zeiten');
    expect(el.textContent).not.toContain('Dieser Termin ist eine Probe.');
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

  it('should show the saved responsible musician in the select', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([
      {
        id: 1,
        eventId: 1,
        musicianId: 42,
        musician: { id: 42, firstName: 'Ben', lastName: 'Krüger', instrument: 'Gitarre' },
        status: 'ACCEPTED',
      },
    ]);
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
        equipmentName: 'Bass-Amp',
        category: 'Amp',
        availableOnSite: 'NO',
        needsToBeBrought: 'YES',
        responsibleMusicianId: 42,
      },
    ]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('.eq__select') as HTMLSelectElement;
    expect(select.value).toBe('42');
  });

  it('should save the responsible musician via PUT', () => {
    const fixture = setup();
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([
      {
        id: 1,
        eventId: 1,
        musicianId: 42,
        musician: { id: 42, firstName: 'Ben', lastName: 'Krüger', instrument: 'Gitarre' },
        status: 'ACCEPTED',
      },
    ]);
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
        equipmentName: 'Bass-Amp',
        category: 'Amp',
        availableOnSite: 'NO',
        needsToBeBrought: 'YES',
        responsibleMusicianId: null,
      },
    ]);
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('.eq__select') as HTMLSelectElement;
    select.value = '42';
    select.dispatchEvent(new Event('change'));

    const req = httpMock.expectOne('/api/equipment-requirements/11');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.responsibleMusicianId).toBe(42);
    req.flush({
      id: 11,
      eventId: 1,
      equipmentId: 5,
      equipmentName: 'Bass-Amp',
      category: 'Amp',
      availableOnSite: 'NO',
      needsToBeBrought: 'YES',
      responsibleMusicianId: 42,
    });
    fixture.detectChanges();

    expect(select.value).toBe('42');
  });

  it('should keep the musician picker open after adding someone', () => {
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

    const comp = fixture.componentInstance as unknown as {
      togglePicker(): void;
      addExistingMusician(m: { id: number; firstName: string; lastName: string }): void;
      pickerOpen(): boolean;
    };

    comp.togglePicker();
    fixture.detectChanges();
    httpMock.expectOne('/api/musicians').flush([
      { id: 42, firstName: 'Ben', lastName: 'Krüger', instrument: 'Gitarre' },
    ]);
    fixture.detectChanges();

    comp.addExistingMusician({ id: 42, firstName: 'Ben', lastName: 'Krüger' });
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/event-participations');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.status).toBe('SUGGESTED');
    req.flush({
      id: 9,
      eventId: 1,
      musicianId: 42,
      musician: { id: 42, firstName: 'Ben', lastName: 'Krüger', instrument: 'Gitarre' },
      status: 'SUGGESTED',
    });
    fixture.detectChanges();

    expect(comp.pickerOpen()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-modal-dialog [role="dialog"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.detail app-modal-dialog')).toBeNull();
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

    expect(fixture.nativeElement.textContent).toContain('Noch kein Ablauf für diesen Termin erfasst.');
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

    expect(fixture.nativeElement.textContent).toContain('Noch kein Ablauf für diesen Termin erfasst.');
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

  it('should join and keep the own status color synchronized', () => {
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

    const status = fixture.nativeElement.querySelector('#self-status') as HTMLSelectElement;
    expect(status.classList).toContain('member__status--accepted');
    status.value = 'SUGGESTED';
    status.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(status.value).toBe('SUGGESTED');
    expect(status.classList).toContain('member__status--suggested');
    expect(status.classList).not.toContain('member__status--accepted');

    const update = httpMock.expectOne('/api/event-participations/20');
    expect(update.request.method).toBe('PUT');
    expect(update.request.body.status).toBe('SUGGESTED');
    update.flush({ id: 20, eventId: 1, musicianId: 3, status: 'SUGGESTED' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Dein Status wurde aktualisiert.');
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

  it('should show a notes badge and open the sheet manager', () => {
    const fixture = setup();
    loadConcertWithEntries(fixture, [
      {
        id: 5,
        setlistId: 10,
        pieceId: 3,
        pieceTitle: 'Hallo Welt',
        position: 0,
        sheets: [SHEET_GUITAR],
      },
      { id: 6, setlistId: 10, pieceId: 4, pieceTitle: 'Nachtfahrt', position: 1, sheets: [] },
    ]);
    loginAsOrganizer(fixture);

    const first = fixture.nativeElement.querySelectorAll('.entry')[0] as HTMLElement;
    expect(first.querySelector('.entry__sheet')?.textContent?.trim()).toBe('Noten (1)');
    expect(first.querySelector('.entry__btn--pdf')?.textContent?.trim()).toBe('Noten');

    (first.querySelector('.entry__btn--pdf') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-piece-sheets-dialog')).toBeTruthy();
    httpMock.expectOne('/api/pieces/3/sheets').flush([SHEET_GUITAR]);
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('app-piece-sheets-dialog') as HTMLElement;
    expect(dialog.querySelector('.sheet__label')?.textContent?.trim()).toBe('Gitarre');
  });

  it('should add multiple sheet PDFs through the sheet manager', async () => {
    const fixture = setup();
    loadConcertWithEntries(fixture, [
      { id: 5, setlistId: 10, pieceId: 3, pieceTitle: 'Hallo Welt', position: 0, sheets: [] },
    ]);
    loginAsOrganizer(fixture);

    const first = fixture.nativeElement.querySelectorAll('.entry')[0] as HTMLElement;
    expect(first.querySelector('.entry__btn--pdf')?.textContent?.trim()).toBe('PDF laden');
    (first.querySelector('.entry__btn--pdf') as HTMLButtonElement).click();
    fixture.detectChanges();
    httpMock.expectOne('/api/pieces/3/sheets').flush([]);
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('app-piece-sheets-dialog') as HTMLElement;
    const fileInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [
      new File(['%PDF-1.4'], 'Gitarre.pdf', { type: 'application/pdf' }),
      new File(['%PDF-1.4'], 'Bass.pdf', { type: 'application/pdf' }),
    ];
    Object.defineProperty(fileInput, 'files', { value: files });
    fileInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/pieces/3/sheets');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush([SHEET_GUITAR, SHEET_BASS]);
    await settle(fixture);

    expect(dialog.textContent).toContain('2 Notenblätter hinzugefügt.');
    expect(first.querySelector('.entry__sheet')?.textContent?.trim()).toBe('Noten (2)');
  });

  it('should open a selected sheet in the viewer', async () => {
    const fixture = setup();
    loadConcertWithEntries(fixture, [
      {
        id: 5,
        setlistId: 10,
        pieceId: 3,
        pieceTitle: 'Hallo Welt',
        position: 0,
        sheets: [SHEET_GUITAR],
      },
    ]);

    const first = fixture.nativeElement.querySelectorAll('.entry')[0] as HTMLElement;
    (first.querySelector('.entry__btn--pdf') as HTMLButtonElement).click();
    fixture.detectChanges();
    httpMock.expectOne('/api/pieces/3/sheets').flush([SHEET_GUITAR]);
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('app-piece-sheets-dialog') as HTMLElement;
    (dialog.querySelectorAll('.sheet__btn')[0] as HTMLButtonElement).click();
    const req = httpMock.expectOne('/api/piece-sheets/101');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
    await settle(fixture);

    expect(fixture.nativeElement.querySelector('app-sheet-viewer')).toBeTruthy();
  });

  it('should download a selected sheet as an attachment', async () => {
    const fixture = setup();
    loadConcertWithEntries(fixture, [
      {
        id: 5,
        setlistId: 10,
        pieceId: 3,
        pieceTitle: 'Hallo Welt',
        position: 0,
        sheets: [SHEET_GUITAR],
      },
    ]);

    let savedFilename = '';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      savedFilename = this.download;
    });

    const first = fixture.nativeElement.querySelectorAll('.entry')[0] as HTMLElement;
    (first.querySelector('.entry__btn--pdf') as HTMLButtonElement).click();
    fixture.detectChanges();
    httpMock.expectOne('/api/pieces/3/sheets').flush([SHEET_GUITAR]);
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('app-piece-sheets-dialog') as HTMLElement;
    (dialog.querySelectorAll('.sheet__btn')[1] as HTMLButtonElement).click();
    const req = httpMock.expectOne('/api/piece-sheets/101?download=true');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
    await settle(fixture);

    expect(savedFilename).toBe('Gitarre.pdf');
    vi.restoreAllMocks();
  });

  it('should offer setlist downloads and save the info PDF', async () => {
    const fixture = setup();
    loadConcertWithEntries(fixture, [
      {
        id: 5,
        setlistId: 10,
        pieceId: 3,
        pieceTitle: 'Hallo Welt',
        position: 0,
        sheets: [SHEET_GUITAR],
      },
    ]);

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
    for (let i = 0; i < 1000 && !savedFilename; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      fixture.detectChanges();
    }

    expect(savedFilename).toBe('gigflow-hafenrocker-infos.pdf');
    expect(fixture.nativeElement.textContent).toContain('Infos als PDF gespeichert.');
    vi.restoreAllMocks();
  }, 15000);

  it('should open the sheet download dialog with a voice selection', () => {
    const fixture = setup();
    loadConcertWithEntries(fixture, [
      {
        id: 5,
        setlistId: 10,
        pieceId: 3,
        pieceTitle: 'Hallo Welt',
        position: 0,
        sheets: [SHEET_GUITAR, SHEET_BASS],
      },
    ]);

    const toggle = fixture.nativeElement.querySelector(
      '.setlist__download-btn',
    ) as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll(
      '.setlist__download-item',
    ) as NodeListOf<HTMLButtonElement>;
    expect(items.length).toBe(2);
    expect(items[1].disabled).toBe(false);
    items[1].click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector(
      'app-setlist-download-dialog',
    ) as HTMLElement;
    expect(dialog).toBeTruthy();
    expect(dialog.querySelectorAll('.download-row').length).toBe(1);
    expect(dialog.querySelector('.download-select--row')).toBeTruthy();
  });

  it('should show multiple media links and a clear playing/stopped demo state', async () => {
    const fixture = setup();
    loadConcertWithEntries(fixture, [{
      id: 5,
      setlistId: 10,
      pieceId: 3,
      pieceTitle: 'Hallo Welt',
      position: 0,
      sheets: [],
      demoAudios: [{ id: 20, pieceId: 3, label: 'Live', originalName: 'live.mp3', sortOrder: 0 }],
      links: [
        { id: 30, pieceId: 3, label: 'YouTube', url: 'https://youtu.be/abcdefghijk', sortOrder: 0 },
        { id: 31, pieceId: 3, label: 'Bandcamp', url: 'https://bandcamp.com/track/demo', sortOrder: 1 },
      ],
    }]);

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'o@gigflow.local', organizer: true, musicianId: null },
    });
    fixture.detectChanges();

    const first = fixture.nativeElement.querySelector('.entry') as HTMLElement;
    expect(first.querySelector('.entry__sheet--audio')?.textContent).toContain('Demo (1)');
    expect(first.querySelectorAll('.entry__sheet--youtube')).toHaveLength(2);
    expect(first.querySelectorAll('.entry__youtube-play')).toHaveLength(1);
    (first.querySelector('.entry__btn--audio') as HTMLButtonElement).click();
    const request = httpMock.expectOne('/api/pieces/3/demo-audios/20');
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/mpeg' }));
    await settle(fixture);

    expect(first.querySelector('.entry__player audio')).toBeTruthy();
    expect(first.querySelector('.entry__playing-label')?.textContent).toContain('Live');
    expect((first.querySelector('.entry__btn--audio') as HTMLButtonElement).textContent).toContain('Stop');
    (first.querySelector('.entry__btn--audio') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(first.querySelector('.entry__player')).toBeNull();

    const youtubePlay = first.querySelector('.entry__youtube-play') as HTMLButtonElement;
    youtubePlay.click();
    fixture.detectChanges();
    const iframe = first.querySelector('.entry__youtube-player iframe') as HTMLIFrameElement;
    expect(iframe.getAttribute('src')).toBe(
      'https://www.youtube-nocookie.com/embed/abcdefghijk?autoplay=1&rel=0',
    );
    expect(iframe.title).toContain('YouTube');
    youtubePlay.click();
    fixture.detectChanges();
    expect(first.querySelector('.entry__youtube-player')).toBeNull();
  });

  it('should upload multiple demo MP3s for one tune', () => {
    const fixture = setup();
    loadConcertWithEntries(fixture, [
      { id: 5, setlistId: 10, pieceId: 3, pieceTitle: 'Hallo Welt', position: 0, sheets: [] },
    ]);
    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'o@gigflow.local', organizer: true, musicianId: null },
    });
    fixture.detectChanges();

    const first = fixture.nativeElement.querySelector('.entry') as HTMLElement;
    (first.querySelector('.entry__btn--audio') as HTMLButtonElement).click();
    const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      value: [
        new File(['a'], 'live.mp3', { type: 'audio/mpeg' }),
        new File(['b'], 'studio.mp3', { type: 'audio/mpeg' }),
      ],
    });
    input.dispatchEvent(new Event('change'));
    const upload = httpMock.expectOne('/api/pieces/3/demo-audios');
    expect(upload.request.method).toBe('POST');
    expect((upload.request.body as FormData).getAll('files')).toHaveLength(2);
    upload.flush([
      { id: 20, pieceId: 3, label: 'live', originalName: 'live.mp3', sortOrder: 0 },
      { id: 21, pieceId: 3, label: 'studio', originalName: 'studio.mp3', sortOrder: 1 },
    ]);
    fixture.detectChanges();

    expect(first.querySelector('.entry__sheet--audio')?.textContent).toContain('Demo (2)');
    expect(first.querySelectorAll('.entry__btn--audio')).toHaveLength(3);
  });

  it('should remove one demo and restore it on undo', async () => {
    const fixture = setup();
    loadConcertWithEntries(fixture, [{
      id: 5,
      setlistId: 10,
      pieceId: 3,
      pieceTitle: 'Hallo Welt',
      position: 0,
      sheets: [],
      demoAudios: [{ id: 20, pieceId: 3, label: 'Live', originalName: 'live.mp3', sortOrder: 0 }],
    }]);
    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'o@gigflow.local', organizer: true, musicianId: null },
    });
    fixture.detectChanges();

    const first = fixture.nativeElement.querySelector('.entry') as HTMLElement;
    (first.querySelector('.entry__btn--audio-remove') as HTMLButtonElement).click();
    const download = httpMock.expectOne('/api/pieces/3/demo-audios/20');
    download.flush(new Blob(['abc'], { type: 'audio/mpeg' }));
    await settle(fixture);
    const remove = httpMock.expectOne('/api/pieces/3/demo-audios/20');
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null, { status: 204, statusText: 'No Content' });
    await settle(fixture);
    expect(first.querySelector('.entry__sheet--audio')).toBeNull();

    TestBed.inject(ToastService).runAction();
    const restore = httpMock.expectOne('/api/pieces/3/demo-audios');
    expect(restore.request.method).toBe('POST');
    expect(((restore.request.body as FormData).get('files') as File).name).toBe('live.mp3');
    restore.flush([
      { id: 22, pieceId: 3, label: 'live', originalName: 'live.mp3', sortOrder: 1 },
    ]);
    await settle(fixture);
    expect(first.querySelector('.entry__sheet--audio')?.textContent).toContain('Demo (1)');
  });

  it('should add multiple links and undo removal of one link', async () => {
    const fixture = setup();
    loadConcertWithEntries(fixture, [
      { id: 5, setlistId: 10, pieceId: 3, pieceTitle: 'Hallo Welt', position: 0, sheets: [], links: [] },
    ]);
    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'o@gigflow.local', organizer: true, musicianId: null },
    });
    fixture.detectChanges();

    const first = fixture.nativeElement.querySelector('.entry') as HTMLElement;
    (first.querySelector('.entry__btn--youtube') as HTMLButtonElement).click();
    fixture.detectChanges();
    const inputs = first.querySelectorAll('.entry__link-form input');
    (inputs[0] as HTMLInputElement).value = 'Live';
    inputs[0].dispatchEvent(new Event('input'));
    (inputs[1] as HTMLInputElement).value = 'https://youtu.be/abc123';
    inputs[1].dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (first.querySelector('.entry__link-form .setlist__submit') as HTMLButtonElement).click();
    const create = httpMock.expectOne('/api/pieces/3/links');
    expect(create.request.body).toEqual({ label: 'Live', url: 'https://youtu.be/abc123' });
    create.flush({ id: 30, pieceId: 3, label: 'Live', url: 'https://youtu.be/abc123', sortOrder: 0 });
    await settle(fixture);
    expect(first.querySelector('.entry__sheet--youtube')?.textContent).toBe('Live');

    (first.querySelector('.entry__btn--media-danger') as HTMLButtonElement).click();
    const remove = httpMock.expectOne('/api/pieces/3/links/30');
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null, { status: 204, statusText: 'No Content' });
    await settle(fixture);
    expect(first.querySelector('.entry__sheet--youtube')).toBeNull();

    TestBed.inject(ToastService).runAction();
    const restore = httpMock.expectOne('/api/pieces/3/links');
    expect(restore.request.body).toEqual({ label: 'Live', url: 'https://youtu.be/abc123' });
    restore.flush({ id: 31, pieceId: 3, label: 'Live', url: 'https://youtu.be/abc123', sortOrder: 0 });
    await settle(fixture);
    expect(first.querySelector('.entry__sheet--youtube')?.textContent).toBe('Live');
  });

  it('should save and display tune notes', async () => {
    const fixture = setup();
    loadConcertWithEntries(fixture, [
      { id: 5, setlistId: 10, pieceId: 3, pieceTitle: 'Hallo Welt', position: 0, sheets: [] },
    ]);
    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'o@gigflow.local', organizer: true, musicianId: null },
    });
    fixture.detectChanges();
    const first = fixture.nativeElement.querySelector('.entry') as HTMLElement;
    (first.querySelector('[aria-label="Tune-Notiz bearbeiten"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const textarea = first.querySelector('.entry__notes-input') as HTMLTextAreaElement;
    textarea.value = 'Intro zweimal, dann Refrain';
    textarea.dispatchEvent(new Event('input'));
    (first.querySelector('.entry__notes-form .setlist__submit') as HTMLButtonElement).click();
    const save = httpMock.expectOne('/api/pieces/3');
    expect(save.request.method).toBe('PUT');
    expect(save.request.body).toEqual({ title: 'Hallo Welt', notes: 'Intro zweimal, dann Refrain' });
    save.flush({ id: 3, title: 'Hallo Welt', notes: 'Intro zweimal, dann Refrain' });
    await settle(fixture);
    expect(first.querySelector('.entry__notes')?.textContent).toContain('Intro zweimal, dann Refrain');
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
      locationDescription: { set(v: string): void };
      locationPhone: { set(v: string): void };
      saveLocation(): void;
    };
    comp.locationType.set('HOTEL');
    comp.locationName.set('Hotel Stadt');
    comp.locationAddress.set('Bahnhofstraße 1, 20095 Hamburg');
    comp.locationDescription.set('Check-in ab 15 Uhr');
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
      note: 'Check-in ab 15 Uhr',
      phone: '040 555 666',
      mapsUrl: null,
    });
    req.flush({
      id: 9,
      eventId: 1,
      type: 'HOTEL',
      name: 'Hotel Stadt',
      address: 'Bahnhofstraße 1, 20095 Hamburg',
      note: 'Check-in ab 15 Uhr',
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
      locationDescription: { set(v: string): void };
      saveLocation(): void;
    };
    comp.locationName.set('Pizzeria Da Miro (Tisch reserviert)');
    comp.locationDescription.set('Tisch für 8 Personen');
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

    expect(fixture.nativeElement.textContent).toContain('Noch keine Orte für diesen Termin erfasst.');
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
    expect(fixture.nativeElement.textContent).toContain('Noch keine Orte für diesen Termin erfasst.');
  });

  it('should show a delete action for organizers and delete the event after confirmation', async () => {
    vi.spyOn(TestBed.inject(EventUndoService), 'capture').mockResolvedValue([]);
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
    await settle(fixture);
    const req = httpMock.expectOne('/api/events/1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await settle(fixture);
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
    httpMock.expectOne('/api/bands').flush([
      { id: 4, name: 'Hafenrocker', genre: 'Rock' },
      { id: 8, name: 'Nordlichter', genre: 'Jazz' },
    ]);
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('app-modal-dialog') as HTMLElement;
    expect(dialog.textContent).toContain('Hafenrocker');
    expect(dialog.textContent).toContain('Nordlichter');
    const bandButtons = dialog.querySelectorAll('.band-invite__button');
    (bandButtons[1] as HTMLButtonElement).click();

    const req = httpMock.expectOne('/api/events/1/invite-band/8');
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
    expect(el.querySelector('app-modal-dialog')).toBeNull();
  });
});
    

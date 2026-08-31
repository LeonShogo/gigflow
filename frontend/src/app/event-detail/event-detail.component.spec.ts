import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CdkDropList } from '@angular/cdk/drag-drop';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { EventDetailComponent } from './event-detail.component';
import type { EventItem } from '../dashboard/event.model';

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
  order: ['members', 'setlist', 'rehearsals', 'equipment', 'schedule'],
  collapsed: {},
};

describe('EventDetailComponent', () => {
  let httpMock: HttpTestingController;

  function setup(id: string): ComponentFixture<EventDetailComponent> {
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
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush(entries);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([])
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
    const fixture = setup('1');
    loadConcert(fixture);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.title')?.textContent).toBe('Hafenrocker');
    expect(el.querySelector('.type')?.textContent?.trim()).toBe('Gig');
    const panels = el.querySelectorAll('.panel');
    expect(panels.length).toBe(5);
    expect(el.textContent).toContain('Setlist');
    expect(el.textContent).toContain('Equipment');
  });

  it('should render participants with name, instrument, status and opt-in email', () => {
    const fixture = setup('1');
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
    const fixture = setup('1');
    loadConcert(fixture);

    expect(fixture.nativeElement.textContent).toContain('Noch keine Musiker:innen');
  });

  it('should render rehearsals for the concert, sorted by date', () => {
    const fixture = setup('1');
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
    const fixture = setup('1');
    loadConcert(fixture);

    expect(fixture.nativeElement.textContent).toContain('Noch keine Proben für diesen Gig geplant.');
  });

  it('should open the setlist and render pieces in order', () => {
    const fixture = setup('1');
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
    const fixture = setup('1');
    loadConcert(fixture);

    expect(fixture.nativeElement.textContent).toContain('Noch keine Stücke in der Setlist.');
  });

  it('should render panels from the stored layout order', () => {
    const fixture = setup('1');
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush({
      order: ['equipment', 'members', 'schedule', 'rehearsals', 'setlist'],
      collapsed: {},
    });
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([])
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();

    const titles = fixture.nativeElement.querySelectorAll('.panel__title');
    expect((titles[0] as HTMLElement).textContent?.trim()).toBe('Equipment');
    expect((titles[1] as HTMLElement).textContent?.trim()).toBe('Musiker / Zusagen');
  });

  it('should reorder panels via drag & drop and persist', () => {
    const fixture = setup('1');
    loadConcert(fixture);

    const board = fixture.debugElement.query(By.css('.board'));
    const dropList = board.injector.get(CdkDropList) as CdkDropList<string[]>;
    dropList.dropped.emit({
      previousIndex: 0,
      currentIndex: 2,
      item: null as never,
      container: dropList,
      previousContainer: dropList,
      isPointerOverContainer: true,
      distance: { x: 0, y: 0 },
      dropPoint: { x: 0, y: 0 },
      event: new MouseEvent('mouseup'),
    });
    fixture.detectChanges();

    const saveReq = httpMock.expectOne('/api/events/1/layout');
    expect(saveReq.request.method).toBe('PUT');
    expect((saveReq.request.body as { order: string[] }).order[0]).toBe('setlist');
    saveReq.flush({
      order: ['setlist', 'rehearsals', 'members', 'equipment', 'schedule'],
      collapsed: {},
    });
    fixture.detectChanges();

    const titles = fixture.nativeElement.querySelectorAll('.panel__title');
    expect((titles[0] as HTMLElement).textContent?.trim()).toBe('Setlist');
    expect((titles[1] as HTMLElement).textContent?.trim()).toBe('Proben zu diesem Gig');
  });

  it('should collapse and reopen a section and persist', () => {
    const fixture = setup('1');
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
    });
    fixture.detectChanges();

    const membersCollapse2 = el.querySelector(
      '.panel--members .panel__collapse',
    ) as HTMLButtonElement;
    membersCollapse2.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Noch keine Musiker:innen');
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
  });

  it('should reopen to default state when no stored collapsed state exists', () => {
    const fixture = setup('1');
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
    fixture.detectChanges();
    httpMock.expectOne('/api/setlist-entries/by-setlist/10').flush([]);
    httpMock.expectOne('/api/equipment-requirements/event/1').flush([])
    httpMock.expectOne('/api/schedule-items/event/1').flush([]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.panel').length).toBe(5);
    expect(el.textContent).toContain('Noch keine Musiker:innen');
  });

  it('should add a new piece to the setlist', () => {
    const fixture = setup('1');
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
    const fixture = setup('1');
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
    const fixture = setup('1');
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
    const fixture = setup('1');
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
    const fixture = setup('1');
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
    const fixture = setup('1');
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
    const fixture = setup('1');
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(null, {
      status: 404,
      statusText: 'Not Found',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('p[role="alert"]')).toBeTruthy();
  });

  it('should render equipment requirements with status chips and responsibility', () => {
    const fixture = setup('1');
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
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
    const fixture = setup('1');
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
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
    const fixture = setup('1');
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
    const fixture = setup('1');
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
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
    const fixture = setup('1');
    loadConcert(fixture);

    expect(fixture.nativeElement.textContent).toContain('Noch kein Ablauf für diesen Gig erfasst.');
  });

  it('should add a new schedule item', () => {
    const fixture = setup('1');
    loadConcert(fixture);

    const comp = fixture.componentInstance as unknown as {
      scheduleFormOpen: { set(v: boolean): void };
      scheduleLabel: { set(v: string): void };
      scheduleTime: { set(v: string): void };
      saveScheduleItem(): void;
    };
    comp.scheduleFormOpen.set(true);
    comp.scheduleLabel.set('Soundcheck');
    comp.scheduleTime.set('17:00');
    fixture.detectChanges();

    comp.saveScheduleItem();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/schedule-items');
    expect(req.request.method).toBe('POST');
    req.flush({ id: 3, eventId: 1, label: 'Soundcheck', time: '17:00' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Soundcheck');
    expect(fixture.nativeElement.textContent).toContain('Zeitpunkt hinzugefügt.');
  });

  it('should edit an existing schedule item', () => {
    const fixture = setup('1');
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
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
      scheduleLabel: { set(v: string): void };
      scheduleTime: { set(v: string): void };
      saveScheduleItem(): void;
    };
    comp.scheduleLabel.set('Soundcheck (neu)');
    comp.scheduleTime.set('18:00');
    fixture.detectChanges();
    comp.saveScheduleItem();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/schedule-items/5');
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 5, eventId: 1, label: 'Soundcheck (neu)', time: '18:00' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Soundcheck (neu)');
    expect(fixture.nativeElement.textContent).toContain('Zeitpunkt gespeichert.');
  });

  it('should remove a schedule item', () => {
    const fixture = setup('1');
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
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
    const fixture = setup('1');
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
    const fixture = setup('1');
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
    const fixture = setup('1');
    fixture.detectChanges();
    httpMock.expectOne('/api/events/1').flush(CONCERT);
    fixture.detectChanges();
    httpMock.expectOne('/api/event-participations/event/1').flush([]);
    httpMock.expectOne('/api/events/by-concert/1').flush([
      { id: 7, title: 'Studio-Probe', type: 'REHEARSAL', dateTime: '2026-09-05T18:00:00' },
    ]);
    httpMock.expectOne('/api/setlists/event/1').flush(EMPTY_SETLIST);
    httpMock.expectOne('/api/events/1/layout').flush(DEFAULT_LAYOUT);
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
});
    

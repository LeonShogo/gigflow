import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { DashboardComponent } from './dashboard.component';
import { EventUndoService, type EventUndoSnapshot } from './event-undo.service';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../notifications/toast.service';
import type { EventItem } from './event.model';

const MOCK_EVENTS: EventItem[] = [
  {
    id: 1,
    title: 'Hafenrocker',
    type: 'CONCERT',
    dateTime: '2026-09-12T20:00:00',
    createdByUserId: 1,
  },
  {
    id: 2,
    title: 'Donnerstagsprobe',
    type: 'REHEARSAL',
    dateTime: '2026-09-10T18:00:00',
    createdByUserId: 1,
  },
  {
    id: 3,
    title: 'Lagerfeuer-Open-Air',
    type: 'CONCERT',
    dateTime: '2026-10-03T19:00:00',
    createdByUserId: 1,
  },
];

function toSnapshot(event: EventItem): EventUndoSnapshot {
  return {
    eventId: event.id,
    request: {
      title: event.title,
      dateTime: event.dateTime,
      type: event.type,
      bandId: 1,
      concertId: event.concertId ?? null,
    },
    layout: null,
    hasSetlist: false,
    participations: [],
    entries: [],
    scheduleItems: [],
    locations: [],
    requirements: [],
  };
}

function clickFilter(fixture: ComponentFixture<DashboardComponent>, label: string): void {
  const el: HTMLElement = fixture.nativeElement;
  const buttons: HTMLButtonElement[] = Array.from(
    el.querySelectorAll('.filter'),
  ) as HTMLButtonElement[];
  const target = buttons.find((button) => button.textContent?.trim() === label);
  target?.click();
  fixture.detectChanges();
}

function visibleCards(fixture: ComponentFixture<DashboardComponent>): HTMLElement[] {
  const el: HTMLElement = fixture.nativeElement;
  return Array.from(el.querySelectorAll('.event:not(.event--empty)')) as HTMLElement[];
}

describe('DashboardComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  async function settle(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
  }

  it('should load and sort all events by date ascending', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    const request = httpMock.expectOne('/api/events');
    request.flush(MOCK_EVENTS);
    fixture.detectChanges();

    const titles = Array.from(
      fixture.nativeElement.querySelectorAll('.event__title'),
    ).map((node) => (node as HTMLElement).textContent);
    expect(titles).toEqual(['Donnerstagsprobe', 'Hafenrocker', 'Lagerfeuer-Open-Air']);
  });

  it('should filter to concerts when Gigs is selected', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/events').flush(MOCK_EVENTS);
    fixture.detectChanges();

    clickFilter(fixture, 'Gigs');
    const cards = visibleCards(fixture);
    expect(cards.length).toBe(2);
    expect(cards[0].querySelector('.event__type')?.textContent?.trim()).toBe('Gig');
  });

  it('should filter to rehearsals when Proben is selected', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/events').flush(MOCK_EVENTS);
    fixture.detectChanges();

    clickFilter(fixture, 'Proben');
    const cards = visibleCards(fixture);
    expect(cards.length).toBe(1);
    expect(cards[0].querySelector('.event__type')?.textContent?.trim()).toBe('Probe');
  });

  it('should show an error message when loading fails', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/events').flush(null, {
      status: 500,
      statusText: 'Server Error',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('p[role="alert"]')).toBeTruthy();
  });

  it('should delete an event with its linked rehearsal and restore both on undo', async () => {
    const concert = MOCK_EVENTS[0];
    const rehearsal = MOCK_EVENTS[1];
    const snapshots = [toSnapshot(concert), toSnapshot(rehearsal)];
    const undo = TestBed.inject(EventUndoService);
    vi.spyOn(undo, 'capture').mockResolvedValue(snapshots);
    vi.spyOn(undo, 'restore').mockResolvedValue(
      new Map<number, EventItem>([
        [1, { ...concert, id: 10 }],
        [2, { ...rehearsal, id: 11 }],
      ]),
    );

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/events').flush(MOCK_EVENTS);
    fixture.detectChanges();

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'o@gigflow.local', musicianId: 3 },
    });
    fixture.detectChanges();

    const items = Array.from(
      fixture.nativeElement.querySelectorAll('.events__item'),
    ) as HTMLElement[];
    const concertItem = items.find((item) => item.textContent?.includes('Hafenrocker'));
    expect(concertItem).toBeTruthy();

    (concertItem!.querySelector('.event__delete') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(concertItem!.textContent).toContain('Hafenrocker');

    (concertItem!.querySelector('.event__confirm-btn--danger') as HTMLButtonElement).click();
    await settle();
    const req = httpMock.expectOne('/api/events/1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await settle();
    fixture.detectChanges();

    let titles = Array.from(
      fixture.nativeElement.querySelectorAll('.event__title'),
    ).map((node) => (node as HTMLElement).textContent);
    expect(titles).toEqual(['Lagerfeuer-Open-Air']);

    TestBed.inject(ToastService).runAction();
    await settle();
    fixture.detectChanges();

    titles = Array.from(
      fixture.nativeElement.querySelectorAll('.event__title'),
    ).map((node) => (node as HTMLElement).textContent);
    expect(titles).toEqual(['Donnerstagsprobe', 'Hafenrocker', 'Lagerfeuer-Open-Air']);
  });

  it('should delete all events after confirmation', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/events').flush(MOCK_EVENTS);
    fixture.detectChanges();

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'o@gigflow.local', musicianId: 3 },
    });
    fixture.detectChanges();

    const deleteAll = fixture.nativeElement.querySelector(
      '.page-head__delete',
    ) as HTMLButtonElement;
    expect(deleteAll.textContent).toContain('Alle Termine löschen');
    deleteAll.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Alle 3 Termine');
    const confirm = fixture.nativeElement.querySelector(
      '.bulk-confirm__btn--danger',
    ) as HTMLButtonElement;
    confirm.click();

    const req = httpMock.expectOne('/api/events');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.event:not(.event--empty)').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.page-head__delete')).toBeNull();
  });

  it('should hide delete actions for events owned by another account', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/events').flush(MOCK_EVENTS);
    fixture.detectChanges();

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'm@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 2, email: 'm@gigflow.local', musicianId: 4 },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.event__delete')).toBeNull();
    expect(fixture.nativeElement.querySelector('.page-head__delete')).toBeNull();
  });
});

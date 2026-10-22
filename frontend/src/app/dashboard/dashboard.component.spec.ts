import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../auth/auth.service';
import type { EventItem } from './event.model';

const MOCK_EVENTS: EventItem[] = [
  {
    id: 1,
    title: 'Hafenrocker',
    type: 'CONCERT',
    dateTime: '2026-09-12T20:00:00',
  },
  {
    id: 2,
    title: 'Donnerstagsprobe',
    type: 'REHEARSAL',
    dateTime: '2026-09-10T18:00:00',
  },
  {
    id: 3,
    title: 'Lagerfeuer-Open-Air',
    type: 'CONCERT',
    dateTime: '2026-10-03T19:00:00',
  },
];

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
  });

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

  it('should delete an event after confirmation and update the list', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/events').flush(MOCK_EVENTS);
    fixture.detectChanges();

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'o@gigflow.local', organizer: true, musicianId: null },
    });
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.events__item');
    const firstDelete = items[0].querySelector('.event__delete') as HTMLButtonElement;
    expect(firstDelete).toBeTruthy();
    firstDelete.click();
    fixture.detectChanges();
    expect(items[0].textContent).toContain('Donnerstagsprobe');

    (items[0].querySelector('.event__confirm-btn--danger') as HTMLButtonElement).click();
    const req = httpMock.expectOne('/api/events/2');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    const titles = Array.from(
      fixture.nativeElement.querySelectorAll('.event__title'),
    ).map((node) => (node as HTMLElement).textContent);
    expect(titles).toEqual(['Hafenrocker', 'Lagerfeuer-Open-Air']);
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
      user: { id: 1, email: 'o@gigflow.local', organizer: true, musicianId: null },
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

  it('should hide the delete action for non-organizers', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/events').flush(MOCK_EVENTS);
    fixture.detectChanges();

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'm@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 2, email: 'm@gigflow.local', organizer: false, musicianId: 3 },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.event__delete')).toBeNull();
    expect(fixture.nativeElement.querySelector('.page-head__delete')).toBeNull();
  });
});

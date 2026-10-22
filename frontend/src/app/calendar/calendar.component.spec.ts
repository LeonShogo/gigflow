import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import type { EventItem } from '../dashboard/event.model';

import { CalendarComponent } from './calendar.component';

const EVENTS: EventItem[] = [
  {
    id: 1,
    title: 'September-Gig',
    type: 'CONCERT',
    dateTime: '2026-09-12T20:00:00',
  },
  {
    id: 2,
    title: 'Oktober-Probe',
    type: 'REHEARSAL',
    dateTime: '2026-10-03T18:00:00',
  },
];

describe('CalendarComponent', () => {
  let httpMock: HttpTestingController;

  function createLoaded(): ComponentFixture<CalendarComponent> {
    const fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/events').flush(EVENTS);
    fixture.detectChanges();
    return fixture;
  }

  function loginAsOrganizer(fixture: ComponentFixture<CalendarComponent>): void {
    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'o@gigflow.local', organizer: true, musicianId: null },
    });
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('exports the displayed month by default', () => {
    const fixture = createLoaded();
    const component = fixture.componentInstance as unknown as {
      cursor: { set(value: Date): void };
      eventsToExport: () => EventItem[];
    };
    component.cursor.set(new Date(2026, 8, 1));
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('#cal-export-scope') as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.textContent?.trim())).toEqual([
      'Aktueller Monat',
      'Alle Termine',
    ]);
    expect(component.eventsToExport().map((event) => event.title)).toEqual(['September-Gig']);
  });

  it('can switch the export to all events', () => {
    const fixture = createLoaded();
    const component = fixture.componentInstance as unknown as {
      cursor: { set(value: Date): void };
      eventsToExport: () => EventItem[];
    };
    component.cursor.set(new Date(2026, 8, 1));
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('#cal-export-scope') as HTMLSelectElement;
    select.value = 'all';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(component.eventsToExport().map((event) => event.title)).toEqual([
      'September-Gig',
      'Oktober-Probe',
    ]);
  });

  it('shows the delete-all action only for organizers', () => {
    const fixture = createLoaded();

    expect(fixture.nativeElement.querySelector('.cal__delete')).toBeNull();
  });

  it('deletes all events after confirmation', () => {
    const fixture = createLoaded();
    loginAsOrganizer(fixture);

    const deleteButton = fixture.nativeElement.querySelector('.cal__delete') as HTMLButtonElement;
    expect(deleteButton.textContent).toContain('Alle Termine löschen');
    deleteButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Alle 2 Termine');
    const confirmButton = fixture.nativeElement.querySelector(
      '.cal__confirm-btn--danger',
    ) as HTMLButtonElement;
    confirmButton.click();

    const req = httpMock.expectOne('/api/events');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Alle Termine gelöscht.');
    expect(fixture.nativeElement.querySelector('.cal__delete')).toBeNull();
  });
});

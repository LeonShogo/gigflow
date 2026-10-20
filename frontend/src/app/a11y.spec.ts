import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it } from 'vitest';

import { LoginComponent } from './auth/login.component';
import { CalendarComponent } from './calendar/calendar.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import type { EventItem } from './dashboard/event.model';
import { MusicianListComponent } from './musicians/musician-list.component';
import type { Musician } from './musicians/musician.model';
import { EventPrintDemoComponent } from './print/event-print-demo.component';
import { expectNoA11yViolations } from './testing/expect-no-axe-violations';

const EVENTS: EventItem[] = [
  { id: 1, title: 'Hafenrocker', type: 'CONCERT', dateTime: '2026-09-12T20:00:00' },
  { id: 2, title: 'Donnerstagsprobe', type: 'REHEARSAL', dateTime: '2026-09-10T18:00:00' },
];

const MUSICIANS: Musician[] = [
  { id: 1, firstName: 'Anna', lastName: 'Becker', instrument: 'Gesang', email: 'anna@example.org' },
  { id: 2, firstName: 'Jonas', lastName: 'Keller', instrument: 'Gitarre', email: '' },
];

function configure(imports: unknown[], extraProviders: unknown[] = []): HttpTestingController {
  TestBed.configureTestingModule({
    imports,
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      ...extraProviders,
    ],
  });
  return TestBed.inject(HttpTestingController);
}

describe('Accessibility (axe)', () => {
  it('login page has no violations', async () => {
    configure([LoginComponent]);
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    await expectNoA11yViolations(fixture.nativeElement);
  });

  it('dashboard has no violations', async () => {
    const httpMock = configure([DashboardComponent]);
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/events').flush(EVENTS);
    fixture.detectChanges();
    await expectNoA11yViolations(fixture.nativeElement);
  });

  it('calendar has no violations', async () => {
    const httpMock = configure([CalendarComponent]);
    const fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/events').flush(EVENTS);
    fixture.detectChanges();
    await expectNoA11yViolations(fixture.nativeElement);
  });

  it('musician list has no violations', async () => {
    const httpMock = configure([MusicianListComponent]);
    const fixture = TestBed.createComponent(MusicianListComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/musicians').flush(MUSICIANS);
    fixture.detectChanges();
    await expectNoA11yViolations(fixture.nativeElement);
  });

  it('print demo has no violations', async () => {
    configure([EventPrintDemoComponent]);
    const fixture = TestBed.createComponent(EventPrintDemoComponent);
    fixture.detectChanges();
    await expectNoA11yViolations(fixture.nativeElement);
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    httpMock.verify();
  });

  it('opens an export dialog with both scopes', () => {
    const fixture = createLoaded();
    const component = fixture.componentInstance as unknown as {
      cursor: { set(value: Date): void };
    };
    component.cursor.set(new Date(2026, 8, 1));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.cal__export') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('.cal__export-option-label'),
    ).map((label) => (label as HTMLElement).textContent?.trim());
    const metas = Array.from(
      fixture.nativeElement.querySelectorAll('.cal__export-option-meta'),
    ).map((meta) => (meta as HTMLElement).textContent?.replace(/\s+/g, ' ').trim());
    expect(labels).toEqual(['Aktueller Monat', 'Alle Termine']);
    expect(metas).toEqual(['September 2026 · 1 Termin', '2 Termine']);
  });

  it('exports the chosen scope and closes the dialog', () => {
    const fixture = createLoaded();
    const component = fixture.componentInstance as unknown as {
      cursor: { set(value: Date): void };
    };
    component.cursor.set(new Date(2026, 8, 1));
    fixture.detectChanges();

    let filename = '';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      filename = this.download;
    });

    (fixture.nativeElement.querySelector('.cal__export') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelectorAll('.cal__export-option')[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(filename).toBe('gigflow-kalender-2026-09.ics');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();

    (fixture.nativeElement.querySelector('.cal__export') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelectorAll('.cal__export-option')[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(filename).toBe('gigflow-kalender-alle-termine.ics');
  });

  it('disables the export when there are no events', () => {
    const fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/events').flush([]);
    fixture.detectChanges();

    const exportButton = fixture.nativeElement.querySelector(
      '.cal__export',
    ) as HTMLButtonElement;
    expect(exportButton.disabled).toBe(true);
  });
});

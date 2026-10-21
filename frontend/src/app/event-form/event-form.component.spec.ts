import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';

import { EventFormComponent } from './event-form.component';

function setInput(fixture: ComponentFixture<EventFormComponent>, selector: string, value: string): void {
  const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  fixture.detectChanges();
}

describe('EventFormComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventFormComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should render the form fields', () => {
    const fixture = TestBed.createComponent(EventFormComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/bands').flush([{ id: 1, name: 'GigFlow Quartett' }]);
    httpMock.expectOne('/api/events').flush([]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('input[formControlName="title"]')).toBeTruthy();
    expect(el.querySelector('input[formControlName="date"]')).toBeTruthy();
    expect(el.querySelector('input[formControlName="time"]')).toBeTruthy();
    expect(el.querySelector('select[formControlName="concert"]') === null).toBe(true);
  });

  it('should reveal the concert select for a rehearsal', () => {
    const fixture = TestBed.createComponent(EventFormComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/bands').flush([{ id: 1, name: 'GigFlow Quartett' }]);
    httpMock.expectOne('/api/events').flush([]);
    fixture.detectChanges();

    const radios = fixture.nativeElement.querySelectorAll('input[formControlName="type"]') as NodeListOf<HTMLInputElement>;
    const rehearsal = Array.from(radios).find((radio) => radio.value === 'REHEARSAL');
    rehearsal!.checked = true;
    rehearsal!.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('select[formControlName="concert"]')).toBeTruthy();
  });

  it('should submit a valid concert as an event request and navigate to the dashboard', async () => {
    const fixture = TestBed.createComponent(EventFormComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/bands').flush([{ id: 1, name: 'GigFlow Quartett' }]);
    httpMock.expectOne('/api/events').flush([]);
    fixture.detectChanges();

    setInput(fixture, 'input[formControlName="title"]', 'Sommerfest');
    setInput(fixture, 'input[formControlName="date"]', '2026-09-12');
    setInput(fixture, 'input[formControlName="time"]', '20:00');

    const submit = fixture.nativeElement.querySelector('.submit') as HTMLButtonElement;
    submit.click();

    const request = httpMock.expectOne('/api/events');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      title: 'Sommerfest',
      dateTime: '2026-09-12T20:00:00',
      type: 'CONCERT',
      bandId: 1,
      concertId: null,
    });
    request.flush({
      id: 9,
      title: 'Sommerfest',
      type: 'CONCERT',
      dateTime: '2026-09-12T20:00:00',
    });

    await fixture.whenStable();
    fixture.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('should show a band picker when more than one band exists', () => {
    const fixture = TestBed.createComponent(EventFormComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/bands').flush([
      { id: 1, name: 'GigFlow Quartett' },
      { id: 2, name: 'The Dockyarders' },
    ]);
    httpMock.expectOne('/api/events').flush([]);
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector(
      'select[formControlName="bandId"]',
    ) as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.options.length).toBe(2);
  });

  it('should hide the band picker when only one band exists', () => {
    const fixture = TestBed.createComponent(EventFormComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/bands').flush([{ id: 1, name: 'GigFlow Quartett' }]);
    httpMock.expectOne('/api/events').flush([]);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('select[formControlName="bandId"]'),
    ).toBeNull();
  });

  it('should show an error when saving fails', () => {
    const fixture = TestBed.createComponent(EventFormComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/bands').flush([{ id: 1, name: 'GigFlow Quartett' }]);
    httpMock.expectOne('/api/events').flush([]);
    fixture.detectChanges();

    setInput(fixture, 'input[formControlName="title"]', 'Sommerfest');
    setInput(fixture, 'input[formControlName="date"]', '2026-09-12');
    setInput(fixture, 'input[formControlName="time"]', '20:00');

    const submit = fixture.nativeElement.querySelector('.submit') as HTMLButtonElement;
    submit.click();

    httpMock.expectOne('/api/events').flush(null, {
      status: 500,
      statusText: 'Server Error',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.error[role="alert"]')).toBeTruthy();
  });
});

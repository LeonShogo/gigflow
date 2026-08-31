import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { MusicianFormComponent } from './musician-form.component';

@Component({ template: '' })
class NoopComponent {}

interface FixtureSetup {
  fixture: ComponentFixture<MusicianFormComponent>;
  httpMock: HttpTestingController;
  router: Router;
}

function setInput(fixture: ComponentFixture<MusicianFormComponent>, selector: string, value: string): void {
  const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  fixture.detectChanges();
}

function create(params: Record<string, string>): FixtureSetup {
  TestBed.overrideProvider(ActivatedRoute, {
    useValue: { paramMap: of(convertToParamMap(params)) },
  });
  const fixture = TestBed.createComponent(MusicianFormComponent);
  fixture.detectChanges();
  return {
    fixture,
    httpMock: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router),
  };
}

describe('MusicianFormComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MusicianFormComponent],
      providers: [
        provideRouter([{ path: '**', component: NoopComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('should create a new musician via POST and navigate to the list', async () => {
    const { fixture, httpMock, router } = create({});
    expect(fixture.nativeElement.textContent).toContain('Musiker:in hinzufügen');

    setInput(fixture, 'input[formControlName="firstName"]', 'Mia');
    setInput(fixture, 'input[formControlName="lastName"]', 'Sommer');
    setInput(fixture, 'input[formControlName="instrument"]', 'Schlagzeug');
    setInput(fixture, 'input[formControlName="email"]', 'mia@example.org');

    const submit = fixture.nativeElement.querySelector('.submit') as HTMLButtonElement;
    submit.click();

    const request = httpMock.expectOne('/api/musicians');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      firstName: 'Mia',
      lastName: 'Sommer',
      instrument: 'Schlagzeug',
      email: 'mia@example.org',
    });
    request.flush({ id: 7, firstName: 'Mia', lastName: 'Sommer' });

    await fixture.whenStable();
    fixture.detectChanges();
    expect(router.url).toBe('/musicians');
  });

  it('should prefill and update an existing musician via PUT', async () => {
    const { fixture, httpMock, router } = create({ id: '5' });
    httpMock.expectOne('/api/musicians/5').flush({
      id: 5,
      firstName: 'Anna',
      lastName: 'Becker',
      instrument: 'Gesang',
      email: 'anna@example.org',
    });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Musiker:in bearbeiten');
    expect((el.querySelector('input[formControlName="firstName"]') as HTMLInputElement).value).toBe('Anna');

    setInput(fixture, 'input[formControlName="lastName"]', 'Meyer');
    const submit = el.querySelector('.submit') as HTMLButtonElement;
    submit.click();

    const request = httpMock.expectOne('/api/musicians/5');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      firstName: 'Anna',
      lastName: 'Meyer',
      instrument: 'Gesang',
      email: 'anna@example.org',
    });
    request.flush({ id: 5, firstName: 'Anna', lastName: 'Meyer' });

    await fixture.whenStable();
    fixture.detectChanges();
    expect(router.url).toBe('/musicians');
  });

  it('should show an error when saving fails', () => {
    const { fixture, httpMock } = create({});
    setInput(fixture, 'input[formControlName="firstName"]', 'Mia');
    setInput(fixture, 'input[formControlName="lastName"]', 'Sommer');

    const submit = fixture.nativeElement.querySelector('.submit') as HTMLButtonElement;
    submit.click();
    httpMock.expectOne('/api/musicians').flush(null, {
      status: 500,
      statusText: 'Server Error',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.error[role="alert"]')).toBeTruthy();
  });

  it('should validate required fields', () => {
    const { fixture } = create({});
    setInput(fixture, 'input[formControlName="firstName"]', 'Mia');
    const submit = fixture.nativeElement.querySelector('.submit') as HTMLButtonElement;
    submit.click();

    expect(fixture.nativeElement.querySelector('.error[role="alert"]')).toBeNull();
  });
});

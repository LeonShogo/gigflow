import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { MusicianListComponent } from './musician-list.component';
import type { Musician } from './musician.model';

const MUSICIANS: Musician[] = [
  { id: 1, firstName: 'Anna', lastName: 'Becker', instrument: 'Gesang', email: 'anna@example.org' },
  { id: 2, firstName: 'Jonas', lastName: 'Keller', instrument: 'Gitarre', email: '' },
];

describe('MusicianListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MusicianListComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should list musicians', () => {
    const fixture = TestBed.createComponent(MusicianListComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/musicians').flush(MUSICIANS);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const rows = el.querySelectorAll('.row');
    expect(rows.length).toBe(2);
    expect(el.textContent).toContain('Anna Becker');
    expect(el.textContent).toContain('Gesang');
    expect(el.textContent).toContain('anna@example.org');
  });

  it('should show an error when loading fails', () => {
    const fixture = TestBed.createComponent(MusicianListComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/musicians').flush(null, {
      status: 500,
      statusText: 'Server Error',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('p[role="alert"]')).toBeTruthy();
  });
});

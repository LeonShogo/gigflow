import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { MusicianListComponent } from './musician-list.component';
import { AuthService } from '../auth/auth.service';
import type { Musician } from './musician.model';

const MUSICIANS: Musician[] = [
  { id: 1, firstName: 'Anna', lastName: 'Becker', instrument: 'Gesang', email: 'anna@example.org' },
  { id: 2, firstName: 'Jonas', lastName: 'Keller', instrument: 'Gitarre', email: '' },
];

const BANDS = [{ id: 1, name: 'GigFlow Quartett' }];

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

  /** Flushes the constructor's musician, band and membership requests. */
  function flushLoad(memberships: unknown[] = []): void {
    httpMock.expectOne('/api/musicians').flush(MUSICIANS);
    httpMock.expectOne('/api/bands').flush(BANDS);
    httpMock.expectOne('/api/memberships/band/1').flush(memberships);
  }

  it('should list musicians', () => {
    const fixture = TestBed.createComponent(MusicianListComponent);
    fixture.detectChanges();
    flushLoad();
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
    httpMock.expectOne('/api/bands').flush(BANDS);
    httpMock.expectOne('/api/memberships/band/1').flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('p[role="alert"]')).toBeTruthy();
  });

  it('should delete a musician after confirmation and update the list', () => {
    const fixture = TestBed.createComponent(MusicianListComponent);
    fixture.detectChanges();
    flushLoad();
    fixture.detectChanges();

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'o@gigflow.local', organizer: true, musicianId: null },
    });
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.roster__item');
    const firstDelete = rows[0].querySelector('.row__delete') as HTMLButtonElement;
    expect(firstDelete).toBeTruthy();
    firstDelete.click();
    fixture.detectChanges();
    expect(rows[0].textContent).toContain('Anna Becker');

    (rows[0].querySelector('.row__confirm-btn--danger') as HTMLButtonElement).click();
    const req = httpMock.expectOne('/api/musicians/1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    const remaining = fixture.nativeElement.querySelectorAll('.row__name');
    expect(remaining.length).toBe(1);
    expect((remaining[0] as HTMLElement).textContent).toContain('Jonas Keller');
  });

  it('should show a server message when deletion is blocked', () => {
    const fixture = TestBed.createComponent(MusicianListComponent);
    fixture.detectChanges();
    flushLoad();
    fixture.detectChanges();

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'o@gigflow.local', organizer: true, musicianId: null },
    });
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.roster__item');
    (rows[0].querySelector('.row__delete') as HTMLButtonElement).click();
    fixture.detectChanges();
    (rows[0].querySelector('.row__confirm-btn--danger') as HTMLButtonElement).click();
    const req = httpMock.expectOne('/api/musicians/1');
    req.flush(
      { message: '„Anna Becker“ kann nicht gelöscht werden: noch zu Gigs/Proben zugeordnet.' },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('noch zu Gigs/Proben zugeordnet');
  });

  it('should assign a musician to a band and show the chip', () => {
    const fixture = TestBed.createComponent(MusicianListComponent);
    fixture.detectChanges();
    flushLoad([]);
    fixture.detectChanges();

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'o@gigflow.local', organizer: true, musicianId: null },
    });
    fixture.detectChanges();

    const firstRow = fixture.nativeElement.querySelectorAll('.roster__item')[0];
    const select = firstRow.querySelector('.band-add') as HTMLSelectElement;
    expect(select).toBeTruthy();
    select.value = '1';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/memberships');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ bandId: 1, musicianId: 1 });
    req.flush({ id: 42, bandId: 1, musicianId: 1 });
    fixture.detectChanges();

    expect(firstRow.querySelector('.band-chip')?.textContent).toContain('GigFlow Quartett');
  });

  it('should remove a band membership when the chip is dismissed', () => {
    const fixture = TestBed.createComponent(MusicianListComponent);
    fixture.detectChanges();
    flushLoad([{ id: 42, bandId: 1, musicianId: 1 }]);
    fixture.detectChanges();

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'o@gigflow.local', organizer: true, musicianId: null },
    });
    fixture.detectChanges();

    const firstRow = fixture.nativeElement.querySelectorAll('.roster__item')[0];
    const remove = firstRow.querySelector('.band-chip__remove') as HTMLButtonElement;
    expect(remove).toBeTruthy();
    remove.click();

    const req = httpMock.expectOne('/api/memberships/42');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(firstRow.querySelector('.band-chip')).toBeNull();
  });
});


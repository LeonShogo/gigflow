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

  it('should delete a musician after confirmation and update the list', () => {
    const fixture = TestBed.createComponent(MusicianListComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/musicians').flush(MUSICIANS);
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
    httpMock.expectOne('/api/musicians').flush(MUSICIANS);
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
});


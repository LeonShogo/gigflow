import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { MusicianListComponent } from './musician-list.component';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../notifications/toast.service';
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

  function loginAsOrganizer(): void {
    TestBed.inject(AuthService)
      .login({ email: 'o@gigflow.local', password: 'password' })
      .subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'owner@gigflow.local', musicianId: 1 },
    });
  }

  it('should create a band and show it in the list', () => {
    const fixture = TestBed.createComponent(MusicianListComponent);
    fixture.detectChanges();
    flushLoad();
    loginAsOrganizer();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.bands__add') as HTMLButtonElement).click();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      '.band-form .field__input',
    ) as HTMLInputElement;
    input.value = 'Neue Band';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.band-form__submit') as HTMLButtonElement).click();

    const request = httpMock.expectOne('/api/bands');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.name).toBe('Neue Band');
    request.flush({ id: 2, name: 'Neue Band' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Neue Band');
    expect((fixture.nativeElement.querySelector('.band-form') as HTMLElement)).toBeNull();
  });

  it('should delete an unused band, remove its memberships and restore both on undo', () => {
    const fixture = TestBed.createComponent(MusicianListComponent);
    fixture.detectChanges();
    flushLoad([{ id: 42, bandId: 1, musicianId: 1 }]);
    loginAsOrganizer();
    fixture.detectChanges();

    const remove = fixture.nativeElement.querySelector(
      '.band-chip--static .band-chip__remove',
    ) as HTMLButtonElement;
    remove.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('„GigFlow Quartett“ wirklich löschen?');
    (fixture.nativeElement.querySelector(
      '.confirm-dialog__actions .row__confirm-btn--danger',
    ) as HTMLButtonElement).click();

    const request = httpMock.expectOne('/api/bands/1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.band-chip--static')).toBeNull();
    expect(fixture.nativeElement.querySelector('.row__identity .band-chip')).toBeNull();

    TestBed.inject(ToastService).runAction();

    const create = httpMock.expectOne('/api/bands');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ name: 'GigFlow Quartett' });
    create.flush({ id: 2, name: 'GigFlow Quartett' });

    const membership = httpMock.expectOne('/api/memberships');
    expect(membership.request.method).toBe('POST');
    expect(membership.request.body).toEqual({ bandId: 2, musicianId: 1 });
    membership.flush({ id: 43, bandId: 2, musicianId: 1 });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.band-chip--static')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('.row__identity .band-chip')?.textContent,
    ).toContain('GigFlow Quartett');
  });

  it('should list musicians with assigned bands beside the name', () => {
    const fixture = TestBed.createComponent(MusicianListComponent);
    fixture.detectChanges();
    flushLoad([{ id: 42, bandId: 1, musicianId: 1 }]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const rows = el.querySelectorAll('.row');
    expect(rows.length).toBe(2);
    expect(el.textContent).toContain('Anna Becker');
    expect(el.textContent).toContain('Gesang');
    expect(el.textContent).toContain('anna@example.org');
    const identity = rows[0].querySelector('.row__identity') as HTMLElement;
    expect(identity.textContent).toContain('Anna Becker');
    expect(identity.querySelector('.band-chip')?.textContent).toContain('GigFlow Quartett');
    expect(identity.querySelector('.band-chip__remove')).toBeNull();
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

  it('should delete a musician after confirmation and restore it on undo', () => {
    const fixture = TestBed.createComponent(MusicianListComponent);
    fixture.detectChanges();
    flushLoad();
    fixture.detectChanges();

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'owner@gigflow.local', musicianId: 1 },
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

    TestBed.inject(ToastService).runAction();

    const restore = httpMock.expectOne('/api/musicians');
    expect(restore.request.method).toBe('POST');
    expect(restore.request.body).toMatchObject({
      firstName: 'Anna',
      lastName: 'Becker',
      instrument: 'Gesang',
      email: 'anna@example.org',
    });
    restore.flush({
      id: 3,
      firstName: 'Anna',
      lastName: 'Becker',
      instrument: 'Gesang',
      email: 'anna@example.org',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.row__name').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Anna Becker');
  });

  it('should delete all musicians after confirmation', () => {
    const fixture = TestBed.createComponent(MusicianListComponent);
    fixture.detectChanges();
    flushLoad([{ id: 42, bandId: 1, musicianId: 1 }]);
    loginAsOrganizer();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.head__delete') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Alle 2 Musiker*innen werden gelöscht.');

    const confirm = fixture.nativeElement.querySelector(
      '.confirm-dialog__actions .row__confirm-btn--danger',
    ) as HTMLButtonElement;
    confirm.click();

    const req = httpMock.expectOne('/api/musicians');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.roster__item').length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Noch keine Musiker*innen angelegt.');
    expect(fixture.nativeElement.querySelector('.head__delete')).toBeNull();
  });

  it('should show the bulk delete action to any signed-in user', () => {
    const fixture = TestBed.createComponent(MusicianListComponent);
    fixture.detectChanges();
    flushLoad();
    fixture.detectChanges();

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'member@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 2, email: 'member@gigflow.local', musicianId: 2 },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.head__delete')).toBeTruthy();
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
      user: { id: 1, email: 'owner@gigflow.local', musicianId: 1 },
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
    expect(fixture.nativeElement.querySelector('.notice-dialog [role="alert"]')).toBeTruthy();

    (fixture.nativeElement.querySelector('.notice-dialog__close') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.notice-dialog')).toBeNull();
  });

  it('should auto-dismiss the blocked-delete notice', () => {
    const fixture = TestBed.createComponent(MusicianListComponent);
    fixture.detectChanges();
    flushLoad();
    fixture.detectChanges();

    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'o@gigflow.local', password: 'password' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 't',
      user: { id: 1, email: 'owner@gigflow.local', musicianId: 1 },
    });
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.roster__item');
    (rows[0].querySelector('.row__delete') as HTMLButtonElement).click();
    fixture.detectChanges();

    vi.useFakeTimers();
    try {
      (rows[0].querySelector('.row__confirm-btn--danger') as HTMLButtonElement).click();
      httpMock.expectOne('/api/musicians/1').flush(
        { message: '„Anna Becker“ kann nicht gelöscht werden: noch zu Gigs/Proben zugeordnet.' },
        { status: 409, statusText: 'Conflict' },
      );
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.notice-dialog')).toBeTruthy();

      vi.advanceTimersByTime(3000);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.notice-dialog')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
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
      user: { id: 1, email: 'owner@gigflow.local', musicianId: 1 },
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
      user: { id: 1, email: 'owner@gigflow.local', musicianId: 1 },
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

import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should store token and user on login', () => {
    let captured: boolean | undefined;
    service.login({ email: 'a@gigflow.local', password: 'secret' }).subscribe(() => {
      captured = service.isAuthenticated();
    });

    httpMock.expectOne('/api/auth/login').flush({
      token: 'jwt-token',
      user: { id: 1, email: 'a@gigflow.local', organizer: false, musicianId: 3 },
    });

    expect(captured).toBe(true);
    expect(service.currentUser()?.email).toBe('a@gigflow.local');
    expect(localStorage.getItem('gigflow_token')).toBe('jwt-token');
  });

  it('should clear state on logout', () => {
    service.logout();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });

  it('should report organizer flag from current user', () => {
    service.register({
      email: 'b@gigflow.local',
      password: 'password',
      firstName: 'B',
      lastName: 'Baum',
    }).subscribe();
    httpMock.expectOne('/api/auth/register').flush({
      token: 't',
      user: { id: 2, email: 'b@gigflow.local', organizer: true, musicianId: null },
    });
    expect(service.isOrganizer()).toBe(true);
  });
});

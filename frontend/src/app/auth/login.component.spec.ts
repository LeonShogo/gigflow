import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { FormGroup } from '@angular/forms';

import { LoginComponent } from './login.component';

function fill(fixture: ComponentFixture<LoginComponent>, field: string, value: string): void {
  const form = (fixture.componentInstance as unknown as { form: FormGroup }).form;
  (form.controls as Record<string, { setValue: (v: string) => void }>)[field].setValue(value);
  fixture.detectChanges();
}

describe('LoginComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should login and persist token on success', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    fill(fixture, 'email', 'a@gigflow.local');
    fill(fixture, 'password', 'secret123');
    (fixture.nativeElement.querySelector('.auth__submit') as HTMLButtonElement).click();
    fixture.detectChanges();

    httpMock.expectOne('/api/auth/login').flush({
      token: 'jwt',
      user: { id: 1, email: 'a@gigflow.local', musicianId: 3 },
    });
    fixture.detectChanges();

    expect(localStorage.getItem('gigflow_token')).toBe('jwt');
  });

  it('should switch to register mode and submit a registration', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.auth__switch-btn') as HTMLButtonElement).click();
    fixture.detectChanges();

    fill(fixture, 'email', 'new@gigflow.local');
    fill(fixture, 'password', 'password123');
    fill(fixture, 'firstName', 'Neuer');
    fill(fixture, 'lastName', 'User');
    (fixture.nativeElement.querySelector('.auth__submit') as HTMLButtonElement).click();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/auth/register');
    expect(req.request.body).toEqual({
      email: 'new@gigflow.local',
      password: 'password123',
      firstName: 'Neuer',
      lastName: 'User',
      instrument: null,
    });
    req.flush({
      token: 'jwt2',
      user: { id: 2, email: 'new@gigflow.local', musicianId: 4 },
    });
  });
});

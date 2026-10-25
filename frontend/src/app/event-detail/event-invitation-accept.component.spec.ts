import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { EventInvitationAcceptComponent } from './event-invitation-accept.component';

@Component({ template: '' })
class EventRouteStubComponent {}

describe('EventInvitationAcceptComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [EventInvitationAcceptComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'events/:id', component: EventRouteStubComponent }]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ token: 'invite-token' }) } },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('accepts the invite with the signed-in account and posts the link token', async () => {
    TestBed.inject(AuthService).login({ email: 'member@example.org', password: 'password123' }).subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      token: 'jwt',
      user: { id: 9, email: 'member@example.org', musicianId: 90 },
    });

    const fixture: ComponentFixture<EventInvitationAcceptComponent> =
      TestBed.createComponent(EventInvitationAcceptComponent);
    fixture.detectChanges();

    const request = httpMock.expectOne('/api/event-invitations/accept');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ token: 'invite-token' });
    request.flush({ id: 12, title: 'Sommergig', type: 'CONCERT', dateTime: '2026-09-12T20:00:00' });
    await fixture.whenStable();
  });
});

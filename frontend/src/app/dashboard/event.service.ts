import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type {
  Band,
  BandMembership,
  BandMembershipRequest,
  BandRequest,
  EventItem,
  EventInvitationResult,
  EventEditPolicy,
  EventParticipation,
  EventRequest,
  UserContact,
} from './event.model';

export interface PanelLayout {
  order: string[];
  collapsed: Record<string, boolean>;
  /** only set by the server on reads; ignored on writes */
  stored?: boolean;
}

export interface EventAccessConfiguration {
  editPolicy: EventEditPolicy;
  editorUserIds: number[];
  notifications?: EventInvitationResult[];
}

export interface EventMembersAddedResponse {
  participations: EventParticipation[];
  notifications: EventInvitationResult[];
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly http = inject(HttpClient);

  loadEvents(): Observable<EventItem[]> {
    return this.http.get<EventItem[]>('/api/events').pipe(
      map((events) =>
        [...events].sort(
          (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
        ),
      ),
    );
  }

  loadEvent(id: number): Observable<EventItem> {
    return this.http.get<EventItem>(`/api/events/${id}`);
  }

  loadContacts(): Observable<UserContact[]> {
    return this.http.get<UserContact[]>('/api/users/contacts');
  }

  loadEventAccess(eventId: number): Observable<EventAccessConfiguration> {
    return this.http.get<EventAccessConfiguration>(`/api/events/${eventId}/access`);
  }

  updateEventAccess(eventId: number, access: EventAccessConfiguration): Observable<EventAccessConfiguration> {
    return this.http.put<EventAccessConfiguration>(`/api/events/${eventId}/access`, access);
  }

  addEventMembers(eventId: number, userIds: number[]): Observable<EventMembersAddedResponse> {
    return this.http.post<EventMembersAddedResponse>(`/api/events/${eventId}/members`, { userIds });
  }

  inviteByEmail(eventId: number, emails: string[]): Observable<EventInvitationResult[]> {
    return this.http.post<EventInvitationResult[]>(`/api/events/${eventId}/invitations`, { emails });
  }

  leaveEvent(eventId: number): Observable<void> {
    return this.http.delete<void>(`/api/events/${eventId}/membership`);
  }

  acceptInvitation(token: string): Observable<EventItem> {
    return this.http.post<EventItem>('/api/event-invitations/accept', { token });
  }

  loadRehearsalsForConcert(concertId: number): Observable<EventItem[]> {
    return this.http.get<EventItem[]>(`/api/events/by-concert/${concertId}`).pipe(
      map((events) =>
        [...events].sort(
          (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
        ),
      ),
    );
  }

  loadPanelLayout(eventId: number): Observable<PanelLayout> {
    return this.http.get<PanelLayout>(`/api/events/${eventId}/layout`);
  }

  savePanelLayout(eventId: number, layout: PanelLayout): Observable<PanelLayout> {
    return this.http.put<PanelLayout>(`/api/events/${eventId}/layout`, layout);
  }

  loadBands(): Observable<Band[]> {
    return this.http.get<Band[]>('/api/bands');
  }

  createBand(request: BandRequest): Observable<Band> {
    return this.http.post<Band>('/api/bands', request);
  }

  deleteBand(id: number): Observable<void> {
    return this.http.delete<void>(`/api/bands/${id}`);
  }

  loadBandMemberships(bandId: number): Observable<BandMembership[]> {
    return this.http.get<BandMembership[]>(`/api/memberships/band/${bandId}`);
  }

  loadMusicianMemberships(musicianId: number): Observable<BandMembership[]> {
    return this.http.get<BandMembership[]>(`/api/memberships/musician/${musicianId}`);
  }

  addBandMembership(request: BandMembershipRequest): Observable<BandMembership> {
    return this.http.post<BandMembership>('/api/memberships', request);
  }

  removeBandMembership(id: number): Observable<void> {
    return this.http.delete<void>(`/api/memberships/${id}`);
  }

  /** Adds every member of the selected band as an invited participant. */
  inviteBandMembers(eventId: number, bandId: number): Observable<EventParticipation[]> {
    return this.http.post<EventParticipation[]>(`/api/events/${eventId}/invite-band/${bandId}`, {});
  }

  createEvent(request: EventRequest): Observable<EventItem> {
    return this.http.post<EventItem>('/api/events', request);
  }

  updateEvent(id: number, request: EventRequest): Observable<EventItem> {
    return this.http.put<EventItem>(`/api/events/${id}`, request);
  }

  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`/api/events/${id}`);
  }

  deleteAllEvents(): Observable<void> {
    return this.http.delete<void>('/api/events');
  }
}

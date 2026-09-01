import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { EventParticipation, ParticipationStatus } from './event.model';

export interface ParticipationRequest {
  eventId: number;
  musicianId: number;
  status: ParticipationStatus;
}

@Injectable({ providedIn: 'root' })
export class EventParticipationService {
  private readonly http = inject(HttpClient);

  loadForEvent(eventId: number): Observable<EventParticipation[]> {
    return this.http.get<EventParticipation[]>(
      `/api/event-participations/event/${eventId}`,
    );
  }

  create(request: ParticipationRequest): Observable<EventParticipation> {
    return this.http.post<EventParticipation>('/api/event-participations', request);
  }

  joinSelf(eventId: number): Observable<EventParticipation> {
    return this.http.post<EventParticipation>(`/api/events/${eventId}/join`, null);
  }

  update(id: number, request: ParticipationRequest): Observable<EventParticipation> {
    return this.http.put<EventParticipation>(`/api/event-participations/${id}`, request);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`/api/event-participations/${id}`);
  }
}

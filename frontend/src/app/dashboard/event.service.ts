import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type { Band, EventItem, EventRequest } from './event.model';

export interface PanelLayout {
  order: string[];
  collapsed: Record<string, boolean>;
  /** only set by the server on reads; ignored on writes */
  stored?: boolean;
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

  createEvent(request: EventRequest): Observable<EventItem> {
    return this.http.post<EventItem>('/api/events', request);
  }

  updateEvent(id: number, request: EventRequest): Observable<EventItem> {
    return this.http.put<EventItem>(`/api/events/${id}`, request);
  }

  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`/api/events/${id}`);
  }
}


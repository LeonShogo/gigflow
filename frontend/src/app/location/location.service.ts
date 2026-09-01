import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { EventLocation, LocationRequest } from './location.model';

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly http = inject(HttpClient);

  loadForEvent(eventId: number): Observable<EventLocation[]> {
    return this.http.get<EventLocation[]>(`/api/event-locations/event/${eventId}`);
  }

  create(request: LocationRequest): Observable<EventLocation> {
    return this.http.post<EventLocation>('/api/event-locations', request);
  }

  update(id: number, request: LocationRequest): Observable<EventLocation> {
    return this.http.put<EventLocation>(`/api/event-locations/${id}`, request);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`/api/event-locations/${id}`);
  }
}
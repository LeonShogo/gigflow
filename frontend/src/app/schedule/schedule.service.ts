import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { ScheduleItem, ScheduleItemRequest } from './schedule.model';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly http = inject(HttpClient);

  loadForEvent(eventId: number): Observable<ScheduleItem[]> {
    return this.http.get<ScheduleItem[]>(`/api/schedule-items/event/${eventId}`);
  }

  create(request: ScheduleItemRequest): Observable<ScheduleItem> {
    return this.http.post<ScheduleItem>('/api/schedule-items', request);
  }

  update(id: number, request: ScheduleItemRequest): Observable<ScheduleItem> {
    return this.http.put<ScheduleItem>(`/api/schedule-items/${id}`, request);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`/api/schedule-items/${id}`);
  }
}

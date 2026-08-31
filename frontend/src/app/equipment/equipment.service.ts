import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  Equipment,
  EquipmentRequest,
  EquipmentRequirement,
  EquipmentRequirementRequest,
} from './equipment.model';

@Injectable({ providedIn: 'root' })
export class EquipmentService {
  private readonly http = inject(HttpClient);

  loadEquipment(): Observable<Equipment[]> {
    return this.http.get<Equipment[]>('/api/equipment');
  }

  createEquipment(request: EquipmentRequest): Observable<Equipment> {
    return this.http.post<Equipment>('/api/equipment', request);
  }
}

@Injectable({ providedIn: 'root' })
export class EquipmentRequirementService {
  private readonly http = inject(HttpClient);

  loadForEvent(eventId: number): Observable<EquipmentRequirement[]> {
    return this.http.get<EquipmentRequirement[]>(
      `/api/equipment-requirements/event/${eventId}`,
    );
  }

  create(request: EquipmentRequirementRequest): Observable<EquipmentRequirement> {
    return this.http.post<EquipmentRequirement>('/api/equipment-requirements', request);
  }

  update(id: number, request: EquipmentRequirementRequest): Observable<EquipmentRequirement> {
    return this.http.put<EquipmentRequirement>(`/api/equipment-requirements/${id}`, request);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`/api/equipment-requirements/${id}`);
  }
}

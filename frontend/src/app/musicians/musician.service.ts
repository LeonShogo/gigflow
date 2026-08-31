import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { Musician, MusicianRequest } from './musician.model';

@Injectable({ providedIn: 'root' })
export class MusicianService {
  private readonly http = inject(HttpClient);

  loadMusicians(): Observable<Musician[]> {
    return this.http.get<Musician[]>('/api/musicians');
  }

  loadMusician(id: number): Observable<Musician> {
    return this.http.get<Musician>(`/api/musicians/${id}`);
  }

  createMusician(request: MusicianRequest): Observable<Musician> {
    return this.http.post<Musician>('/api/musicians', request);
  }

  updateMusician(id: number, request: MusicianRequest): Observable<Musician> {
    return this.http.put<Musician>(`/api/musicians/${id}`, request);
  }
}

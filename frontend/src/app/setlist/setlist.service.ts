import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, Observable, switchMap } from 'rxjs';
import { throwError } from 'rxjs';

import type { Piece, Setlist, SetlistEntry } from './setlist.model';

@Injectable({ providedIn: 'root' })
export class SetlistService {
  private readonly http = inject(HttpClient);

  getByEvent(eventId: number): Observable<Setlist> {
    return this.http.get<Setlist>(`/api/setlists/event/${eventId}`);
  }

  getOrCreateForEvent(eventId: number): Observable<Setlist> {
    return this.getByEvent(eventId).pipe(
      catchError((err) => {
        if (err?.status === 404) {
          return this.http.post<Setlist>('/api/setlists', { eventId });
        }
        return throwError(() => err);
      }),
    );
  }

  loadEntries(setlistId: number): Observable<SetlistEntry[]> {
    return this.http.get<SetlistEntry[]>(`/api/setlist-entries/by-setlist/${setlistId}`);
  }

  addPieceToSetlist(setlistId: number, title: string, position: number): Observable<SetlistEntry> {
    return this.http.post<Piece>('/api/pieces', { title }).pipe(
      switchMap((piece) =>
        this.http.post<SetlistEntry>('/api/setlist-entries', {
          setlistId,
          pieceId: piece.id,
          position,
        }),
      ),
    );
  }

  removeEntry(entryId: number): Observable<void> {
    return this.http.delete<void>(`/api/setlist-entries/${entryId}`);
  }

  setEntryPosition(entryId: number, setlistId: number, pieceId: number, position: number): Observable<SetlistEntry> {
    return this.http.put<SetlistEntry>(`/api/setlist-entries/${entryId}`, {
      setlistId,
      pieceId,
      position,
    });
  }
}

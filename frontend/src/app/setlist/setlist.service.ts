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

  addEntry(request: { setlistId: number; pieceId: number; position: number }): Observable<SetlistEntry> {
    return this.http.post<SetlistEntry>('/api/setlist-entries', request);
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

  uploadSheetPdf(pieceId: number, file: File): Observable<Piece> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<Piece>(`/api/pieces/${pieceId}/sheet-pdf`, formData);
  }

  downloadSheetPdf(pieceId: number, download = false): Observable<Blob> {
    const query = download ? '?download=true' : '';
    return this.http.get(`/api/pieces/${pieceId}/sheet-pdf${query}`, { responseType: 'blob' });
  }

  removeSheetPdf(pieceId: number): Observable<void> {
    return this.http.delete<void>(`/api/pieces/${pieceId}/sheet-pdf`);
  }

  uploadDemoAudio(pieceId: number, file: File): Observable<Piece> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<Piece>(`/api/pieces/${pieceId}/demo-audio`, formData);
  }

  downloadDemoAudio(pieceId: number): Observable<Blob> {
    return this.http.get(`/api/pieces/${pieceId}/demo-audio`, { responseType: 'blob' });
  }

  removeDemoAudio(pieceId: number): Observable<void> {
    return this.http.delete<void>(`/api/pieces/${pieceId}/demo-audio`);
  }

  setYoutubeUrl(pieceId: number, youtubeUrl: string | null): Observable<Piece> {
    return this.http.put<Piece>(`/api/pieces/${pieceId}/youtube`, { youtubeUrl });
  }
}

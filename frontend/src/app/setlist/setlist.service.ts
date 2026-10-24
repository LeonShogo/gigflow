import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, Observable, switchMap, throwError } from 'rxjs';

import type {
  Piece,
  PieceDemoAudio,
  PieceLink,
  PieceSheet,
  Setlist,
  SetlistEntry,
} from './setlist.model';

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

  loadSheets(pieceId: number): Observable<PieceSheet[]> {
    return this.http.get<PieceSheet[]>(`/api/pieces/${pieceId}/sheets`);
  }

  uploadSheets(pieceId: number, files: File[]): Observable<PieceSheet[]> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file, file.name);
    }
    return this.http.post<PieceSheet[]>(`/api/pieces/${pieceId}/sheets`, formData);
  }

  renameSheet(sheetId: number, label: string): Observable<PieceSheet> {
    return this.http.put<PieceSheet>(`/api/piece-sheets/${sheetId}`, { label });
  }

  downloadSheet(sheetId: number, download = false): Observable<Blob> {
    const query = download ? '?download=true' : '';
    return this.http.get(`/api/piece-sheets/${sheetId}${query}`, { responseType: 'blob' });
  }

  removeSheet(sheetId: number): Observable<void> {
    return this.http.delete<void>(`/api/piece-sheets/${sheetId}`);
  }

  uploadDemoAudios(pieceId: number, files: File[]): Observable<PieceDemoAudio[]> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file, file.name);
    }
    return this.http.post<PieceDemoAudio[]>(`/api/pieces/${pieceId}/demo-audios`, formData);
  }

  loadDemoAudios(pieceId: number): Observable<PieceDemoAudio[]> {
    return this.http.get<PieceDemoAudio[]>(`/api/pieces/${pieceId}/demo-audios`);
  }

  downloadDemoAudioById(pieceId: number, audioId: number): Observable<Blob> {
    return this.http.get(`/api/pieces/${pieceId}/demo-audios/${audioId}`, { responseType: 'blob' });
  }

  removeDemoAudioById(pieceId: number, audioId: number): Observable<void> {
    return this.http.delete<void>(`/api/pieces/${pieceId}/demo-audios/${audioId}`);
  }

  addPieceLink(pieceId: number, request: { label: string; url: string }): Observable<PieceLink> {
    return this.http.post<PieceLink>(`/api/pieces/${pieceId}/links`, request);
  }

  updatePieceLink(
    pieceId: number,
    linkId: number,
    request: { label: string; url: string },
  ): Observable<PieceLink> {
    return this.http.put<PieceLink>(`/api/pieces/${pieceId}/links/${linkId}`, request);
  }

  removePieceLink(pieceId: number, linkId: number): Observable<void> {
    return this.http.delete<void>(`/api/pieces/${pieceId}/links/${linkId}`);
  }

  updatePieceNotes(pieceId: number, title: string, notes: string | null): Observable<Piece> {
    return this.http.put<Piece>(`/api/pieces/${pieceId}`, { title, notes });
  }

}

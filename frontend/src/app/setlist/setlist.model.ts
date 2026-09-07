export interface Setlist {
  id: number;
  eventId: number;
}

export interface SetlistEntry {
  id: number;
  setlistId: number;
  pieceId: number;
  pieceTitle: string;
  position: number;
  hasSheetPdf?: boolean;
  hasDemoAudio?: boolean;
  youtubeUrl?: string | null;
}

export interface PieceRequest {
  title: string;
}

export interface Piece {
  id: number;
  title: string;
  hasSheetPdf?: boolean;
  hasDemoAudio?: boolean;
  youtubeUrl?: string | null;
}

export interface SetlistEntryRequest {
  setlistId: number;
  pieceId: number;
  position: number;
}

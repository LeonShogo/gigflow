export interface Setlist {
  id: number;
  eventId: number;
}

export interface PieceSheet {
  id: number;
  pieceId: number;
  label: string;
  originalName: string;
}

export interface SetlistEntry {
  id: number;
  setlistId: number;
  pieceId: number;
  pieceTitle: string;
  position: number;
  sheets: PieceSheet[];
  hasDemoAudio?: boolean;
  youtubeUrl?: string | null;
}

export interface Piece {
  id: number;
  title: string;
  hasDemoAudio?: boolean;
  youtubeUrl?: string | null;
}

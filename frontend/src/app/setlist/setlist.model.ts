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

export interface PieceDemoAudio {
  id: number;
  pieceId: number;
  label: string;
  originalName: string;
  sortOrder: number;
}

export interface PieceLink {
  id: number;
  pieceId: number;
  label: string;
  url: string;
  sortOrder: number;
}

export interface SetlistEntry {
  id: number;
  setlistId: number;
  pieceId: number;
  pieceTitle: string;
  position: number;
  sheets: PieceSheet[];
  notes?: string | null;
  demoAudios?: PieceDemoAudio[];
  links?: PieceLink[];
  hasDemoAudio?: boolean;
  youtubeUrl?: string | null;
}

export interface Piece {
  id: number;
  title: string;
  notes?: string | null;
  demoAudios?: PieceDemoAudio[];
  links?: PieceLink[];
  hasDemoAudio?: boolean;
  youtubeUrl?: string | null;
}

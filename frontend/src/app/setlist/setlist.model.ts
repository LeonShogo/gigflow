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
}

export interface PieceRequest {
  title: string;
}

export interface Piece {
  id: number;
  title: string;
  hasSheetPdf?: boolean;
}

export interface SetlistEntryRequest {
  setlistId: number;
  pieceId: number;
  position: number;
}

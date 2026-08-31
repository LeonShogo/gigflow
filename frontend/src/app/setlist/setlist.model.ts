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
}

export interface PieceRequest {
  title: string;
}

export interface Piece {
  id: number;
  title: string;
}

export interface SetlistEntryRequest {
  setlistId: number;
  pieceId: number;
  position: number;
}

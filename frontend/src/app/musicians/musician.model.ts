export interface Musician {
  id: number;
  firstName: string;
  lastName: string;
  instrument?: string;
  email?: string;
}

export interface MusicianRequest {
  firstName: string;
  lastName: string;
  instrument?: string | null;
  email?: string | null;
}

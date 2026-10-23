export interface Musician {
  id: number;
  firstName: string;
  lastName: string;
  instrument?: string;
  email?: string;
  emailPublic?: boolean;
}

export interface MusicianRequest {
  firstName: string;
  lastName: string;
  instrument?: string | null;
  email?: string | null;
  emailPublic?: boolean;
}

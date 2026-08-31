export type EventType = 'CONCERT' | 'REHEARSAL';

export interface EventItem {
  id: number;
  title: string;
  type: EventType;
  /** ISO date/time */
  dateTime: string;
  bandId?: number;
  /** Reserve for later */
  venue?: string;
  bandName?: string;
}

export interface EventRequest {
  title: string;
  dateTime: string;
  type: EventType;
  bandId: number;
  concertId?: number | null;
}

export interface Band {
  id: number;
  name: string;
}

export type ParticipationStatus = 'INVITED' | 'ACCEPTED' | 'DECLINED';

export interface MusicianPublic {
  id: number;
  firstName: string;
  lastName: string;
  instrument?: string;
  /** Only present when the musician opted in */
  email?: string;
}

export interface EventParticipation {
  id: number;
  eventId: number;
  musicianId: number;
  musician?: MusicianPublic;
  status: ParticipationStatus;
}



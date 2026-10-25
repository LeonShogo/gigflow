export type EventType = 'CONCERT' | 'REHEARSAL';

export interface EventItem {
  id: number;
  title: string;
  type: EventType;
  /** ISO date/time */
  dateTime: string;
  bandId?: number;
  bandName?: string;
  concertId?: number | null;
  createdByUserId?: number | null;
  /** Reserve for later */
  venue?: string;
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
  genre?: string;
}

export interface BandRequest {
  name: string;
  genre?: string;
}

/** A musician's static membership in a band (the roster). */
export interface BandMembership {
  id: number;
  bandId: number;
  musicianId: number;
}

export interface BandMembershipRequest {
  bandId: number;
  musicianId: number;
}

export type ParticipationStatus = 'SUGGESTED' | 'INVITED' | 'ACCEPTED' | 'DECLINED';

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


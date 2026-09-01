export type LocationType =
  | 'VENUE'
  | 'HOTEL'
  | 'RESTAURANT'
  | 'REHEARSAL_SPACE'
  | 'MEETING_POINT';

export interface EventLocation {
  id: number;
  eventId: number;
  type: LocationType;
  name: string;
  address: string;
  note: string | null;
  phone: string | null;
  mapsUrl: string | null;
}

export interface LocationRequest {
  eventId: number;
  type: LocationType;
  name: string;
  address: string;
  note: string | null;
  phone: string | null;
  mapsUrl: string | null;
}

export const LOCATION_TYPES: { value: LocationType; label: string }[] = [
  { value: 'VENUE', label: 'Venue / Club' },
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'RESTAURANT', label: 'Restaurant / Catering' },
  { value: 'REHEARSAL_SPACE', label: 'Probenort' },
  { value: 'MEETING_POINT', label: 'Treffpunkt' },
];
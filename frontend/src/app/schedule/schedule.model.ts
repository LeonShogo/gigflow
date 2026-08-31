export interface ScheduleItem {
  id: number;
  eventId: number;
  label: string;
  /** Uhrzeit als "HH:mm" (LocalTime) */
  time: string;
}

export interface ScheduleItemRequest {
  eventId: number;
  label: string;
  time: string;
}

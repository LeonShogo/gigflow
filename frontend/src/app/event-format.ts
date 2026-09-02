import type { EventType } from './dashboard/event.model';

const TYPE_LABELS: Record<EventType, string> = {
  CONCERT: 'Gig',
  REHEARSAL: 'Probe',
};

const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

export function typeLabel(type: EventType): string {
  return TYPE_LABELS[type];
}

export function formatDate(dateTime: string): string {
  const parsed = new Date(dateTime);
  const day = DAYS[parsed.getDay()];
  return `${day}, ${parsed.getDate()}. ${MONTHS[parsed.getMonth()]} ${parsed.getFullYear()}`;
}

export function formatTime(dateTime: string): string {
  const parsed = new Date(dateTime);
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function dateContext(dateTime: string, today = new Date()): string | null {
  const parsed = new Date(dateTime);
  const target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((target.getTime() - now.getTime()) / 86_400_000);
  if (diff === 0) {
    return 'Heute';
  }
  if (diff === 1) {
    return 'Morgen';
  }
  if (diff === 2) {
    return 'Übermorgen';
  }
  return null;
}

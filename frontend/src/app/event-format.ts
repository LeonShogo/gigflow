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

export function repertoireLabel(type: EventType): string {
  return type === 'REHEARSAL' ? 'Probenrepertoire' : 'Setlist';
}

export function formatDate(dateTime: string, locale = 'de'): string {
  const parsed = new Date(dateTime);
  if (locale !== 'de') {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(parsed);
  }
  const day = DAYS[parsed.getDay()];
  return `${day}, ${parsed.getDate()}. ${MONTHS[parsed.getMonth()]} ${parsed.getFullYear()}`;
}

export function formatTime(dateTime: string, locale = 'de'): string {
  const parsed = new Date(dateTime);
  if (locale !== 'de') {
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(parsed);
  }
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatTimeOnly(time: string, locale = 'de'): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!match) {
    return time;
  }
  if (locale !== 'de') {
    const date = new Date(2000, 0, 1, Number(match[1]), Number(match[2]));
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date);
  }
  const hours = String(Number(match[1])).padStart(2, '0');
  return `${hours}:${match[2]}`;
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

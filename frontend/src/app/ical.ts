import type { EventItem } from './dashboard/event.model';
import { typeLabel } from './event-format';

export interface IcalEvent {
  uid: string;
  title: string;
  start: Date;
  end?: Date;
  location?: string;
  description?: string;
}

const CALENDAR_START = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//GigFlow//GigFlow Termine//DE',
  'CALSCALE:GREGORIAN',
  'METHOD:PUBLISH',
  'X-WR-CALNAME:GigFlow',
];

const CALENDAR_END = ['END:VCALENDAR'];

/**
 * Escapes a text value for an iCal property (RFC 5545 §3.3.11).
 * Backslash, semicolon, comma and newlines are the separators that need
 * escaping so titles and addresses survive clean imports.
 */
export function escapeIcalText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Folds long lines at 75 octets (RFC 5545 §3.1) using the CRLF + space
 * continuation. Keeps the file readable by strict parsers like Outlook.
 */
function foldLines(lines: string[]): string {
  const crlf = '\r\n';
  return lines.map((line) => {
    const max = 75;
    const prefix = line.slice(0, max);
    let rest = line.slice(max);
    const out = [prefix];
    while (rest.length > 0) {
      const chunk = rest.slice(0, max - 1);
      rest = rest.slice(max - 1);
      out.push(' ' + chunk);
    }
    return out.join(crlf);
  }).join(crlf) + crlf;
}

/**
 * Formats a date as a floating local date-time (no timezone suffix), the
 * simplest interoperable representation: calendar apps interpret it in the
 * importing user's own timezone.
 */
function formatIcalDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

/** Formats a date in UTC (used for DTSTAMP, which must be UTC per RFC). */
function formatIcalUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function vevent(event: IcalEvent): string[] {
  const lines: string[] = [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${formatIcalUtc(new Date())}`,
    `DTSTART:${formatIcalDateTime(event.start)}`,
  ];
  if (event.end && event.end.getTime() > event.start.getTime()) {
    lines.push(`DTEND:${formatIcalDateTime(event.end)}`);
  }
  lines.push(`SUMMARY:${escapeIcalText(event.title)}`);
  if (event.location?.trim()) {
    lines.push(`LOCATION:${escapeIcalText(event.location.trim())}`);
  }
  if (event.description?.trim()) {
    lines.push(`DESCRIPTION:${escapeIcalText(event.description.trim())}`);
  }
  lines.push('SEQUENCE:0', 'END:VEVENT');
  return lines;
}

/** Builds a complete, import-ready iCalendar document for the given events. */
export function buildIcs(events: IcalEvent[]): string {
  const body = [...CALENDAR_START];
  for (const event of events) {
    body.push(...vevent(event));
  }
  body.push(...CALENDAR_END);
  return foldLines(body);
}

/**
 * Triggers a download of the calendar data as a .ics file.
 * Anchor + object URL avoids any external library.
 */
export function downloadIcs(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'termin';
}

export function eventFilename(event: EventItem): string {
  return `gigflow-${slugify(event.title)}.ics`;
}

/**
 * Maps a GigFlow event to an iCal event. `opts` enrich the export with data
 * the plain event list does not carry (derived end time, venue, setlist).
 */
export function eventToIcal(
  event: EventItem,
  opts: { end?: Date; location?: string; description?: string } = {},
): IcalEvent {
  const parts = [typeLabel(event.type)];
  if (event.bandName?.trim()) {
    parts.push(event.bandName.trim());
  }
  if (opts.description?.trim()) {
    parts.push(opts.description.trim());
  }
  return {
    uid: `gigflow-${event.id}@gigflow`,
    title: event.title.trim(),
    start: new Date(event.dateTime),
    end: opts.end,
    location: opts.location?.trim() || event.venue?.trim() || undefined,
    description: parts.filter(Boolean).join(' · '),
  };
}
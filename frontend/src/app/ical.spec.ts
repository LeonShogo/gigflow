import { describe, expect, it } from 'vitest';

import type { EventItem } from './dashboard/event.model';
import {
  buildIcs,
  escapeIcalText,
  eventFilename,
  eventToIcal,
} from './ical';

function sampleEvent(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: 42,
    title: 'Sommernacht im Hafen',
    type: 'CONCERT',
    dateTime: '2026-09-05T19:30:00',
    venue: 'Hafenklang, Hamburger Str. 1',
    bandName: 'Hafenrocker',
    ...overrides,
  };
}

describe('escapeIcalText', () => {
  it('escapes separators used by the iCal syntax', () => {
    const input = 'A, B; C\\D\nund Zeile 2';
    const escaped = escapeIcalText(input);
    expect(escaped).toContain('A\\, B\\; C\\\\D');
    expect(escaped).toContain('\\n');
  });
});

describe('buildIcs', () => {
  it('wraps events in a VCALENDAR and uses floating DTSTART', () => {
    const content = buildIcs([eventToIcal(sampleEvent())]);
    expect(content).toContain('BEGIN:VCALENDAR');
    expect(content).toContain('END:VCALENDAR');
    expect(content).toContain('BEGIN:VEVENT');
    expect(content).toContain('END:VEVENT');
    expect(content).toContain('DTSTART:20260905T193000');
    expect(content).toContain('DTSTAMP:');
    expect(content).toContain('UID:gigflow-42@gigflow');
    expect(content).toContain('SUMMARY:Sommernacht im Hafen');
    expect(content).toContain('LOCATION:Hafenklang\\, Hamburger Str. 1');
    expect(content).not.toContain('DTEND:');
  });

  it('includes DTEND only when the end is after the start', () => {
    const withEnd = eventToIcal(sampleEvent(), {
      end: new Date(2026, 8, 5, 23, 0),
    });
    expect(buildIcs([withEnd])).toContain('DTEND:20260905T230000');

    const sameTime = eventToIcal(sampleEvent(), {
      end: new Date(2026, 8, 5, 19, 30),
    });
    expect(buildIcs([sameTime])).not.toContain('DTEND:');
  });

  it('combines type, band and extra description', () => {
    const ical = eventToIcal(sampleEvent(), { description: 'Setlist: A → B' });
    expect(ical.description).toBe('Gig · Hafenrocker · Setlist: A → B');
  });
});

describe('eventFilename', () => {
  it('creates a safe file name from the title', () => {
    expect(eventFilename(sampleEvent())).toBe('gigflow-sommernacht-im-hafen.ics');
  });
});
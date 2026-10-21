import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventItem, EventParticipation } from '../dashboard/event.model';
import type { SetlistEntry } from './setlist.model';
import type { EquipmentRequirement } from '../equipment/equipment.model';
import type { ScheduleItem } from '../schedule/schedule.model';
import type { EventLocation } from '../location/location.model';
import {
  buildInfoPdf,
  downloadSetlist,
  downloadSingleSheet,
  type SetlistDownloadData,
} from './setlist-download';

function sampleData(overrides: Partial<SetlistDownloadData> = {}): SetlistDownloadData {
  const event: EventItem = {
    id: 7,
    title: 'Sommernacht im Hafen',
    type: 'CONCERT',
    dateTime: '2026-09-05T19:30:00',
    bandName: 'Hafenrocker',
  };
  const participations: EventParticipation[] = [
    {
      id: 1,
      eventId: 7,
      musicianId: 2,
      status: 'ACCEPTED',
      musician: { id: 2, firstName: 'Lena', lastName: 'Kurz' },
    },
  ];
  const entries: SetlistEntry[] = [
    { id: 1, setlistId: 1, pieceId: 10, pieceTitle: 'Auftakt', position: 1, hasSheetPdf: true },
    { id: 2, setlistId: 1, pieceId: 11, pieceTitle: 'Zugabe', position: 2, hasSheetPdf: false },
  ];
  const requirements: EquipmentRequirement[] = [
    {
      id: 1,
      eventId: 7,
      equipmentId: 3,
      equipmentName: 'Monitor',
      availableOnSite: 'NO',
      needsToBeBrought: 'YES',
    },
  ];
  const scheduleItems: ScheduleItem[] = [{ id: 1, eventId: 7, label: 'Soundcheck', time: '16:00' }];
  const locations: EventLocation[] = [
    {
      id: 1,
      eventId: 7,
      type: 'VENUE',
      name: 'Hafenklang',
      address: 'Hamburger Str. 1',
      note: null,
      phone: null,
      mapsUrl: null,
    },
  ];
  return { event, participations, entries, requirements, scheduleItems, locations, ...overrides };
}

let downloaded: { filename: string; blob: Blob }[];
let objectUrls: Map<string, Blob>;

beforeEach(() => {
  downloaded = [];
  objectUrls = new Map();
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob | MediaSource) => {
    const url = `blob:mock-${objectUrls.size}`;
    objectUrls.set(url, blob as Blob);
    return url;
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url: string) => {
    objectUrls.delete(url);
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    const blob = objectUrls.get(this.href);
    if (blob) {
      downloaded.push({ filename: this.download, blob });
    }
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildInfoPdf', () => {
  it('produces a valid PDF document', async () => {
    const bytes = await buildInfoPdf(sampleData());
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(500);
  });
});

describe('downloadSetlist', () => {
  it('downloads a single info PDF for the "info" scope', async () => {
    const result = await downloadSetlist(sampleData(), 'info', async () => new Blob());
    expect(result).toEqual({ sheets: 0, missing: 0 });
    expect(downloaded).toHaveLength(1);
    expect(downloaded[0].filename).toBe('gigflow-sommernacht-im-hafen-infos.pdf');
    expect(downloaded[0].blob.type).toBe('application/pdf');
  });

  it('bundles only the available note PDFs into a ZIP for "sheets"', async () => {
    const loadSheet = vi.fn(async () => new Blob([new Uint8Array([1, 2, 3])]));
    const result = await downloadSetlist(sampleData(), 'sheets', loadSheet);

    expect(loadSheet).toHaveBeenCalledTimes(1);
    expect(loadSheet).toHaveBeenCalledWith(10);
    expect(result).toEqual({ sheets: 1, missing: 0 });
    expect(downloaded[0].filename).toBe('gigflow-sommernacht-im-hafen-noten.zip');
    expect(downloaded[0].blob.type).toBe('application/zip');
  });

  it('includes the info PDF first for "info-and-sheets"', async () => {
    const loadSheet = vi.fn(async () => new Blob([new Uint8Array([9, 9])]));
    const result = await downloadSetlist(sampleData(), 'info-and-sheets', loadSheet);

    expect(result).toEqual({ sheets: 1, missing: 0 });
    expect(downloaded[0].filename).toBe('gigflow-sommernacht-im-hafen-infos-und-noten.zip');
    const zipBytes = new Uint8Array(await downloaded[0].blob.arrayBuffer());
    const zipText = new TextDecoder().decode(zipBytes);
    expect(zipText).toContain('infos.pdf');
    expect(zipText).toContain('01-auftakt.pdf');
  });

  it('counts failed note loads as missing and skips them', async () => {
    const loadSheet = vi.fn(async () => {
      throw new Error('offline');
    });
    const result = await downloadSetlist(sampleData(), 'sheets', loadSheet);
    expect(result).toEqual({ sheets: 0, missing: 1 });
    expect(downloaded).toHaveLength(0);
  });
});

describe('downloadSingleSheet', () => {
  it('stores the sheet under a slug of the title', async () => {
    await downloadSingleSheet(new Blob([new Uint8Array([1])]), 'Auftakt & Finale');
    expect(downloaded[0].filename).toBe('auftakt-finale.pdf');
  });
});

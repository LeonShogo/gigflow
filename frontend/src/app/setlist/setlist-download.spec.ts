import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventItem, EventParticipation } from '../dashboard/event.model';
import type { SetlistEntry } from './setlist.model';
import type { EquipmentRequirement } from '../equipment/equipment.model';
import type { ScheduleItem } from '../schedule/schedule.model';
import type { EventLocation } from '../location/location.model';
import {
  buildInfoPdf,
  downloadInfoSheet,
  downloadSheetBundle,
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
    {
      id: 1,
      setlistId: 1,
      pieceId: 10,
      pieceTitle: 'Auftakt',
      position: 1,
      sheets: [
        { id: 101, pieceId: 10, label: 'Gitarre', originalName: 'Gitarre.pdf' },
        { id: 102, pieceId: 10, label: 'Bass', originalName: 'Bass.pdf' },
      ],
    },
    {
      id: 2,
      setlistId: 1,
      pieceId: 11,
      pieceTitle: 'Zugabe',
      position: 2,
      sheets: [{ id: 201, pieceId: 11, label: 'Gesang', originalName: 'Gesang.pdf' }],
    },
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
  }, 15000);
});

describe('downloadInfoSheet', () => {
  it('downloads a single info PDF', async () => {
    await downloadInfoSheet(sampleData());
    expect(downloaded).toHaveLength(1);
    expect(downloaded[0].filename).toBe('gigflow-sommernacht-im-hafen-infos.pdf');
    expect(downloaded[0].blob.type).toBe('application/pdf');
  }, 15000);
});

describe('downloadSheetBundle', () => {
  it('loads only the selected sheet IDs and skips empty pieces', async () => {
    const loadSheet = vi.fn(async () => new Blob([new Uint8Array([1, 2, 3])]));
    const result = await downloadSheetBundle(
      sampleData(),
      { pieces: [{ pieceId: 10, sheetIds: [101] }], includeInfo: false },
      loadSheet,
    );

    expect(loadSheet).toHaveBeenCalledTimes(1);
    expect(loadSheet).toHaveBeenCalledWith(101);
    expect(result).toEqual({ sheets: 1, missing: 0 });
    expect(downloaded[0].filename).toBe('gigflow-sommernacht-im-hafen-noten.zip');
    expect(downloaded[0].blob.type).toBe('application/zip');
    const zipText = new TextDecoder().decode(new Uint8Array(await downloaded[0].blob.arrayBuffer()));
    expect(zipText).toContain('01-auftakt-gitarre.pdf');
    expect(zipText).not.toContain('01-auftakt-bass.pdf');
    expect(zipText).not.toContain('02-zugabe-gesang.pdf');
  });

  it('includes the info PDF first and keeps per-piece names unique', async () => {
    const loadSheet = vi.fn(async () => new Blob([new Uint8Array([9, 9])]));
    const result = await downloadSheetBundle(
      sampleData(),
      {
        pieces: [
          { pieceId: 10, sheetIds: [101, 102] },
          { pieceId: 11, sheetIds: [201] },
        ],
        includeInfo: true,
      },
      loadSheet,
    );

    expect(result).toEqual({ sheets: 3, missing: 0 });
    expect(downloaded[0].filename).toBe('gigflow-sommernacht-im-hafen-infos-und-noten.zip');
    const zipText = new TextDecoder().decode(new Uint8Array(await downloaded[0].blob.arrayBuffer()));
    expect(zipText).toContain('infos.pdf');
    expect(zipText).toContain('01-auftakt-gitarre.pdf');
    expect(zipText).toContain('01-auftakt-bass.pdf');
    expect(zipText).toContain('02-zugabe-gesang.pdf');
  });

  it('counts failed sheet loads as missing and skips them', async () => {
    const loadSheet = vi.fn(async () => {
      throw new Error('offline');
    });
    const result = await downloadSheetBundle(
      sampleData(),
      { pieces: [{ pieceId: 10, sheetIds: [101, 102] }], includeInfo: false },
      loadSheet,
    );

    expect(result).toEqual({ sheets: 0, missing: 2 });
    expect(downloaded).toHaveLength(0);
  });

  it('still downloads the info PDF when every sheet fails', async () => {
    const loadSheet = vi.fn(async () => {
      throw new Error('offline');
    });
    const result = await downloadSheetBundle(
      sampleData(),
      { pieces: [{ pieceId: 10, sheetIds: [101] }], includeInfo: true },
      loadSheet,
    );

    expect(result).toEqual({ sheets: 0, missing: 1 });
    expect(downloaded[0].filename).toBe('gigflow-sommernacht-im-hafen-infos-und-noten.zip');
  });
});

import { TestBed } from '@angular/core/testing';
import { PDFDocument } from 'pdf-lib';

import { EventPdfService } from './event-pdf.service';
import type { SetlistDownloadData } from '../setlist/setlist-download';
import type { EventItem } from '../dashboard/event.model';

const CONCERT: EventItem = {
  id: 1,
  title: 'Hafenrocker',
  type: 'CONCERT',
  dateTime: '2026-09-12T20:00:00',
  bandName: 'The Dockyarders',
};

const SHEET_GUITAR = { id: 11, pieceId: 1, label: 'Gitarre', originalName: 'Gitarre.pdf' };
const SHEET_BASS = { id: 12, pieceId: 1, label: 'Bass', originalName: 'Bass.pdf' };
const SHEET_VOICE = { id: 21, pieceId: 2, label: 'Gesang', originalName: 'Gesang.pdf' };

const DATA: SetlistDownloadData = {
  event: CONCERT,
  participations: [],
  entries: [
    { id: 2, setlistId: 10, pieceId: 2, pieceTitle: 'Zweites Stück', position: 1, sheets: [SHEET_VOICE] },
    {
      id: 1,
      setlistId: 10,
      pieceId: 1,
      pieceTitle: 'Erstes Stück',
      position: 0,
      sheets: [SHEET_GUITAR, SHEET_BASS],
    },
  ],
  requirements: [],
  scheduleItems: [],
  locations: [],
};

async function pdfWithPages(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let index = 0; index < pages; index += 1) {
    doc.addPage([595.28, 841.89]);
  }
  return doc.save();
}

describe('EventPdfService', () => {
  let service: EventPdfService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EventPdfService);
  });

  it('should append every sheet in setlist order after the info pages', async () => {
    const pageCounts: Record<number, number> = { 11: 2, 12: 1, 21: 1 };
    const requested: number[] = [];
    const loadSheet = async (sheetId: number): Promise<Blob> => {
      requested.push(sheetId);
      return new Blob([new Uint8Array(await pdfWithPages(pageCounts[sheetId]))], {
        type: 'application/pdf',
      });
    };

    const infoOnly = await PDFDocument.load(await service.build({ ...DATA, entries: [] }, loadSheet));
    const combined = await PDFDocument.load(await service.build(DATA, loadSheet));

    expect(requested).toEqual([11, 12, 21]);
    expect(combined.getPageCount()).toBe(infoOnly.getPageCount() + 4);
  }, 20000);

  it('should skip a broken sheet and keep the rest', async () => {
    const loadSheet = async (sheetId: number): Promise<Blob> => {
      if (sheetId === 12) {
        throw new Error('kaputt');
      }
      return new Blob([new Uint8Array(await pdfWithPages(1))], { type: 'application/pdf' });
    };

    const infoOnly = await PDFDocument.load(await service.build({ ...DATA, entries: [] }, loadSheet));
    const combined = await PDFDocument.load(await service.build(DATA, loadSheet));

    expect(combined.getPageCount()).toBe(infoOnly.getPageCount() + 2);
  }, 20000);
});

import { Injectable } from '@angular/core';

import { buildInfoDocument, finalizePdf } from '../setlist/setlist-download';
import type { SetlistDownloadData } from '../setlist/setlist-download';

/**
 * Builds the gig-sheet PDF for the print view: the formatted info sheet
 * followed by the original, untouched sheet-music PDFs (one piece after
 * another, each starting on its own page).
 */
@Injectable({ providedIn: 'root' })
export class EventPdfService {
  async build(
    data: SetlistDownloadData,
    loadSheet: (pieceId: number) => Promise<Blob>,
  ): Promise<Uint8Array> {
    const { PDFDocument } = await import('pdf-lib');
    const doc = await buildInfoDocument(data);

    const entries = [...data.entries].sort((a, b) => a.position - b.position);
    for (const entry of entries) {
      if (!entry.hasSheetPdf) {
        continue;
      }
      try {
        const source = await PDFDocument.load(await (await loadSheet(entry.pieceId)).arrayBuffer());
        const pages = await doc.copyPages(source, source.getPageIndices());
        pages.forEach((page) => doc.addPage(page));
      } catch {
        // ein einzelnes fehlerhaftes Notenblatt darf das PDF nicht blockieren
      }
    }

    await finalizePdf(doc, data.event.dateTime);
    return doc.save();
  }
}

import { getDocument } from 'pdfjs-dist';
import * as pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs';

(globalThis as { pdfjsWorker?: typeof pdfjsWorker }).pdfjsWorker = pdfjsWorker;

const PRINT_SCALE = 2;

/**
 * Renders every page of a PDF to PNG data URLs so the browser can
 * print the pages as part of the document.
 */
export async function pdfToImages(file: Blob): Promise<string[]> {
  const data = await file.arrayBuffer();
  const doc = await getDocument({ data }).promise;
  const sources: string[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: PRINT_SCALE });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const context = canvas.getContext('2d');
      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        sources.push(canvas.toDataURL('image/png'));
      }
    }
  } finally {
    await doc.destroy().catch(() => undefined);
  }
  return sources;
}
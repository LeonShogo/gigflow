import { formatDate, formatTime, formatTimeOnly, typeLabel } from '../event-format';
import { downloadBlob, slugify } from '../download';
import { createZip } from '../print/zip';
import type { PDFDocument } from 'pdf-lib';
import type { EventItem, EventParticipation, ParticipationStatus } from '../dashboard/event.model';
import type { SetlistEntry } from './setlist.model';
import type { EquipmentRequirement, RequirementState } from '../equipment/equipment.model';
import type { ScheduleItem } from '../schedule/schedule.model';
import type { EventLocation } from '../location/location.model';

export interface SetlistDownloadData {
  event: EventItem;
  participations: EventParticipation[];
  entries: SetlistEntry[];
  requirements: EquipmentRequirement[];
  scheduleItems: ScheduleItem[];
  locations: EventLocation[];
}

/** Per-piece sheet selection for the bundled ZIP download. */
export interface SheetSelection {
  pieces: { pieceId: number; sheetIds: number[] }[];
  includeInfo: boolean;
}

const STATUS_LABELS: Record<ParticipationStatus, string> = {
  SUGGESTED: 'Vorschlag',
  INVITED: 'Eingeladen',
  ACCEPTED: 'Zusage',
  DECLINED: 'Abgesagt',
};

const STATE_LABELS: Record<RequirementState, string> = {
  YES: 'Ja',
  NO: 'Nein',
  UNKNOWN: 'Offen',
};

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;
const LINE_HEIGHT = 16;
/** Extra vertical room reserved for a section divider (offset above + below). */
const DIVIDER_SPACE = 25;
const HEADING_SIZE = 13;
const TITLE_SIZE = 20;
const FONT_SIZE = 11;

type Rgb = [number, number, number];

interface TextRun {
  text: string;
  size: number;
  bold: boolean;
  color: Rgb;
  /** carry the following block on the same page if there is room */
  keepWithNext?: boolean;
}

/** A logical section (heading + entries) that should not be split awkwardly. */
interface Block {
  lines: TextRun[];
  /** a little more air before this block */
  spaced?: boolean;
  /** draw a thin separator line under the first (heading) line */
  divider?: boolean;
}

/** Builds a formatted PDF of the gig sheet (without the sheet music). */
export async function buildInfoPdf(data: SetlistDownloadData): Promise<Uint8Array> {
  const doc = await buildInfoDocument(data);
  await finalizePdf(doc, data.event.dateTime);
  return doc.save();
}

/** Builds the gig-sheet document so callers can append further pages before saving. */
export async function buildInfoDocument(data: SetlistDownloadData): Promise<PDFDocument> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await loadLogo(doc);

  const contentWidth = A4[0] - MARGIN * 2;
  const ink: Rgb = [0.1, 0.1, 0.12];
  const soft: Rgb = [0.32, 0.34, 0.38];
  const accent: Rgb = [0.12, 0.42, 0.78];

  let page = doc.addPage(A4);
  let y = page.getHeight() - MARGIN;

  const blocks: Block[] = [];

  const title = (text: string, size: number, color: Rgb = ink): TextRun => ({
    text,
    size,
    bold: true,
    color,
  });
  const body = (text: string): TextRun => ({ text, size: FONT_SIZE, bold: false, color: ink });

  const wrap = (run: TextRun): TextRun[] => {
    const words = sanitize(run.text).split(/\s+/);
    const measure = run.bold ? bold : font;
    const out: string[] = [];
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measure.widthOfTextAtSize(candidate, run.size) > contentWidth && current) {
        out.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    out.push(current);
    return out.map((text) => ({ ...run, text }));
  };

  const headingBlock = (heading: string, entries: string[]): Block => ({
    spaced: true,
    divider: true,
    lines: [
      { text: heading, size: HEADING_SIZE, bold: true, color: ink, keepWithNext: true },
      ...(entries.length > 0
        ? [{ ...wrap(body(entries[0]))[0], keepWithNext: true }]
        : []),
      ...entries.slice(1).flatMap((entry) => wrap(body(entry))),
    ],
  });

  // Header block (type / title / date / band).
  const header: TextRun[] = [
    title(typeLabel(data.event.type).toUpperCase(), 11, accent),
    title(data.event.title, TITLE_SIZE),
    body(`${formatDate(data.event.dateTime)}, ${formatTime(data.event.dateTime)} Uhr`),
  ];
  if (data.event.bandName) {
    header.push(body(data.event.bandName));
  }
  blocks.push({ lines: header });

  const sortedParticipations = [...data.participations].sort(
    (a, b) => statusRank(a.status) - statusRank(b.status),
  );
  if (sortedParticipations.length > 0) {
    blocks.push(
      headingBlock(
        'Musiker*innen / Zusagen',
        sortedParticipations.map((p) => {
          const name = p.musician
            ? `${p.musician.firstName} ${p.musician.lastName}`
            : `#${p.musicianId}`;
          const instrument = p.musician?.instrument ? ` – ${p.musician.instrument}` : '';
          return `${name}${instrument}: ${STATUS_LABELS[p.status]}`;
        }),
      ),
    );
  }

  const sortedEntries = [...data.entries].sort((a, b) => a.position - b.position);
  if (sortedEntries.length > 0) {
    blocks.push(
      headingBlock(
        'Setlist',
        sortedEntries.map((entry, index) => {
          const sheet = entry.sheets.length > 0 ? ' · Noten' : '';
          return `${index + 1}. ${entry.pieceTitle}${sheet}`;
        }),
      ),
    );
  }

  const schedule = [...data.scheduleItems].sort((a, b) => a.time.localeCompare(b.time));
  if (schedule.length > 0) {
    blocks.push(
      headingBlock(
        'Ablauf',
        schedule.map((item) => `${formatTimeOnly(item.time)} Uhr · ${item.label}`),
      ),
    );
  }

  if (data.requirements.length > 0) {
    blocks.push(
      headingBlock(
        'Equipment',
        data.requirements.map((req) => {
          const responsible = req.responsibleMusician
            ? ` · ${req.responsibleMusician.firstName} ${req.responsibleMusician.lastName}`
            : '';
          const brought = STATE_LABELS[req.needsToBeBrought] === 'Ja' ? ' · mitbringen' : '';
          return `${req.equipmentName}: vor Ort ${STATE_LABELS[req.availableOnSite]} / mitbringen ${STATE_LABELS[req.needsToBeBrought]}${brought}${responsible}`;
        }),
      ),
    );
  }

  if (data.locations.length > 0) {
    blocks.push({
      spaced: true,
      divider: true,
      lines: [
        { text: 'Orte', size: HEADING_SIZE, bold: true, color: ink, keepWithNext: true },
        ...data.locations.flatMap((loc) => {
          const address = loc.address ? `, ${loc.address}` : '';
          const entries: TextRun[] = [{ ...body(`${loc.name}${address}`), bold: true }];
          const extras = [loc.note, loc.phone].filter((v): v is string => Boolean(v && v.trim()));
          if (extras.length > 0) {
            entries.push(...wrap({ text: extras.join(' · '), size: FONT_SIZE, bold: false, color: soft }));
          }
          return entries;
        }),
      ],
    });
  }

  for (const block of blocks) {
    const height =
      block.lines.reduce((sum, run) => sum + run.size + 5, 0) + (block.divider ? DIVIDER_SPACE : 0);
    const gapBefore = block.spaced ? 12 : 0;
    const available = page.getHeight() - MARGIN * 2;

    // Keep the block together when it fits on a fresh page; otherwise flow it.
    const fitsOnNewPage = height <= available;
    if (y - gapBefore - height < MARGIN && fitsOnNewPage && y < page.getHeight() - MARGIN) {
      page = doc.addPage(A4);
      y = page.getHeight() - MARGIN;
    } else {
      y -= gapBefore;
    }

    for (const [index, run] of block.lines.entries()) {
      // Never leave a heading alone at the bottom of a page.
      if (run.keepWithNext && y - (run.size + 5) - LINE_HEIGHT < MARGIN && y < page.getHeight() - MARGIN) {
        page = doc.addPage(A4);
        y = page.getHeight() - MARGIN;
      }
      ensure(y - (run.size + 5) < MARGIN);
      page.drawText(sanitize(run.text), {
        x: MARGIN,
        y,
        size: run.size,
        font: run.bold ? bold : font,
        color: rgb(...run.color),
      });
      y -= run.size + 5;
      if (block.divider && index === 0) {
        y -= 9;
        page.drawLine({
          start: { x: MARGIN, y },
          end: { x: MARGIN + contentWidth, y },
          thickness: 0.75,
          color: rgb(0.82, 0.84, 0.88),
        });
        y -= 14;
      }
    }
  }

  const pages = doc.getPages();
  if (logo) {
    const size = 42;
    pages[0].drawImage(logo, {
      x: A4[0] - MARGIN - size,
      y: pages[0].getHeight() - MARGIN - size / 2,
      width: size,
      height: size,
    });
  }

  return doc;

  function ensure(needsNewPage: boolean): void {
    if (needsNewPage) {
      page = doc.addPage(A4);
      y = page.getHeight() - MARGIN;
    }
  }
}

/**
 * Stamps the share footer (event date + page counter) on every page.
 * Called once the final set of pages is known, i.e. after any appended sheets.
 */
export async function finalizePdf(doc: PDFDocument, dateTime: string): Promise<void> {
  const { StandardFonts, rgb } = await import('pdf-lib');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const label = `${formatDate(dateTime)}, ${formatTime(dateTime)} Uhr`;
  pages.forEach((page, index) => {
    page.drawText(`${label}   ·   Seite ${index + 1} / ${pages.length}`, {
      x: MARGIN,
      y: MARGIN / 2,
      size: 8.5,
      font,
      color: rgb(0.55, 0.58, 0.62),
    });
  });
}

/** Loads the app icon as a PNG for the sheet header; missing icon is not fatal. */
async function loadLogo(doc: PDFDocument) {
  try {
    const response = await fetch('/icons/icon-192.png');
    if (!response.ok) {
      return null;
    }
    return await doc.embedPng(await response.arrayBuffer());
  } catch {
    return null;
  }
}

function statusRank(status: ParticipationStatus): number {
  if (status === 'ACCEPTED') {
    return 0;
  }
  if (status === 'INVITED') {
    return 1;
  }
  return status === 'SUGGESTED' ? 2 : 3;
}

/** pdf-lib's standard fonts use WinAnsi; strip characters they cannot encode. */
function sanitize(value: string): string {
  return value.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, '-');
}

/** Downloads the formatted gig sheet as a standalone PDF. */
export async function downloadInfoSheet(data: SetlistDownloadData): Promise<void> {
  const bytes = await buildInfoPdf(data);
  downloadBlob(
    new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }),
    `gigflow-${slugify(data.event.title)}-infos.pdf`,
  );
}

/**
 * Downloads the selected note sheets as a ZIP, optionally prefixed with the
 * gig-sheet PDF. Note PDFs are fetched via the given loader so callers stay in
 * control of error handling and caching.
 */
export async function downloadSheetBundle(
  data: SetlistDownloadData,
  selection: SheetSelection,
  loadSheet: (sheetId: number) => Promise<Blob>,
): Promise<{ sheets: number; missing: number }> {
  const base = `gigflow-${slugify(data.event.title)}`;
  const sortedEntries = [...data.entries].sort((a, b) => a.position - b.position);
  const usedNames = new Set<string>();
  const files: { name: string; data: Uint8Array }[] = [];
  let missing = 0;

  for (const [index, entry] of sortedEntries.entries()) {
    const choice = selection.pieces.find((piece) => piece.pieceId === entry.pieceId);
    if (!choice || choice.sheetIds.length === 0) {
      continue;
    }
    for (const sheet of entry.sheets) {
      if (!choice.sheetIds.includes(sheet.id)) {
        continue;
      }
      try {
        const blob = await loadSheet(sheet.id);
        const name = uniqueFileName(
          `${String(index + 1).padStart(2, '0')}-${slugify(entry.pieceTitle)}-${slugify(sheet.label)}.pdf`,
          usedNames,
        );
        files.push({ name, data: new Uint8Array(await blob.arrayBuffer()) });
      } catch {
        missing += 1;
      }
    }
  }

  const sheets = files.length;
  if (selection.includeInfo) {
    files.unshift({ name: 'infos.pdf', data: await buildInfoPdf(data) });
  }

  if (files.length === 0) {
    return { sheets: 0, missing };
  }

  downloadBlob(
    createZip(files),
    `${base}-${selection.includeInfo ? 'infos-und-noten' : 'noten'}.zip`,
  );
  return { sheets, missing };
}

function uniqueFileName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : '';
  let counter = 2;
  let candidate = `${stem}-${counter}${extension}`;
  while (used.has(candidate)) {
    counter += 1;
    candidate = `${stem}-${counter}${extension}`;
  }
  used.add(candidate);
  return candidate;
}

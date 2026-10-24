import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { ModalDialogComponent } from '../shared/modal-dialog.component';
import type { SheetSelection } from './setlist-download';
import type { PieceSheet, SetlistEntry } from './setlist.model';
import { TranslatePipe } from '../language/translate.pipe';

const ALL_PARTS = '*';
const NO_PARTS = '-';

@Component({
  selector: 'app-setlist-download-dialog',
  imports: [ModalDialogComponent, TranslatePipe],
  templateUrl: './setlist-download-dialog.component.html',
  styleUrl: './setlist-download-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetlistDownloadDialogComponent {
  readonly entries = input.required<SetlistEntry[]>();
  readonly busy = input(false);
  readonly closed = output<void>();
  readonly confirmed = output<SheetSelection>();

  protected readonly includeInfo = signal(false);
  protected readonly globalPart = signal(ALL_PARTS);
  protected readonly overrides = signal<Record<number, string>>({});

  protected readonly pieces = computed(() =>
    [...this.entries()]
      .filter((entry) => entry.sheets.length > 0)
      .sort((a, b) => a.position - b.position),
  );

  protected readonly labels = computed(() =>
    [...new Set(this.pieces().flatMap((entry) => entry.sheets.map((sheet) => sheet.label)))].sort(
      (a, b) => a.localeCompare(b, 'de'),
    ),
  );

  protected readonly hasAnySheet = computed(() => this.pieces().length > 0);

  protected readonly selectedCount = computed(() =>
    this.pieces().reduce((sum, entry) => sum + this.selectedSheets(entry).length, 0),
  );

  protected readonly canDownload = computed(() => this.selectedCount() > 0 || this.includeInfo());

  protected close(): void {
    this.closed.emit();
  }

  protected toggleInfo(event: Event): void {
    this.includeInfo.set((event.target as HTMLInputElement).checked);
  }

  protected onGlobalPart(event: Event): void {
    this.globalPart.set((event.target as HTMLSelectElement).value);
  }

  protected onOverride(pieceId: number, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.overrides.update((current) => {
      const next = { ...current };
      if (value) {
        next[pieceId] = value;
      } else {
        delete next[pieceId];
      }
      return next;
    });
  }

  protected overrideValue(entry: SetlistEntry): string {
    return this.overrides()[entry.pieceId] ?? '';
  }

  protected effectiveLabel(entry: SetlistEntry): string {
    const part = this.partFor(entry);
    if (part === ALL_PARTS) {
      return 'alle Stimmen';
    }
    if (part === NO_PARTS) {
      return 'keine';
    }
    return part;
  }

  protected selectedSheets(entry: SetlistEntry): PieceSheet[] {
    const part = this.partFor(entry);
    if (part === NO_PARTS) {
      return [];
    }
    if (part === ALL_PARTS) {
      return entry.sheets;
    }
    return entry.sheets.filter((sheet) => sheet.label === part);
  }

  protected confirm(): void {
    if (!this.canDownload() || this.busy()) {
      return;
    }
    const pieces = this.pieces()
      .map((entry) => ({
        pieceId: entry.pieceId,
        sheetIds: this.selectedSheets(entry).map((sheet) => sheet.id),
      }))
      .filter((choice) => choice.sheetIds.length > 0);
    this.confirmed.emit({ pieces, includeInfo: this.includeInfo() });
  }

  private partFor(entry: SetlistEntry): string {
    return this.overrides()[entry.pieceId] ?? this.globalPart();
  }
}

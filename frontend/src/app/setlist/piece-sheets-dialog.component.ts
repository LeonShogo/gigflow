import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { downloadBlob } from '../download';
import { ToastService } from '../notifications/toast.service';
import { ModalDialogComponent } from '../shared/modal-dialog.component';
import type { PieceSheet } from './setlist.model';
import { SetlistService } from './setlist.service';

@Component({
  selector: 'app-piece-sheets-dialog',
  imports: [FormsModule, ModalDialogComponent],
  templateUrl: './piece-sheets-dialog.component.html',
  styleUrl: './piece-sheets-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PieceSheetsDialogComponent implements OnInit {
  private readonly setlistService = inject(SetlistService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private destroyed = false;

  readonly pieceId = input.required<number>();
  readonly pieceTitle = input.required<string>();
  readonly canManage = input(false);
  readonly initialSheets = input<PieceSheet[]>([]);
  readonly suspendEscape = input(false);

  readonly closed = output<void>();
  readonly sheetsChanged = output<PieceSheet[]>();
  readonly openSheet = output<{ file: File; title: string }>();

  protected readonly sheets = signal<PieceSheet[]>([]);
  protected readonly loading = signal(false);
  protected readonly uploading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly feedback = signal<string | null>(null);
  protected readonly renamingId = signal<number | null>(null);
  protected readonly renameDraft = signal('');
  protected readonly savingRename = signal(false);
  protected readonly confirmingDeleteId = signal<number | null>(null);
  protected readonly deletingId = signal<number | null>(null);
  protected readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('sheetFiles');

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
    });
  }

  ngOnInit(): void {
    this.sheets.set(this.initialSheets());
    void this.load();
  }

  protected close(): void {
    this.closed.emit();
  }

  protected openFilePicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) {
      return;
    }
    this.uploading.set(true);
    this.error.set(null);
    this.feedback.set(null);
    try {
      const created = await firstValueFrom(this.setlistService.uploadSheets(this.pieceId(), files));
      this.updateSheets([...this.sheets(), ...created]);
      this.feedback.set(
        created.length === 1 ? 'Notenblatt hinzugefügt.' : `${created.length} Notenblätter hinzugefügt.`,
      );
    } catch {
      this.error.set('Upload fehlgeschlagen. Bitte gültige PDF-Dateien wählen.');
    } finally {
      this.uploading.set(false);
    }
  }

  protected startRename(sheet: PieceSheet): void {
    this.error.set(null);
    this.renamingId.set(sheet.id);
    this.renameDraft.set(sheet.label);
  }

  protected onRenameInput(event: Event): void {
    this.renameDraft.set((event.target as HTMLInputElement).value);
  }

  protected cancelRename(): void {
    this.renamingId.set(null);
    this.renameDraft.set('');
  }

  protected async saveRename(sheet: PieceSheet): Promise<void> {
    const label = this.renameDraft().trim();
    if (!label || this.savingRename()) {
      return;
    }
    this.savingRename.set(true);
    this.error.set(null);
    try {
      const updated = await firstValueFrom(this.setlistService.renameSheet(sheet.id, label));
      this.updateSheets(this.sheets().map((item) => (item.id === updated.id ? updated : item)));
      this.cancelRename();
    } catch {
      this.error.set('Bezeichnung konnte nicht gespeichert werden.');
    } finally {
      this.savingRename.set(false);
    }
  }

  protected async open(sheet: PieceSheet): Promise<void> {
    this.error.set(null);
    try {
      const blob = await firstValueFrom(this.setlistService.downloadSheet(sheet.id));
      this.openSheet.emit({
        file: new File([blob], this.fileName(sheet), { type: 'application/pdf' }),
        title: `${this.pieceTitle()} – ${sheet.label}`,
      });
    } catch {
      this.error.set('Notenblatt konnte nicht geöffnet werden.');
    }
  }

  protected async download(sheet: PieceSheet): Promise<void> {
    this.error.set(null);
    try {
      const blob = await firstValueFrom(this.setlistService.downloadSheet(sheet.id, true));
      downloadBlob(blob, this.fileName(sheet));
    } catch {
      this.error.set('Notenblatt konnte nicht heruntergeladen werden.');
    }
  }

  protected requestDelete(sheet: PieceSheet): void {
    this.error.set(null);
    this.confirmingDeleteId.set(sheet.id);
  }

  protected cancelDelete(): void {
    this.confirmingDeleteId.set(null);
  }

  protected async confirmDelete(sheet: PieceSheet): Promise<void> {
    if (this.deletingId() !== null) {
      return;
    }
    this.deletingId.set(sheet.id);
    this.error.set(null);
    try {
      const blob = await firstValueFrom(this.setlistService.downloadSheet(sheet.id));
      await firstValueFrom(this.setlistService.removeSheet(sheet.id));
      this.updateSheets(this.sheets().filter((item) => item.id !== sheet.id));
      this.confirmingDeleteId.set(null);
      this.feedback.set('Notenblatt entfernt.');
      this.toast.show('Notenblatt entfernt.', {
        label: 'Rückgängig',
        run: () => void this.restoreSheet(sheet, blob),
      });
    } catch {
      this.error.set('Notenblatt konnte nicht entfernt werden.');
    } finally {
      this.deletingId.set(null);
    }
  }

  private async restoreSheet(sheet: PieceSheet, blob: Blob): Promise<void> {
    try {
      const file = new File([blob], this.fileName(sheet), {
        type: 'application/pdf',
      });
      const [created] = await firstValueFrom(
        this.setlistService.uploadSheets(this.pieceId(), [file]),
      );
      if (!created) {
        throw new Error('Notenblatt konnte nicht hochgeladen werden.');
      }

      let restored = created;
      if (created.label !== sheet.label) {
        try {
          restored = await firstValueFrom(
            this.setlistService.renameSheet(created.id, sheet.label),
          );
        } catch {
          restored = created;
        }
      }

      if (this.destroyed) {
        this.toast.show('Notenblatt wiederhergestellt.');
      } else {
        this.updateSheets([...this.sheets(), restored]);
        this.feedback.set('Notenblatt wiederhergestellt.');
      }
    } catch {
      if (this.destroyed) {
        this.toast.show('Notenblatt konnte nicht wiederhergestellt werden.');
      } else {
        this.error.set('Notenblatt konnte nicht wiederhergestellt werden.');
      }
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.sheets.set(await firstValueFrom(this.setlistService.loadSheets(this.pieceId())));
    } catch {
      // Keep the sheets that came with the setlist response.
    } finally {
      this.loading.set(false);
    }
  }

  private updateSheets(sheets: PieceSheet[]): void {
    this.sheets.set(sheets);
    this.sheetsChanged.emit(sheets);
  }

  private fileName(sheet: PieceSheet): string {
    const name = sheet.originalName.trim();
    if (name.toLowerCase().endsWith('.pdf')) {
      return name;
    }
    return `${name || sheet.label || 'noten'}.pdf`;
  }
}

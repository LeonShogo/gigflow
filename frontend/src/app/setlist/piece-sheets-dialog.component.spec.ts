import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { PieceSheetsDialogComponent } from './piece-sheets-dialog.component';
import { ToastService } from '../notifications/toast.service';
import type { PieceSheet } from './setlist.model';

const GUITAR: PieceSheet = {
  id: 101,
  pieceId: 3,
  label: 'Gitarre',
  originalName: 'Gitarre.pdf',
};

const BASS: PieceSheet = {
  id: 102,
  pieceId: 3,
  label: 'Bass',
  originalName: 'Bass.pdf',
};

describe('PieceSheetsDialogComponent', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<PieceSheetsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PieceSheetsDialogComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PieceSheetsDialogComponent);
    fixture.componentRef.setInput('pieceId', 3);
    fixture.componentRef.setInput('pieceTitle', 'Hallo Welt');
    fixture.componentRef.setInput('canManage', true);
    fixture.componentRef.setInput('initialSheets', [GUITAR]);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function button(text: string): HTMLButtonElement {
    const match = Array.from(root().querySelectorAll('button')).find(
      (item) => item.textContent?.trim() === text,
    );
    expect(match, `button "${text}"`).toBeTruthy();
    return match as HTMLButtonElement;
  }

  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  }

  async function flushLoad(sheets: PieceSheet[] = [GUITAR]): Promise<void> {
    fixture.detectChanges();
    httpMock.expectOne('/api/pieces/3/sheets').flush(sheets);
    await settle();
  }

  it('should list the initial sheets and load the current ones', async () => {
    fixture.detectChanges();
    expect(root().querySelector('.sheet__label')?.textContent?.trim()).toBe('Gitarre');

    httpMock.expectOne('/api/pieces/3/sheets').flush([GUITAR, BASS]);
    await settle();

    const labels = Array.from(root().querySelectorAll('.sheet__label')).map((item) =>
      item.textContent?.trim(),
    );
    expect(labels).toEqual(['Gitarre', 'Bass']);
  });

  it('should upload multiple PDFs and emit the updated list', async () => {
    const changed: PieceSheet[][] = [];
    fixture.componentInstance.sheetsChanged.subscribe((sheets) => changed.push(sheets));
    await flushLoad([]);

    const input = root().querySelector('input[type="file"]') as HTMLInputElement;
    const files = [
      new File(['%PDF-1.4'], 'Gitarre.pdf', { type: 'application/pdf' }),
      new File(['%PDF-1.4'], 'Bass.pdf', { type: 'application/pdf' }),
    ];
    Object.defineProperty(input, 'files', { value: files });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/pieces/3/sheets');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush([GUITAR, BASS]);
    await settle();

    expect(root().textContent).toContain('2 Notenblätter hinzugefügt.');
    expect(changed.at(-1)?.map((sheet) => sheet.label)).toEqual(['Gitarre', 'Bass']);
  });

  it('should rename a sheet', async () => {
    const changed: PieceSheet[][] = [];
    fixture.componentInstance.sheetsChanged.subscribe((sheets) => changed.push(sheets));
    await flushLoad([GUITAR]);

    button('Umbenennen').click();
    fixture.detectChanges();

    const input = root().querySelector('.sheet__input') as HTMLInputElement;
    input.value = 'Gitarre 1';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form = root().querySelector('.sheet__rename') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/piece-sheets/101');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ label: 'Gitarre 1' });
    req.flush({ ...GUITAR, label: 'Gitarre 1' });
    await settle();

    expect(root().querySelector('.sheet__label')?.textContent?.trim()).toBe('Gitarre 1');
    expect(changed.at(-1)?.[0].label).toBe('Gitarre 1');
  });

  it('should delete a sheet after confirmation and restore it on undo', async () => {
    const changed: PieceSheet[][] = [];
    fixture.componentInstance.sheetsChanged.subscribe((sheets) => changed.push(sheets));
    await flushLoad([GUITAR]);

    button('Entfernen').click();
    fixture.detectChanges();
    expect(root().querySelector('.sheet__confirm')).toBeTruthy();

    button('Löschen').click();
    fixture.detectChanges();

    const download = httpMock.expectOne('/api/piece-sheets/101');
    expect(download.request.method).toBe('GET');
    download.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
    await settle();

    const req = httpMock.expectOne('/api/piece-sheets/101');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    await settle();

    expect(root().querySelector('.sheet-empty')).toBeTruthy();
    expect(changed.at(-1)).toEqual([]);

    TestBed.inject(ToastService).runAction();
    await settle();

    const upload = httpMock.expectOne('/api/pieces/3/sheets');
    expect(upload.request.method).toBe('POST');
    upload.flush([GUITAR]);
    await settle();

    expect(root().querySelector('.sheet__label')?.textContent?.trim()).toBe('Gitarre');
    expect(changed.at(-1)).toEqual([GUITAR]);
  });

  it('should emit the selected sheet for the viewer', async () => {
    const opened: { file: File; title: string }[] = [];
    fixture.componentInstance.openSheet.subscribe((sheet) => opened.push(sheet));
    await flushLoad([GUITAR]);

    button('Öffnen').click();
    const req = httpMock.expectOne('/api/piece-sheets/101');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
    await settle();

    expect(opened).toHaveLength(1);
    expect(opened[0].title).toBe('Hallo Welt – Gitarre');
    expect(opened[0].file.name).toBe('Gitarre.pdf');
  });

  it('should ignore Escape while a sheet viewer is open', async () => {
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    fixture.componentRef.setInput('suspendEscape', true);
    await flushLoad([GUITAR]);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).not.toHaveBeenCalled();

    fixture.componentRef.setInput('suspendEscape', false);
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toHaveBeenCalledOnce();
  });

  it('should not show management controls when management is disabled', async () => {
    fixture.componentRef.setInput('canManage', false);
    await flushLoad([GUITAR]);

    const labels = Array.from(root().querySelectorAll('.sheet__btn')).map((item) =>
      item.textContent?.trim(),
    );
    expect(labels).toEqual(['Öffnen', 'Download']);
    expect(root().querySelector('.sheet-upload')).toBeNull();
  });
});

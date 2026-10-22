import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetlistDownloadDialogComponent } from './setlist-download-dialog.component';
import type { SheetSelection } from './setlist-download';
import type { SetlistEntry } from './setlist.model';

const ENTRIES: SetlistEntry[] = [
  {
    id: 1,
    setlistId: 10,
    pieceId: 3,
    pieceTitle: 'Hallo Welt',
    position: 0,
    sheets: [
      { id: 101, pieceId: 3, label: 'Gitarre', originalName: 'Gitarre.pdf' },
      { id: 102, pieceId: 3, label: 'Bass', originalName: 'Bass.pdf' },
    ],
  },
  {
    id: 2,
    setlistId: 10,
    pieceId: 4,
    pieceTitle: 'Nachtfahrt',
    position: 1,
    sheets: [{ id: 201, pieceId: 4, label: 'Gesang', originalName: 'Gesang.pdf' }],
  },
  {
    id: 3,
    setlistId: 10,
    pieceId: 5,
    pieceTitle: 'Ohne Noten',
    position: 2,
    sheets: [],
  },
];

describe('SetlistDownloadDialogComponent', () => {
  let fixture: ComponentFixture<SetlistDownloadDialogComponent>;
  let selections: SheetSelection[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetlistDownloadDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SetlistDownloadDialogComponent);
    fixture.componentRef.setInput('entries', ENTRIES);
    selections = [];
    fixture.componentInstance.confirmed.subscribe((selection) => selections.push(selection));
    fixture.detectChanges();
  });

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function globalSelect(): HTMLSelectElement {
    return root().querySelector('#global-part') as HTMLSelectElement;
  }

  function rowSelect(index: number): HTMLSelectElement {
    return root().querySelectorAll('.download-select--row')[index] as HTMLSelectElement;
  }

  function primaryButton(): HTMLButtonElement {
    return root().querySelector('.download-btn--primary') as HTMLButtonElement;
  }

  it('should preselect every sheet and show one row per piece with notes', () => {
    expect(root().querySelectorAll('.download-row').length).toBe(2);
    expect(root().textContent).toContain('3 PDFs');

    primaryButton().click();

    expect(selections).toEqual([
      {
        pieces: [
          { pieceId: 3, sheetIds: [101, 102] },
          { pieceId: 4, sheetIds: [201] },
        ],
        includeInfo: false,
      },
    ]);
  });

  it('should filter by the global voice', () => {
    globalSelect().value = 'Gitarre';
    globalSelect().dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(root().textContent).toContain('1 PDFs');
    primaryButton().click();

    expect(selections[0]).toEqual({
      pieces: [{ pieceId: 3, sheetIds: [101] }],
      includeInfo: false,
    });
  });

  it('should allow a per-piece override', () => {
    globalSelect().value = 'Gitarre';
    globalSelect().dispatchEvent(new Event('change'));
    fixture.detectChanges();

    rowSelect(1).value = 'Gesang';
    rowSelect(1).dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(root().textContent).toContain('2 PDFs');
    primaryButton().click();

    expect(selections[0]).toEqual({
      pieces: [
        { pieceId: 3, sheetIds: [101] },
        { pieceId: 4, sheetIds: [201] },
      ],
      includeInfo: false,
    });
  });

  it('should add the info PDF when requested', () => {
    const checkbox = root().querySelector('.download-info input') as HTMLInputElement;
    checkbox.click();
    fixture.detectChanges();

    primaryButton().click();

    expect(selections[0].includeInfo).toBe(true);
  });

  it('should disable the download when no sheets are selected and no info is wanted', () => {
    globalSelect().value = '-';
    globalSelect().dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(root().textContent).toContain('0 PDFs');
    expect(primaryButton().disabled).toBe(true);
  });

  it('should show an empty state when the setlist has no notes', () => {
    fixture.componentRef.setInput('entries', [ENTRIES[2]]);
    fixture.detectChanges();

    expect(root().querySelector('.download-empty')).toBeTruthy();
    expect(primaryButton().disabled).toBe(true);
  });
});

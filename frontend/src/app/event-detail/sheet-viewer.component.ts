import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  afterNextRender,
  input,
  output,
  signal,
} from '@angular/core';
import { getDocument, type PDFDocumentProxy, type PDFPageProxy, type RenderTask } from 'pdfjs-dist';
import * as pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs';

(globalThis as { pdfjsWorker?: typeof pdfjsWorker }).pdfjsWorker = pdfjsWorker;

interface PdfPage {
  index: number;
  width: number;
  height: number;
}

const ZOOM_FIT = 'fit';
const RENDER_SCALE = 2;
const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 5;
const DEFAULT_ZOOM = 1.5;
const SCROLL_STEP = 60;
const CANVAS_ATTEMPTS = 30;

@Component({
  selector: 'app-sheet-viewer',
  imports: [],
  templateUrl: './sheet-viewer.component.html',
  styleUrl: './sheet-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown.arrowleft)': 'onArrowLeft($event)',
    '(window:keydown.arrowright)': 'onArrowRight($event)',
    '(window:keydown.arrowup)': 'onArrowUp($event)',
    '(window:keydown.arrowdown)': 'onArrowDown($event)',
    '(window:keydown.escape)': 'onEscape($event)',
    '(window:resize)': 'onViewportResize()',
    '(wheel)': 'onWheel($event)',
    '(touchstart)': 'onTouchStart($event)',
    '(touchend)': 'onTouchEnd($event)',
    '(touchcancel)': 'onTouchCancel()',
  },
})
export class SheetViewerComponent {
  readonly file = input.required<File>();
  readonly title = input('');
  readonly closeRequested = output();

  private readonly pdfDoc = signal<PDFDocumentProxy | null>(null);
  protected readonly pages = signal<PdfPage[]>([]);
  protected readonly pageIndex = signal(0);
  protected readonly zoom = signal<number | typeof ZOOM_FIT>(
    typeof window !== 'undefined' && window.innerWidth < 640 ? ZOOM_FIT : DEFAULT_ZOOM,
  );
  protected readonly ready = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly stageFits = signal(true);

  private renderVersion = 0;
  private renderTask: RenderTask | null = null;
  private touchGesture: { x: number; y: number; startedAt: number } | null = null;
  private touchGestureInvalid = false;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;

  @ViewChild('canvas') private readonly canvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasContainer') private readonly canvasContainerRef?: ElementRef<HTMLElement>;

  constructor() {
    afterNextRender(() => void this.open());
  }

  ngOnDestroy(): void {
    if (this.resizeTimer !== null) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
  }

  protected onArrowLeft(event: Event): void {
    event.preventDefault();
    this.previousPage();
  }

  protected onArrowRight(event: Event): void {
    event.preventDefault();
    this.nextPage();
  }

  protected onArrowUp(event: Event): void {
    event.preventDefault();
    this.scrollStage(0, -SCROLL_STEP);
  }

  protected onArrowDown(event: Event): void {
    event.preventDefault();
    this.scrollStage(0, SCROLL_STEP);
  }

  protected onEscape(event: Event): void {
    event.preventDefault();
    this.closeRequested.emit();
  }

  protected onViewportResize(): void {
    if (!this.ready()) {
      return;
    }
    if (this.resizeTimer !== null) {
      clearTimeout(this.resizeTimer);
    }
    this.resizeTimer = setTimeout(() => {
      this.resizeTimer = null;
      if (!this.ready()) {
        return;
      }
      this.measureStage();
      if (this.zoom() === ZOOM_FIT) {
        void this.renderPage();
      }
    }, 150);
  }

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.ctrlKey) {
      this.zoomBy(event.deltaY);
    } else {
      this.scrollStage(event.deltaX, event.deltaY);
    }
  }

  protected onTouchStart(event: TouchEvent): void {
    if (this.touchGestureInvalid || event.touches.length !== 1) {
      this.touchGesture = null;
      this.touchGestureInvalid = true;
      return;
    }
    const touch = event.touches[0];
    this.touchGesture = { x: touch.clientX, y: touch.clientY, startedAt: Date.now() };
  }

  protected onTouchEnd(event: TouchEvent): void {
    const gesture = this.touchGesture;
    const invalid = this.touchGestureInvalid;
    this.touchGesture = null;
    this.touchGestureInvalid = false;
    if (invalid || !gesture || event.touches.length > 0 || !this.ready()) {
      return;
    }
    const touch = event.changedTouches[0];
    const stage = this.canvasContainerRef?.nativeElement;
    if (!touch || !stage) {
      return;
    }
    const elapsed = Date.now() - gesture.startedAt;
    if (elapsed > 700) {
      return;
    }
    const dx = touch.clientX - gesture.x;
    const dy = touch.clientY - gesture.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const overflowX = stage.scrollWidth > stage.clientWidth + 2;
    const overflowY = stage.scrollHeight > stage.clientHeight + 2;

    if (Math.max(absX, absY) < 12 && elapsed <= 350 && !overflowX && !overflowY) {
      this.turnPageFromTap(touch.clientX);
      return;
    }
    if (absX >= 48 && absX > absY && !overflowX) {
      if (dx < 0) {
        this.nextPage();
      } else {
        this.previousPage();
      }
      return;
    }
    if (absY >= 72 && absY > absX && !overflowX && !overflowY) {
      if (dy < 0) {
        this.nextPage();
      } else {
        this.previousPage();
      }
    }
  }

  protected onTouchCancel(): void {
    this.touchGesture = null;
    this.touchGestureInvalid = false;
  }

  protected get pageCount(): number {
    return this.pages().length;
  }

  protected get currentPage(): number {
    return this.pageIndex() + 1;
  }

  protected zoomLabel(): string {
    if (this.zoom() === ZOOM_FIT) {
      return 'Anpassen';
    }
    return `${Math.round(this.numericalZoom() * 100)}%`;
  }

  protected canZoomOut(): boolean {
    return this.zoom() === ZOOM_FIT || this.numericalZoom() > ZOOM_MIN;
  }

  protected canZoomIn(): boolean {
    return this.zoom() === ZOOM_FIT || this.numericalZoom() < ZOOM_MAX;
  }

  protected zoomOut(): void {
    this.zoom.set(Math.max(ZOOM_MIN, Math.round((this.numericalZoom() - ZOOM_STEP) * 100) / 100));
    void this.renderPage();
  }

  protected zoomIn(): void {
    this.zoom.set(Math.min(ZOOM_MAX, Math.round((this.numericalZoom() + ZOOM_STEP) * 100) / 100));
    void this.renderPage();
  }

  protected resetZoom(): void {
    this.zoom.set(1);
    void this.renderPage();
  }

  protected fitToViewport(): void {
    this.zoom.set(ZOOM_FIT);
    void this.renderPage();
  }

  protected previousPage(): void {
    if (this.pageCount === 0) {
      return;
    }
    if (this.pageIndex() > 0) {
      this.pageIndex.update((i) => i - 1);
      void this.renderPage();
    }
  }

  protected nextPage(): void {
    if (this.pageCount === 0) {
      return;
    }
    if (this.pageIndex() < this.pageCount - 1) {
      this.pageIndex.update((i) => i + 1);
      void this.renderPage();
    }
  }

  private scrollStage(deltaX: number, deltaY: number): void {
    const container = this.canvasContainerRef?.nativeElement;
    if (!container) {
      return;
    }
    container.scrollBy({ left: deltaX, top: deltaY });
  }

  private turnPageFromTap(clientX: number): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    if (x < 0 || x > rect.width) {
      return;
    }
    if (x <= rect.width * 0.25) {
      this.previousPage();
    } else if (x >= rect.width * 0.75) {
      this.nextPage();
    }
  }

  private zoomBy(deltaY: number): void {
    const current = this.numericalZoom();
    const factor = Math.exp(-deltaY * 0.0015);
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, current * factor));
    if (Math.abs(next - current) < 0.01) {
      return;
    }
    this.zoom.set(Math.round(next * 100) / 100);
    void this.renderPage();
  }

  private numericalZoom(): number {
    return this.zoom() === ZOOM_FIT ? 1 : (this.zoom() as number);
  }

  private async open(): Promise<void> {
    try {
      const data = await this.file().arrayBuffer();
      const doc = await getDocument({ data }).promise;
      const loadedPages: PdfPage[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 1 });
        loadedPages.push({ index: i, width: viewport.width, height: viewport.height });
      }
      this.pdfDoc.set(doc);
      this.pages.set(loadedPages);
      this.pageIndex.set(0);
      this.ready.set(true);
      await this.renderPage();
    } catch {
      this.error.set('PDF konnte nicht angezeigt werden.');
    }
  }

  private async renderPage(): Promise<void> {
    const doc = this.pdfDoc();
    if (!doc || this.pages().length === 0) {
      return;
    }
    const canvas = await this.resolveCanvas();
    if (!canvas) {
      return;
    }
    const version = ++this.renderVersion;
    const pageInfo = this.pages()[this.pageIndex()];
    try {
      const page = await doc.getPage(pageInfo.index);
      if (version !== this.renderVersion) {
        return;
      }
      if (this.zoom() === ZOOM_FIT) {
        const fitScale = this.fittedScale(pageInfo);
        await this.renderToCanvas(canvas, page, fitScale * RENDER_SCALE, fitScale, version);
      } else {
        const zoom = this.zoom() as number;
        await this.renderToCanvas(canvas, page, zoom * RENDER_SCALE, zoom, version);
      }
      if (version === this.renderVersion) {
        this.measureStage();
      }
    } catch (error) {
      if (version === this.renderVersion && !this.isCancel(error)) {
        this.error.set('Seite konnte nicht dargestellt werden.');
      }
    }
  }

  private async renderToCanvas(
    canvas: HTMLCanvasElement,
    page: PDFPageProxy,
    bufferScale: number,
    cssScale: number,
    version: number,
  ): Promise<void> {
    this.renderTask?.cancel();
    const buffer = page.getViewport({ scale: bufferScale });
    const display = page.getViewport({ scale: cssScale });
    canvas.width = Math.floor(buffer.width);
    canvas.height = Math.floor(buffer.height);
    canvas.style.width = `${Math.floor(display.width)}px`;
    canvas.style.height = `${Math.floor(display.height)}px`;
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    const task = page.render({ canvasContext: context, viewport: buffer });
    this.renderTask = task;
    try {
      await task.promise;
      if (version === this.renderVersion) {
        this.renderTask = null;
      }
    } catch (error) {
      if (version === this.renderVersion && !this.isCancel(error)) {
        throw error;
      }
    }
  }

  private async resolveCanvas(): Promise<HTMLCanvasElement | undefined> {
    for (let i = 0; i < CANVAS_ATTEMPTS && !this.canvasRef?.nativeElement; i++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    return this.canvasRef?.nativeElement;
  }

  private fittedScale(pageInfo: PdfPage): number {
    const container = this.canvasContainerRef?.nativeElement;
    const boxWidth = container ? container.clientWidth - 32 : 800;
    const boxHeight = container ? container.clientHeight - 32 : 600;
    return Math.min(boxWidth / pageInfo.width, boxHeight / pageInfo.height);
  }

  private measureStage(): void {
    const stage = this.canvasContainerRef?.nativeElement;
    if (!stage) {
      return;
    }
    const fits =
      stage.scrollWidth <= stage.clientWidth + 2 && stage.scrollHeight <= stage.clientHeight + 2;
    this.stageFits.set(fits);
  }

  private isCancel(error: unknown): boolean {
    return error instanceof Error && /cancel/i.test(error.message);
  }
}

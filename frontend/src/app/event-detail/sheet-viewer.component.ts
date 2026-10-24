import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { getDocument, type PDFDocumentProxy, type PDFPageProxy, type RenderTask } from 'pdfjs-dist';
import * as pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs';
import { TranslatePipe } from '../language/translate.pipe';

(globalThis as { pdfjsWorker?: typeof pdfjsWorker }).pdfjsWorker = pdfjsWorker;

interface PdfPage {
  index: number;
  width: number;
  height: number;
}

interface SheetViewerState {
  page: number;
  zoom: number | typeof ZOOM_FIT;
}

interface ScrollLockState {
  scrollY: number;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyWidth: string;
  bodyOverflow: string;
  rootOverflow: string;
}

const ZOOM_FIT = 'fit';
const RENDER_SCALE = 2;
const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 5;
const DEFAULT_ZOOM = 1.5;
const SCROLL_STEP = 60;
const CANVAS_ATTEMPTS = 30;
const THUMBNAIL_WIDTH = 140;
const SWIPE_FEEDBACK_MS = 400;

@Component({
  selector: 'app-sheet-viewer',
  imports: [TranslatePipe],
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
export class SheetViewerComponent implements OnDestroy {
  readonly file = input.required<File>();
  readonly title = input('');
  readonly pieceId = input<number | null>(null);
  readonly closeRequested = output();

  private readonly document = inject(DOCUMENT);

  private readonly pdfDoc = signal<PDFDocumentProxy | null>(null);
  protected readonly pages = signal<PdfPage[]>([]);
  protected readonly pageIndex = signal(0);
  protected readonly zoom = signal<number | typeof ZOOM_FIT>(
    typeof window !== 'undefined' && window.innerWidth < 640 ? ZOOM_FIT : DEFAULT_ZOOM,
  );
  protected readonly ready = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly stageFits = signal(true);
  protected readonly thumbnailsOpen = signal(false);
  protected readonly thumbnails = signal<string[]>([]);
  protected readonly thumbnailsLoading = signal(false);
  protected readonly swipeFeedback = signal<'next' | 'prev' | null>(null);

  private readonly storageKey = computed(() => {
    const id = this.pieceId();
    return id === null ? null : `gigflow-sheet-${id}`;
  });

  private renderVersion = 0;
  private renderTask: RenderTask | null = null;
  private touchGesture: { x: number; y: number; startedAt: number } | null = null;
  private touchGestureInvalid = false;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private swipeTimer: ReturnType<typeof setTimeout> | null = null;
  private scrollLockState: ScrollLockState | null = null;

  @ViewChild('canvas') private readonly canvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasContainer') private readonly canvasContainerRef?: ElementRef<HTMLElement>;

  constructor() {
    this.lockBackgroundScroll();
    afterNextRender(() => void this.open());
    effect(() => {
      const key = this.storageKey();
      if (key === null || !this.ready()) {
        return;
      }
      const state: SheetViewerState = { page: this.pageIndex(), zoom: this.zoom() };
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        // Storage may be unavailable (private mode); remembering the position is optional.
      }
    });
  }

  ngOnDestroy(): void {
    this.unlockBackgroundScroll();
    if (this.resizeTimer !== null) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
    if (this.swipeTimer !== null) {
      clearTimeout(this.swipeTimer);
      this.swipeTimer = null;
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
    if (this.thumbnailsOpen()) {
      this.thumbnailsOpen.set(false);
      return;
    }
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
    if (this.thumbnailsOpen()) {
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
      const direction = this.turnPageFromTap(touch.clientX);
      if (direction) {
        this.flashSwipe(direction);
      }
      return;
    }
    if (absX >= 48 && absX > absY && !overflowX) {
      if (dx < 0) {
        this.nextPage();
        this.flashSwipe('next');
      } else {
        this.previousPage();
        this.flashSwipe('prev');
      }
      return;
    }
    if (absY >= 72 && absY > absX && !overflowX && !overflowY) {
      if (dy < 0) {
        this.nextPage();
        this.flashSwipe('next');
      } else {
        this.previousPage();
        this.flashSwipe('prev');
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

  protected fitToViewport(): void {
    this.zoom.set(ZOOM_FIT);
    void this.renderPage();
  }

  protected toggleThumbnails(): void {
    const open = !this.thumbnailsOpen();
    this.thumbnailsOpen.set(open);
    if (open && this.thumbnails().length === 0) {
      void this.buildThumbnails();
    }
  }

  protected goToPage(index: number): void {
    if (index < 0 || index >= this.pageCount) {
      return;
    }
    this.pageIndex.set(index);
    this.thumbnailsOpen.set(false);
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

  private lockBackgroundScroll(): void {
    const body = this.document.body;
    const root = this.document.documentElement;
    const view = this.document.defaultView;
    const scrollY = view?.scrollY ?? root.scrollTop;
    this.scrollLockState = {
      scrollY,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      rootOverflow: root.style.overflow,
    };

    root.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
  }

  private unlockBackgroundScroll(): void {
    const state = this.scrollLockState;
    if (!state) {
      return;
    }
    this.scrollLockState = null;

    const body = this.document.body;
    this.document.documentElement.style.overflow = state.rootOverflow;
    body.style.position = state.bodyPosition;
    body.style.top = state.bodyTop;
    body.style.left = state.bodyLeft;
    body.style.right = state.bodyRight;
    body.style.width = state.bodyWidth;
    body.style.overflow = state.bodyOverflow;
    if (state.scrollY > 0) {
      this.document.defaultView?.scrollTo(0, state.scrollY);
    }
  }

  private turnPageFromTap(clientX: number): 'next' | 'prev' | null {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return null;
    }
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    if (x < 0 || x > rect.width) {
      return null;
    }
    if (x <= rect.width * 0.25) {
      this.previousPage();
      return 'prev';
    }
    if (x >= rect.width * 0.75) {
      this.nextPage();
      return 'next';
    }
    return null;
  }

  private flashSwipe(direction: 'next' | 'prev'): void {
    if (this.swipeTimer !== null) {
      clearTimeout(this.swipeTimer);
    }
    this.swipeFeedback.set(direction);
    this.swipeTimer = setTimeout(() => {
      this.swipeTimer = null;
      this.swipeFeedback.set(null);
    }, SWIPE_FEEDBACK_MS);
  }

  private async buildThumbnails(): Promise<void> {
    const doc = this.pdfDoc();
    if (!doc || this.thumbnailsLoading()) {
      return;
    }
    this.thumbnailsLoading.set(true);
    const previews: string[] = [];
    try {
      for (const info of this.pages()) {
        const page = await doc.getPage(info.index);
        const scale = THUMBNAIL_WIDTH / info.width;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        const context = canvas.getContext('2d');
        if (!context) {
          break;
        }
        await page.render({ canvasContext: context, viewport }).promise;
        previews.push(canvas.toDataURL('image/png'));
      }
    } catch {
      // Keep the previews that were rendered before the failure.
    }
    this.thumbnails.set(previews);
    this.thumbnailsLoading.set(false);
  }

  private readPersistedState(): SheetViewerState | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const key = this.storageKey();
    if (key === null) {
      return null;
    }
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as Partial<SheetViewerState>;
      const zoom = parsed.zoom;
      const validZoom =
        zoom === ZOOM_FIT || (typeof zoom === 'number' && zoom >= ZOOM_MIN && zoom <= ZOOM_MAX);
      return {
        page: typeof parsed.page === 'number' ? Math.floor(parsed.page) : 0,
        zoom: validZoom ? (zoom as number | typeof ZOOM_FIT) : this.zoom(),
      };
    } catch {
      return null;
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
      const persisted = this.readPersistedState();
      if (persisted) {
        this.pageIndex.set(Math.min(Math.max(0, persisted.page), loadedPages.length - 1));
        this.zoom.set(persisted.zoom);
      }
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

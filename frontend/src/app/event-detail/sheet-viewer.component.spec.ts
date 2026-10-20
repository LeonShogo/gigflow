import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SheetViewerComponent } from './sheet-viewer.component';

vi.mock('pdfjs-dist', () => {
  const page = {
    getViewport: ({ scale }: { scale: number }) => ({ width: 612 * scale, height: 792 * scale }),
    render: () => ({ promise: Promise.resolve(), cancel: () => undefined }),
  };
  return {
    getDocument: () => ({
      promise: Promise.resolve({
        numPages: 3,
        getPage: async () => page,
      }),
    }),
  };
});

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs', () => ({ default: {} }));

interface TouchPoint {
  clientX: number;
  clientY: number;
}

function touchEvent(
  type: 'touchstart' | 'touchend',
  active: TouchPoint[],
  changed: TouchPoint[],
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', { value: active });
  Object.defineProperty(event, 'changedTouches', { value: changed });
  return event;
}

describe('SheetViewerComponent', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function load(): Promise<ComponentFixture<SheetViewerComponent>> {
    await TestBed.configureTestingModule({ imports: [SheetViewerComponent] }).compileComponents();
    const fixture = TestBed.createComponent(SheetViewerComponent);
    fixture.componentRef.setInput(
      'file',
      new File(['%PDF-1.4'], 'noten.pdf', { type: 'application/pdf' }),
    );
    for (let i = 0; i < 5; i++) {
      fixture.detectChanges();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    fixture.detectChanges();
    return fixture;
  }

  function pageLabel(fixture: ComponentFixture<SheetViewerComponent>): string {
    const label = (fixture.nativeElement as HTMLElement).querySelector('.viewer-overlay__page');
    return (label?.textContent ?? '').replace(/\s/g, '');
  }

  function touch(
    host: HTMLElement,
    type: 'touchstart' | 'touchend',
    active: TouchPoint[],
    changed: TouchPoint[],
  ): void {
    host.dispatchEvent(touchEvent(type, active, changed));
  }

  it('should load the PDF and show the page position with navigation buttons', async () => {
    const fixture = await load();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('.viewer-overlay__error')).toBeNull();
    expect(pageLabel(fixture)).toBe('1/3');

    const pageButtons = el.querySelectorAll<HTMLButtonElement>('.viewer-overlay__btn--page');
    expect(pageButtons).toHaveLength(2);
    expect(pageButtons[0].disabled).toBe(true);
    expect(pageButtons[1].disabled).toBe(false);
  });

  it('should turn pages with the navigation buttons and disable them at the ends', async () => {
    const fixture = await load();
    const el: HTMLElement = fixture.nativeElement;
    const [prev, next] = Array.from(
      el.querySelectorAll<HTMLButtonElement>('.viewer-overlay__btn--page'),
    );

    next.click();
    fixture.detectChanges();
    expect(pageLabel(fixture)).toBe('2/3');
    expect(prev.disabled).toBe(false);

    next.click();
    fixture.detectChanges();
    expect(pageLabel(fixture)).toBe('3/3');
    expect(next.disabled).toBe(true);

    prev.click();
    fixture.detectChanges();
    expect(pageLabel(fixture)).toBe('2/3');
  });

  it('should advance a page on swipe left and go back on swipe right', async () => {
    const fixture = await load();
    const host: HTMLElement = fixture.nativeElement;

    touch(host, 'touchstart', [{ clientX: 280, clientY: 300 }], [{ clientX: 280, clientY: 300 }]);
    touch(host, 'touchend', [], [{ clientX: 120, clientY: 300 }]);
    fixture.detectChanges();
    expect(pageLabel(fixture)).toBe('2/3');

    touch(host, 'touchstart', [{ clientX: 120, clientY: 300 }], [{ clientX: 120, clientY: 300 }]);
    touch(host, 'touchend', [], [{ clientX: 280, clientY: 300 }]);
    fixture.detectChanges();
    expect(pageLabel(fixture)).toBe('1/3');
  });

  it('should turn to the outer page sections on tap', async () => {
    const fixture = await load();
    const host: HTMLElement = fixture.nativeElement;
    const canvas = host.querySelector('canvas');
    expect(canvas).not.toBeNull();
    vi.spyOn(canvas as HTMLCanvasElement, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 300,
      bottom: 400,
      width: 300,
      height: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    const tap = (clientX: number): void => {
      touch(host, 'touchstart', [{ clientX, clientY: 200 }], [{ clientX, clientY: 200 }]);
      touch(host, 'touchend', [], [{ clientX, clientY: 200 }]);
      fixture.detectChanges();
    };

    tap(280);
    expect(pageLabel(fixture)).toBe('2/3');

    tap(20);
    expect(pageLabel(fixture)).toBe('1/3');

    tap(150);
    expect(pageLabel(fixture)).toBe('1/3');
  });

  it('should ignore gestures that involve more than one finger', async () => {
    const fixture = await load();
    const host: HTMLElement = fixture.nativeElement;

    touch(host, 'touchstart', [{ clientX: 280, clientY: 300 }], [{ clientX: 280, clientY: 300 }]);
    touch(
      host,
      'touchstart',
      [
        { clientX: 280, clientY: 300 },
        { clientX: 260, clientY: 320 },
      ],
      [{ clientX: 260, clientY: 320 }],
    );
    touch(host, 'touchend', [{ clientX: 260, clientY: 320 }], [{ clientX: 280, clientY: 300 }]);
    fixture.detectChanges();

    expect(pageLabel(fixture)).toBe('1/3');
  });
});

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Shared modal shell: backdrop, titled panel, Escape/backdrop close.
 * Content is projected into the scrollable body.
 */
@Component({
  selector: 'app-modal-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dialog" tabindex="-1" (document:keydown.escape)="onEscape()">
      <button
        type="button"
        class="dialog__backdrop"
        tabindex="-1"
        aria-label="Dialog schließen"
        (click)="closed.emit()"
      ></button>
      <div
        class="dialog__panel"
        [class.dialog__panel--wide]="wide()"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
      >
        <header class="dialog__head">
          <h2 class="dialog__title">{{ title() }}</h2>
          <button type="button" class="dialog__close" aria-label="Dialog schließen" (click)="closed.emit()">
            &times;
          </button>
        </header>
        <div class="dialog__body">
          <ng-content />
        </div>
      </div>
    </div>
  `,
  styles: `
    .dialog {
      position: fixed;
      inset: 0;
      z-index: 200;
      display: grid;
      place-items: center;
      padding: var(--space-2);
      background: rgb(8 12 18 / 0.6);
    }

    .dialog__backdrop {
      position: absolute;
      inset: 0;
      padding: 0;
      background: none;
      border: none;
    }

    .dialog__panel {
      position: relative;
      display: flex;
      flex-direction: column;
      width: min(32rem, 100%);
      max-height: min(85vh, 46rem);
      overflow: hidden;
      background: var(--paper-raised);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-drag);
    }

    .dialog__panel--wide {
      width: min(40rem, 100%);
    }

    .dialog__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-3) var(--space-2);
      border-bottom: 1px solid var(--line);
    }

    .dialog__title {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: 0.01em;
      text-transform: uppercase;
      overflow-wrap: anywhere;
    }

    .dialog__close {
      display: grid;
      place-items: center;
      flex: none;
      width: 2rem;
      height: 2rem;
      font-size: 1.2rem;
      color: var(--ink-soft);
      background: none;
      border: none;
      border-radius: var(--ctl-radius);
      cursor: pointer;
    }

    .dialog__close:hover {
      color: var(--ink);
      background: var(--paper-inset);
    }

    .dialog__body {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      padding: var(--space-3);
      overflow: auto;
    }
  `,
})
export class ModalDialogComponent {
  readonly title = input.required<string>();
  readonly wide = input(false);
  readonly closeOnEscape = input(true);
  readonly closed = output<void>();

  protected onEscape(): void {
    if (this.closeOnEscape()) {
      this.closed.emit();
    }
  }
}

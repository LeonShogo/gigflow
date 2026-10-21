import { Injectable, signal } from '@angular/core';

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface Toast {
  message: string;
  action?: ToastAction;
}

const DEFAULT_TIMEOUT = 6000;

/** App-wide, single-slot toast used for "Rückgängig" after destructive actions. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toast = signal<Toast | null>(null);
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** Shows a toast; the optional action turns it into an "undo" affordance. */
  show(message: string, action?: ToastAction): void {
    this.clearTimer();
    this.toast.set({ message, action });
    this.timer = setTimeout(() => this.dismiss(), DEFAULT_TIMEOUT);
  }

  /** Runs the pending undo action (if any) and closes the toast. */
  runAction(): void {
    const action = this.toast()?.action;
    this.dismiss();
    action?.run();
  }

  dismiss(): void {
    this.clearTimer();
    this.toast.set(null);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  private readonly toasts = inject(ToastService);

  protected readonly toast = this.toasts.toast;

  protected runAction(): void {
    this.toasts.runAction();
  }

  protected dismiss(): void {
    this.toasts.dismiss();
  }
}

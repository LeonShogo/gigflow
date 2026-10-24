import { Pipe, PipeTransform, inject } from '@angular/core';

import { LanguageService } from './language.service';

@Pipe({ name: 't', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(value: string | null | undefined, params: Record<string, string | number> = {}): string {
    return value ? this.language.translate(value, params) : '';
  }
}

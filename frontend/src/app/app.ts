import { DOCUMENT, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './auth/auth.service';
import { ToastComponent } from './notifications/toast.component';
import { LanguageService, type AppLanguage } from './language/language.service';
import { TranslatePipe } from './language/translate.pipe';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgOptimizedImage, ToastComponent, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private static readonly themeStorageKey = 'gigflow-theme';

  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly languageService = inject(LanguageService);

  protected readonly currentUser = this.auth.currentUser;
  protected readonly isAuthenticated = this.auth.isAuthenticated;
  protected readonly isOrganizer = this.auth.isOrganizer;
  protected readonly isDarkMode = signal(this.readInitialTheme());
  protected readonly language = this.languageService.language;
  protected readonly languages = this.languageService.options;

  constructor() {
    this.applyTheme(this.isDarkMode());

    if (this.auth.isAuthenticated()) {
      this.auth.loadCurrentUser().subscribe();
    }
  }

  protected toggleTheme(): void {
    this.isDarkMode.update((isDark) => !isDark);
    this.applyTheme(this.isDarkMode());

    try {
      this.document.defaultView?.localStorage.setItem(
        App.themeStorageKey,
        this.isDarkMode() ? 'dark' : 'light',
      );
    } catch {
      // The selected theme still applies if browser storage is unavailable.
    }
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }

  protected changeLanguage(event: Event): void {
    this.languageService.setLanguage((event.target as HTMLSelectElement).value as AppLanguage);
  }

  private readInitialTheme(): boolean {
    const theme = this.document.documentElement.dataset['theme'];
    if (theme === 'dark' || theme === 'light') {
      return theme === 'dark';
    }

    try {
      const storedTheme = this.document.defaultView?.localStorage.getItem(App.themeStorageKey);
      if (storedTheme === 'dark' || storedTheme === 'light') {
        return storedTheme === 'dark';
      }
    } catch {
      // Fall back to the operating system preference below.
    }

    return this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }

  private applyTheme(isDark: boolean): void {
    this.document.documentElement.dataset['theme'] = isDark ? 'dark' : 'light';
    this.document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', isDark ? '#0d1117' : '#2f7fe0');
  }
}

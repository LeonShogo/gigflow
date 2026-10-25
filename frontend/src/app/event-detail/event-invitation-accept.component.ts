import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { EventService } from '../dashboard/event.service';
import { TranslatePipe } from '../language/translate.pipe';

@Component({
  selector: 'app-event-invitation-accept',
  imports: [RouterLink, TranslatePipe],
  template: `
    <main class="invitation-page">
      <p class="eyebrow">{{ 'GigFlow' | t }}</p>
      <h1>{{ 'Event-Einladung' | t }}</h1>
      @if (loading()) {
        <p>{{ 'Einladung wird geprüft …' | t }}</p>
      } @else if (error(); as message) {
          <p class="invitation-page__error" role="alert">{{ message | t }}</p>
        @if (!isAuthenticated()) {
          <a class="invitation-page__link" [routerLink]="['/login']" [queryParams]="{ returnUrl: returnUrl }">
            {{ 'Anmelden oder registrieren' | t }}
          </a>
        } @else {
          <button type="button" class="invitation-page__link" (click)="useDifferentAccount()">
            {{ 'Mit anderem Konto anmelden' | t }}
          </button>
        }
      } @else if (accepted()) {
        <p>{{ 'Du bist dem Event beigetreten. Es erscheint jetzt in deiner Eventübersicht.' | t }}</p>
      }
      <a class="invitation-page__link" routerLink="/">{{ 'Zur Eventübersicht' | t }}</a>
    </main>
  `,
  styles: `
    .invitation-page { width: min(38rem, 100% - 2rem); margin: 4rem auto; padding: 2rem; background: var(--paper-raised); border: 1px solid var(--line); border-radius: var(--radius-lg); }
    .eyebrow { color: var(--accent-ink); font: 600 0.75rem var(--font-mono); letter-spacing: 0.18em; text-transform: uppercase; }
    h1 { font: 700 clamp(1.8rem, 5vw, 2.5rem) var(--font-display); }
    .invitation-page__error { color: var(--danger-ink); }
    .invitation-page__link { display: inline-block; margin: 0.75rem 0.75rem 0 0; color: var(--accent-ink); font-weight: 600; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventInvitationAcceptComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly eventService = inject(EventService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly accepted = signal(false);
  protected readonly isAuthenticated = this.auth.isAuthenticated;
  protected readonly returnUrl: string;

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    this.returnUrl = this.router.url;
    if (!token) {
      this.loading.set(false);
      this.error.set('Einladungslink ist ungültig.');
      return;
    }
    if (!this.auth.isAuthenticated()) {
      this.loading.set(false);
      this.error.set('Bitte melde dich an oder registriere dich, um dem Event beizutreten.');
      return;
    }
    const user$ = this.auth.currentUser()
      ? of(this.auth.currentUser())
      : this.auth.loadCurrentUser();
    user$.pipe(switchMap((user) => user ? this.eventService.acceptInvitation(token) : of(null)))
      .subscribe({
        next: (event) => {
          this.loading.set(false);
          if (!event) {
            this.error.set('Anmeldung konnte nicht bestätigt werden.');
            return;
          }
          this.accepted.set(true);
          void this.router.navigate(['/events', event.id]);
        },
        error: (error) => {
          this.loading.set(false);
          this.error.set(error?.error?.message ?? 'Einladung konnte nicht angenommen werden.');
        },
      });
  }

  protected useDifferentAccount(): void {
    this.auth.logout();
    void this.router.navigate(['/login'], { queryParams: { returnUrl: this.returnUrl } });
  }
}

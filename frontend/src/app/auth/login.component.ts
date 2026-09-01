import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly mode = signal<'login' | 'register'>('login');

  protected readonly form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(8)]),
    firstName: new FormControl(''),
    lastName: new FormControl(''),
    instrument: new FormControl(''),
  });

  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected toggleMode(): void {
    this.mode.set(this.mode() === 'login' ? 'register' : 'login');
    this.error.set(null);
    if (this.mode() === 'login') {
      this.form.controls.firstName.clearValidators();
      this.form.controls.lastName.clearValidators();
    } else {
      this.form.controls.firstName.setValidators(Validators.required);
      this.form.controls.lastName.setValidators(Validators.required);
    }
    this.form.controls.firstName.updateValueAndValidity();
    this.form.controls.lastName.updateValueAndValidity();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.submitting.set(true);

    const { email, password, firstName, lastName, instrument } = this.form.value;

    if (this.mode() === 'login') {
      this.auth.login({ email: email ?? '', password: password ?? '' }).subscribe({
        next: () => this.onSuccess(),
        error: () => this.onError('Login fehlgeschlagen.'),
      });
    } else {
      this.auth
        .register({
          email: email ?? '',
          password: password ?? '',
          firstName: firstName ?? '',
          lastName: lastName ?? '',
          instrument: instrument || null,
        })
        .subscribe({
          next: () => this.onSuccess(),
          error: () => this.onError('Registrierung fehlgeschlagen.'),
        });
    }
  }

  private onSuccess(): void {
    this.submitting.set(false);
    void this.router.navigate(['/']);
  }

  private onError(message: string): void {
    this.submitting.set(false);
    this.error.set(message);
  }
}

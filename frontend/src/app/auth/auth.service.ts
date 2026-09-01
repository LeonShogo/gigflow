import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';

import type { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from './auth.model';

const TOKEN_KEY = 'gigflow_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly tokenSignal = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private readonly userSignal = signal<AuthUser | null>(null);

  readonly token = this.tokenSignal.asReadonly();
  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.tokenSignal() !== null);
  readonly isOrganizer = computed(() => this.userSignal()?.organizer === true);
  readonly musicianId = computed(() => this.userSignal()?.musicianId ?? null);

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/login', credentials)
      .pipe(tap((response) => this.applyAuth(response)));
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/register', request)
      .pipe(tap((response) => this.applyAuth(response)));
  }

  loadCurrentUser(): Observable<AuthUser | null> {
    if (!this.tokenSignal()) {
      return of(null);
    }
    return this.http.get<AuthUser>('/api/auth/me').pipe(
      tap((user) => this.userSignal.set(user)),
      catchError(() => {
        this.logout();
        return of(null);
      }),
    );
  }

  logout(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    localStorage.removeItem(TOKEN_KEY);
  }

  private applyAuth(response: AuthResponse): void {
    this.tokenSignal.set(response.token);
    this.userSignal.set(response.user);
    localStorage.setItem(TOKEN_KEY, response.token);
  }
}

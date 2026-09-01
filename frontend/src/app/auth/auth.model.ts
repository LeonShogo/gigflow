export interface AuthUser {
  id: number;
  email: string;
  organizer: boolean;
  musicianId?: number | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  instrument?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

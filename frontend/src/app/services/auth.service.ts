import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface LoginResponse {
  token: string;
  token_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8000/api/admin';

  // Session Token Signal
  private tokenSignal = signal<string | null>(localStorage.getItem('admin_token'));

  // Public status accessor
  readonly token = this.tokenSignal.asReadonly();
  readonly isLoggedIn = computed(() => !!this.tokenSignal());

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { username, password }).pipe(
      tap(res => {
        if (res.token) {
          localStorage.setItem('admin_token', res.token);
          this.tokenSignal.set(res.token);
        }
      })
    );
  }

  logout(): Observable<void> {
    // Call backend to invalidate token, then clean up locally
    return this.http.post<void>(`${this.apiUrl}/logout`, {}, {
      headers: { 'Authorization': `Bearer ${this.tokenSignal()}` }
    }).pipe(
      tap({
        finalize: () => {
          // Always clear token locally even if backend logout fails or returns error
          localStorage.removeItem('admin_token');
          this.tokenSignal.set(null);
        }
      })
    );
  }
}

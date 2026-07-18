import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
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
  private router = inject(Router);
  private apiUrl = 'http://localhost:8000/api/admin';

  // Session Token Signal initialized with check
  private tokenSignal = signal<string | null>(this.checkAndGetToken());

  // Public status accessor
  readonly token = this.tokenSignal.asReadonly();
  readonly isLoggedIn = computed(() => !!this.tokenSignal());

  constructor() {
    this.startExpirationCheck();
  }

  private startExpirationCheck() {
    // Periodic background check every 60 seconds
    setInterval(() => {
      if (this.tokenSignal()) {
        this.checkAndGetToken();
      }
    }, 60000);
  }

  private checkAndGetToken(): string | null {
    const token = localStorage.getItem('admin_token');
    const loginTimeStr = localStorage.getItem('admin_login_time');
    
    if (!token || !loginTimeStr) {
      this.clearTokenAndRedirect();
      return null;
    }
    
    const loginTime = parseInt(loginTimeStr, 10);
    const now = Date.now();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    
    if (now - loginTime > twentyFourHoursMs) {
      this.clearTokenAndRedirect();
      return null;
    }
    
    return token;
  }

  private clearTokenAndRedirect() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_login_time');
    
    if (this.tokenSignal && this.tokenSignal() !== null) {
      this.tokenSignal.set(null);
    }
    
    // Redirect to login if currently on an admin route
    const currentUrl = this.router.url;
    if (currentUrl.startsWith('/admin') && currentUrl !== '/admin/login') {
      this.router.navigate(['/admin/login']);
    }
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { username, password }).pipe(
      tap(res => {
        if (res.token) {
          localStorage.setItem('admin_token', res.token);
          localStorage.setItem('admin_login_time', Date.now().toString());
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
          this.clearTokenAndRedirect();
        }
      })
    );
  }
}

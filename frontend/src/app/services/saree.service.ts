import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface SareeImage {
  id: number;
  saree_id: number;
  image_url: string;
  is_primary: boolean;
}

export interface Saree {
  id: number;
  name: string;
  description: string;
  price: number;
  length: string;
  blouse: string;
  delivery_duration: string;
  highlights: string[];
  work: string;
  quality: string;
  created_at: string;
  images: SareeImage[];
}

@Injectable({
  providedIn: 'root'
})
export class SareeService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  
  // Python FastAPI Backend Endpoint URL
  private apiUrl = 'http://localhost:8000/api';

  getSarees(skip: number = 0, limit: number = 12, sortBy: string = 'newest'): Observable<Saree[]> {
    const params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString())
      .set('sort_by', sortBy);
      
    return this.http.get<Saree[]>(`${this.apiUrl}/sarees`, { params });
  }

  getSaree(id: number): Observable<Saree> {
    return this.http.get<Saree>(`${this.apiUrl}/sarees/${id}`);
  }

  createSaree(formData: FormData): Observable<Saree> {
    const headers = { 'Authorization': `Bearer ${this.authService.token()}` };
    return this.http.post<Saree>(`${this.apiUrl}/admin/sarees`, formData, { headers });
  }

  deleteSaree(id: number): Observable<void> {
    const headers = { 'Authorization': `Bearer ${this.authService.token()}` };
    return this.http.delete<void>(`${this.apiUrl}/admin/sarees/${id}`, { headers });
  }
}

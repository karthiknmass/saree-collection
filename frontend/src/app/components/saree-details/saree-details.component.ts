import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SareeService, Saree } from '../../services/saree.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-saree-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './saree-details.component.html',
  styleUrls: ['./saree-details.component.css']
})
export class SareeDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private sareeService = inject(SareeService);
  private cartService = inject(CartService);

  // States
  saree = signal<Saree | null>(null);
  loading = signal(true);
  activeImageIndex = signal(0);

  ngOnInit() {
    // Get ID from route params
    this.route.paramMap.subscribe(params => {
      const idStr = params.get('id');
      if (idStr) {
        const id = parseInt(idStr, 10);
        this.fetchSareeDetails(id);
      }
    });
  }

  fetchSareeDetails(id: number) {
    this.loading.set(true);
    this.sareeService.getSaree(id).subscribe({
      next: (data) => {
        this.saree.set(data);
        this.activeImageIndex.set(0);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching saree details:', err);
        this.loading.set(false);
      }
    });
  }

  setActiveImage(index: number) {
    this.activeImageIndex.set(index);
  }

  addToCart() {
    const currentSaree = this.saree();
    if (currentSaree) {
      this.cartService.addToCart(currentSaree);
    }
  }

  buyNow() {
    const currentSaree = this.saree();
    if (currentSaree) {
      this.cartService.addToCart(currentSaree);
      this.cartService.checkoutRequested.set(true);
    }
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/placeholder-saree.jpg';
  }
}

import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SareeService, Saree } from '../../services/saree.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './catalog.component.html',
  styleUrls: ['./catalog.component.css']
})
export class CatalogComponent implements OnInit {
  private sareeService = inject(SareeService);
  private cartService = inject(CartService);

  // States
  sareesList = signal<Saree[]>([]);
  loading = signal(true);
  sortBy = signal('newest');
  searchQuery = signal('');
  
  // Pagination
  skip = 0;
  readonly limit = 12;
  hasMore = signal(true);

  // Client-side search filtering (or we could fetch from server,
  // but client-side is faster for immediate feedback since we load sarees)
  filteredSarees = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const allSarees = this.sareesList();
    if (!query) return allSarees;
    return allSarees.filter(s => 
      s.name.toLowerCase().includes(query) || 
      (s.description && s.description.toLowerCase().includes(query)) ||
      (s.work && s.work.toLowerCase().includes(query)) ||
      (s.quality && s.quality.toLowerCase().includes(query))
    );
  });

  ngOnInit() {
    this.fetchSarees();
  }

  fetchSarees(append: boolean = false) {
    this.loading.set(true);
    this.sareeService.getSarees(this.skip, this.limit, this.sortBy()).subscribe({
      next: (data) => {
        if (append) {
          this.sareesList.update(current => [...current, ...data]);
        } else {
          this.sareesList.set(data);
        }
        
        // If we fetched fewer items than the limit, there are no more items left
        if (data.length < this.limit) {
          this.hasMore.set(false);
        } else {
          this.hasMore.set(true);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching sarees:', err);
        this.loading.set(false);
      }
    });
  }

  onSortChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.sortBy.set(selectElement.value);
    this.skip = 0;
    this.fetchSarees(false);
  }

  loadMore() {
    this.skip += this.limit;
    this.fetchSarees(true);
  }

  addToCart(saree: Saree, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.cartService.addToCart(saree);
  }

  buyNow(saree: Saree, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.cartService.addToCart(saree);
    this.cartService.checkoutRequested.set(true);
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/placeholder-saree.jpg'; // Fallback
  }

  getPrimaryImage(saree: Saree): string {
    const primary = saree.images.find(img => img.is_primary) || saree.images[0];
    return primary ? `http://localhost:8000${primary.image_url}` : 'assets/placeholder-saree.jpg';
  }
}

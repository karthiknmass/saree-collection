import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
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
export class CatalogComponent implements OnInit, OnDestroy {
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

  // Hero Banner Slider
  bannerSlides = [
    {
      image: '/banner1.png',
      title: 'The Linen Cotton Story',
      subtitle: 'Celebrate the timeless elegance of lightweight, breathable handwoven sarees.',
      cta: 'Explore Daily Wear'
    },
    {
      image: '/banner2.png',
      title: 'Pure Kanchipuram & Silk Heritage',
      subtitle: 'Indulge in the royal sheen of handwoven pure silk sarees made for grand celebrations.',
      cta: 'Explore Silk Collection'
    },
    {
      image: '/banner3.png',
      title: 'Boutique Handloom Grace',
      subtitle: 'Classy, premium designs directly from the weaver, perfect for your office and festive look.',
      cta: 'Explore Handlooms'
    }
  ];
  currentSlide = signal(0);
  autoPlayInterval: any;

  // Computed Category Lists for Landing Carousels
  newArrivals = computed(() => {
    return this.sareesList().slice(0, 10);
  });

  linenCottonSarees = computed(() => {
    return this.sareesList().filter(s => {
      const q = s.quality?.toLowerCase() || '';
      const n = s.name?.toLowerCase() || '';
      return q.includes('linen') || q.includes('cotton') || n.includes('linen') || n.includes('cotton');
    }).slice(0, 10);
  });

  silkSarees = computed(() => {
    return this.sareesList().filter(s => {
      const q = s.quality?.toLowerCase() || '';
      const n = s.name?.toLowerCase() || '';
      return q.includes('silk') || n.includes('silk');
    }).slice(0, 10);
  });

  // Client-side search filtering
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
    this.startAutoPlay();
  }

  ngOnDestroy() {
    this.stopAutoPlay();
  }

  // Auto-play methods
  startAutoPlay() {
    this.autoPlayInterval = setInterval(() => {
      this.nextSlide();
    }, 6000);
  }

  stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }
  }

  nextSlide() {
    this.currentSlide.update(curr => (curr + 1) % this.bannerSlides.length);
  }

  prevSlide() {
    this.currentSlide.update(curr => (curr - 1 + this.bannerSlides.length) % this.bannerSlides.length);
  }

  goToSlide(index: number) {
    this.currentSlide.set(index);
  }

  // Horizontal Scroll Methods
  scrollCarousel(elementId: string, direction: 'left' | 'right') {
    const container = document.getElementById(elementId);
    if (container) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  scrollToCollection() {
    const el = document.getElementById('collection-explore');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  filterByCategory(category: string) {
    this.searchQuery.set(category);
    this.scrollToCollection();
  }

  onSubscribeNewsletter() {
    alert('Thank you for subscribing! We will keep you updated with our weaver launches.');
  }

  fetchSarees(append: boolean = false) {
    this.loading.set(true);
    // Fetch larger initial count if empty search (e.g. 50 items) so we have enough items for all sliders!
    const fetchLimit = !append && !this.searchQuery() ? 50 : this.limit;
    
    this.sareeService.getSarees(this.skip, fetchLimit, this.sortBy()).subscribe({
      next: (data) => {
        if (append) {
          this.sareesList.update(current => [...current, ...data]);
        } else {
          this.sareesList.set(data);
        }
        
        if (data.length < fetchLimit) {
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
    img.src = 'assets/placeholder-saree.jpg';
  }

  getPrimaryImage(saree: Saree): string {
    const primary = saree.images.find(img => img.is_primary) || saree.images[0];
    return primary ? `http://localhost:8000${primary.image_url}` : 'assets/placeholder-saree.jpg';
  }
}

import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SareeService, Saree } from '../../services/saree.service';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';

@Component({
  selector: 'app-saree-details',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './saree-details.component.html',
  styleUrls: ['./saree-details.component.css']
})
export class SareeDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private sareeService = inject(SareeService);
  private cartService = inject(CartService);
  private wishlistService = inject(WishlistService);

  // States
  saree = signal<Saree | null>(null);
  loading = signal(true);
  activeImageIndex = signal(0);
  relatedSareesList = signal<Saree[]>([]);

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
        this.fetchRelatedSarees(data);
      },
      error: (err) => {
        console.error('Error fetching saree details:', err);
        this.loading.set(false);
      }
    });
  }

  fetchRelatedSarees(currentSaree: Saree) {
    this.sareeService.getSarees(0, 50).subscribe({
      next: (sarees) => {
        let filtered = sarees.filter(s => s.id !== currentSaree.id);
        
        const currentQuality = (currentSaree.quality || '').toLowerCase().trim();
        const currentNameWords = currentSaree.name.toLowerCase().split(' ').filter(w => w.length > 3);
        
        const scored = filtered.map(s => {
          let score = 0;
          const quality = (s.quality || '').toLowerCase().trim();
          const name = s.name.toLowerCase();
          
          if (currentQuality && quality.includes(currentQuality)) {
            score += 10;
          }
          
          for (const word of currentNameWords) {
            if (name.includes(word)) {
              score += 2;
            }
          }
          
          return { saree: s, score };
        });
        
        let matched = scored.filter(item => item.score > 0)
                            .sort((a, b) => b.score - a.score)
                            .map(item => item.saree);
                            
        if (matched.length === 0) {
          matched = filtered.slice(0, 4);
        } else {
          matched = matched.slice(0, 4);
        }
        
        this.relatedSareesList.set(matched);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching related sarees:', err);
        this.loading.set(false);
      }
    });
  }

  setActiveImage(index: number) {
    this.activeImageIndex.set(index);
  }

  getPrimaryImage(saree: Saree): string {
    const primary = saree.images.find(img => img.is_primary) || saree.images[0];
    return primary ? `http://localhost:8000${primary.image_url}` : 'assets/placeholder-saree.jpg';
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

  onMouseMove(event: MouseEvent) {
    const wrapper = event.currentTarget as HTMLElement;
    const rect = wrapper.getBoundingClientRect();
    
    // Calculate mouse position relative to wrapper element as a percentage
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    // Set custom CSS variables for smooth zoom panning
    wrapper.style.setProperty('--zoom-x', `${x}%`);
    wrapper.style.setProperty('--zoom-y', `${y}%`);
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/placeholder-saree.jpg';
  }

  // Wishlist Logic
  isWishlisted(): boolean {
    const s = this.saree();
    return s ? this.wishlistService.isWishlisted(s.id) : false;
  }

  toggleWishlist() {
    const s = this.saree();
    if (s) {
      if (this.isWishlisted()) {
        this.wishlistService.removeFromWishlist(s.id);
      } else {
        this.wishlistService.addToWishlist(s);
      }
    }
  }

  // Share Drawer Logic
  isShareOpen = signal(false);
  shareCopied = signal(false);

  toggleShareDrawer() {
    this.isShareOpen.update(v => !v);
  }

  closeShareDrawer() {
    this.isShareOpen.set(false);
  }

  getProductUrl(): string {
    return window.location.href;
  }

  copyShareUrl(inputElement: HTMLInputElement) {
    // 1. Focus the input
    inputElement.focus();
    
    // 2. Select text (with iOS Safari compatibility)
    const isIOS = navigator.userAgent.match(/ipad|ipod|iphone/i);
    if (isIOS) {
      const range = document.createRange();
      range.selectNodeContents(inputElement);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      inputElement.setSelectionRange(0, 999999);
    } else {
      inputElement.select();
    }
    
    // 3. Try execCommand
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (err) {
      console.error('execCommand copy failed:', err);
    }
    
    // 4. Try clipboard API as fallback or if execCommand failed
    if (success) {
      this.showCopyToast();
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(inputElement.value)
        .then(() => this.showCopyToast())
        .catch(() => this.manualCopyFallback(inputElement.value));
    } else {
      this.manualCopyFallback(inputElement.value);
    }
  }

  private showCopyToast() {
    this.shareCopied.set(true);
    setTimeout(() => this.shareCopied.set(false), 2000);
  }

  private manualCopyFallback(text: string) {
    window.prompt('Copy to clipboard: Ctrl+C, Enter', text);
    this.showCopyToast();
  }

  getShareWhatsAppUrl(): string {
    const s = this.saree();
    if (!s) return '';
    const text = `Check out this gorgeous saree at Shree Boutique: ${s.name} - ₹${s.price.toLocaleString('en-IN')}%0A%0ALink: ${encodeURIComponent(window.location.href)}`;
    return `https://wa.me/?text=${text}`;
  }

  getShareFacebookUrl(): string {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
  }

  getShareEmailUrl(): string {
    const s = this.saree();
    if (!s) return '';
    return `mailto:?subject=${encodeURIComponent('Check out this Saree at Shree Boutique')}&body=${encodeURIComponent('Check out this gorgeous saree: ' + s.name + '\nLink: ' + window.location.href)}`;
  }

  // Ratings & Reviews Logic
  reviewerName = '';
  reviewRating = 5;
  reviewComment = '';
  submittingReview = signal(false);

  averageRating = computed(() => {
    const s = this.saree();
    if (!s || !s.reviews || s.reviews.length === 0) return 0;
    const sum = s.reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / s.reviews.length) * 10) / 10;
  });

  submitReview() {
    const s = this.saree();
    if (!s) return;
    if (!this.reviewerName.trim() || !this.reviewComment.trim()) {
      alert('Please fill in your name and comment.');
      return;
    }

    this.submittingReview.set(true);
    const reviewData = {
      reviewer_name: this.reviewerName,
      rating: this.reviewRating,
      comment: this.reviewComment
    };

    this.sareeService.createReview(s.id, reviewData).subscribe({
      next: (newReview) => {
        const currentSaree = this.saree();
        if (currentSaree) {
          const updatedReviews = currentSaree.reviews ? [...currentSaree.reviews, newReview] : [newReview];
          this.saree.set({
            ...currentSaree,
            reviews: updatedReviews
          });
        }
        this.reviewerName = '';
        this.reviewRating = 5;
        this.reviewComment = '';
        this.submittingReview.set(false);
      },
      error: (err) => {
        console.error('Error submitting review:', err);
        alert('Could not submit review. Please try again.');
        this.submittingReview.set(false);
      }
    });
  }
}


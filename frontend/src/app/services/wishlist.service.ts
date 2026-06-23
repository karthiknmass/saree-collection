import { Injectable, signal, computed } from '@angular/core';

export interface WishlistItem {
  id: number;
  name: string;
  price: number;
  image_url: string;
  quality?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private itemsSignal = signal<WishlistItem[]>(this.loadWishlist());

  readonly items = this.itemsSignal.asReadonly();
  readonly count = computed(() => this.itemsSignal().length);

  private loadWishlist(): WishlistItem[] {
    const stored = localStorage.getItem('wishlist_items');
    return stored ? JSON.parse(stored) : [];
  }

  private saveWishlist(items: WishlistItem[]) {
    localStorage.setItem('wishlist_items', JSON.stringify(items));
    this.itemsSignal.set(items);
  }

  addToWishlist(saree: any) {
    const current = this.itemsSignal();
    if (current.some(item => item.id === saree.id)) return;

    // Resolve primary image url safely
    let primaryImg = '/placeholder-saree.jpg';
    if (saree.images && saree.images.length > 0) {
      // Saree response contains image array of objects
      primaryImg = saree.images.find((img: any) => img.is_primary)?.image_url || saree.images[0].image_url;
    } else if (saree.image_url) {
      primaryImg = saree.image_url;
    }

    const newItem: WishlistItem = {
      id: saree.id,
      name: saree.name,
      price: saree.price,
      image_url: primaryImg,
      quality: saree.quality
    };

    this.saveWishlist([...current, newItem]);
  }

  removeFromWishlist(id: number) {
    const current = this.itemsSignal();
    this.saveWishlist(current.filter(item => item.id !== id));
  }

  isWishlisted(id: number): boolean {
    return this.itemsSignal().some(item => item.id === id);
  }

  clearWishlist() {
    this.saveWishlist([]);
  }
}

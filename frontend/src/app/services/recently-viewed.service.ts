import { Injectable, signal } from '@angular/core';

export interface RecentlyViewedItem {
  id: number;
  name: string;
  price: number;
  image_url: string;
  quality?: string;
  work?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RecentlyViewedService {
  private itemsSignal = signal<RecentlyViewedItem[]>(this.loadItems());

  readonly items = this.itemsSignal.asReadonly();

  private loadItems(): RecentlyViewedItem[] {
    const stored = localStorage.getItem('recently_viewed_items');
    return stored ? JSON.parse(stored) : [];
  }

  private saveItems(items: RecentlyViewedItem[]) {
    localStorage.setItem('recently_viewed_items', JSON.stringify(items));
    this.itemsSignal.set(items);
  }

  addProduct(saree: any) {
    if (!saree || !saree.id) return;

    const current = this.itemsSignal();
    
    // Resolve primary image url safely
    let primaryImg = 'assets/placeholder-saree.jpg';
    if (saree.images && saree.images.length > 0) {
      const primary = saree.images.find((img: any) => img.is_primary) || saree.images[0];
      primaryImg = primary.image_url;
    } else if (saree.image_url) {
      primaryImg = saree.image_url;
    }

    const newItem: RecentlyViewedItem = {
      id: saree.id,
      name: saree.name,
      price: saree.price,
      image_url: primaryImg,
      quality: saree.quality,
      work: saree.work
    };

    // Filter out existing occurrence if it exists, then prepend new item (max 8 items)
    const filtered = current.filter(item => item.id !== saree.id);
    const updated = [newItem, ...filtered].slice(0, 8);

    this.saveItems(updated);
  }

  clearRecentlyViewed() {
    this.saveItems([]);
  }
}

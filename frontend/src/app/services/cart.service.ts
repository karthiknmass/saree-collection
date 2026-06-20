import { Injectable, signal, computed, effect } from '@angular/core';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  // Signal to trigger checkout overlay from other components
  readonly checkoutRequested = signal(false);

  // Signal to store cart items, initialized from localStorage if available
  private cartItemsSignal = signal<CartItem[]>(this.loadCartFromStorage());

  // Public readonly accessors
  readonly items = this.cartItemsSignal.asReadonly();

  // Computed signals
  readonly count = computed(() => 
    this.cartItemsSignal().reduce((acc, item) => acc + item.quantity, 0)
  );

  readonly total = computed(() => 
    this.cartItemsSignal().reduce((acc, item) => acc + (item.price * item.quantity), 0)
  );

  constructor() {
    // Save to localStorage whenever cartItemsSignal changes
    effect(() => {
      localStorage.setItem('saree_cart', JSON.stringify(this.cartItemsSignal()));
    });
  }

  private loadCartFromStorage(): CartItem[] {
    try {
      const stored = localStorage.getItem('saree_cart');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Error reading cart from localStorage:", e);
      return [];
    }
  }

  addToCart(saree: { id: number; name: string; price: number; images: { image_url: string; is_primary: boolean }[] }) {
    const primaryImg = saree.images.find(img => img.is_primary) || saree.images[0];
    const imageUrl = primaryImg ? primaryImg.image_url : '';

    this.cartItemsSignal.update(items => {
      const existing = items.find(item => item.id === saree.id);
      if (existing) {
        // If it's already in the cart, increase quantity
        return items.map(item => 
          item.id === saree.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        // Add new item
        return [...items, {
          id: saree.id,
          name: saree.name,
          price: saree.price,
          imageUrl: imageUrl,
          quantity: 1
        }];
      }
    });
  }

  removeFromCart(itemId: number) {
    this.cartItemsSignal.update(items => items.filter(item => item.id !== itemId));
  }

  updateQuantity(itemId: number, qty: number) {
    if (qty <= 0) {
      this.removeFromCart(itemId);
      return;
    }
    this.cartItemsSignal.update(items => 
      items.map(item => item.id === itemId ? { ...item, quantity: qty } : item)
    );
  }

  clearCart() {
    this.cartItemsSignal.set([]);
  }
}

import { Component, signal, inject, effect, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from './services/cart.service';
import { AuthService } from './services/auth.service';
import { SareeService } from './services/saree.service';
import { WishlistService } from './services/wishlist.service';
import { CurrencyService } from './services/currency.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  cartService = inject(CartService);
  authService = inject(AuthService);
  wishlistService = inject(WishlistService);
  currencyService = inject(CurrencyService);
  private sareeService = inject(SareeService);
  private router = inject(Router);

  // Currency Selector Open State
  isCurrencyDropdownOpen = signal(false);

  toggleCurrencyDropdown(event: Event) {
    event.stopPropagation();
    this.isCurrencyDropdownOpen.update(v => !v);
  }

  selectCurrency(code: string) {
    this.currencyService.setCurrency(code);
    this.isCurrencyDropdownOpen.set(false);
  }

  getFlagEmoji(code: string): string {
    const flags: { [key: string]: string } = {
      'INR': '🇮🇳',
      'USD': '🇺🇸',
      'EUR': '🇪🇺',
      'GBP': '🇬🇧',
      'AUD': '🇦🇺',
      'CAD': '🇨🇦',
      'AED': '🇦🇪'
    };
    return flags[code] || '🌐';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.currency-selector-container')) {
      this.isCurrencyDropdownOpen.set(false);
    }
  }

  // Cart Drawer open/close state
  isCartOpen = signal(false);

  // Wishlist Drawer open/close state
  isWishlistOpen = signal(false);

  // Checkout Dialog state
  isCheckoutOpen = signal(false);
  orderSubmitted = signal(false);
  orderNumber = signal('');

  customerName = '';
  customerPhone = '';
  customerAddress = '';

  constructor() {
    effect(() => {
      if (this.cartService.checkoutRequested()) {
        this.openCheckout();
        // Reset the request signal (wrapping in setTimeout to bypass check/allow writes)
        setTimeout(() => this.cartService.checkoutRequested.set(false));
      }
    });
  }

  toggleCart() {
    this.isCartOpen.update(v => !v);
    this.isWishlistOpen.set(false);
  }

  closeCart() {
    this.isCartOpen.set(false);
  }

  toggleWishlist() {
    this.isWishlistOpen.update(v => !v);
    this.isCartOpen.set(false);
  }

  closeWishlist() {
    this.isWishlistOpen.set(false);
  }

  addToCartFromWishlist(item: any) {
    this.cartService.addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      images: [{ image_url: item.image_url, is_primary: true }]
    });
    this.wishlistService.removeFromWishlist(item.id);
  }

  openCheckout() {
    this.isCartOpen.set(false);
    this.isCheckoutOpen.set(true);
    this.orderSubmitted.set(false);
  }

  closeCheckout() {
    this.isCheckoutOpen.set(false);
    this.orderSubmitted.set(false);
    // Reset form
    this.customerName = '';
    this.customerPhone = '';
    this.customerAddress = '';
  }

  submitOrder() {
    if (!this.customerName || !this.customerPhone || !this.customerAddress) {
      alert('Please fill in all the details.');
      return;
    }

    // Generate a random order number
    const randNum = Math.floor(100000 + Math.random() * 900000);
    const orderNo = `SB-${randNum}`;
    this.orderNumber.set(orderNo);

    // Structure the order payload matching OrderCreate backend schema
    const orderPayload = {
      order_number: orderNo,
      customer_name: this.customerName,
      customer_phone: this.customerPhone,
      customer_address: this.customerAddress,
      total_amount: this.cartService.total(),
      items: this.cartService.items().map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      }))
    };

    // Save order in backend database
    this.sareeService.createOrder(orderPayload).subscribe({
      next: (res) => {
        this.orderSubmitted.set(true);
      },
      error: (err) => {
        console.error('Error submitting order to database:', err);
        alert('Could not submit order. Please try again.');
      }
    });
  }

  getWhatsAppLink(): string {
    const itemsText = this.cartService.items().map(
      item => `- ${item.name} (Qty: ${item.quantity}) - ₹${item.price.toLocaleString('en-IN')}`
    ).join('%0A');

    const totalText = `Total: ₹${this.cartService.total().toLocaleString('en-IN')}`;
    const customerText = `Customer: ${this.customerName}%0APhone: ${this.customerPhone}%0AAddress: ${this.customerAddress}`;
    const orderNumText = `Order ID: ${this.orderNumber()}`;

    const text = `Hello Shree Boutique! I would like to place an order:%0A%0A${orderNumText}%0A%0A${itemsText}%0A%0A${totalText}%0A%0A${customerText}`;
    
    // Using a mock default admin number, user can replace it
    return `https://wa.me/919999999999?text=${text}`;
  }

  completeOrderFlow() {
    this.cartService.clearCart();
    this.closeCheckout();
  }

  onLogout() {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/']),
      error: () => this.router.navigate(['/'])
    });
  }

  navigateToHome() {
    if (this.router.url === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      this.router.navigate(['/']).then(() => {
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
      });
    }
  }

  focusSearch() {
    if (this.router.url === '/') {
      this.triggerSearchFocus();
    } else {
      this.router.navigate(['/']).then(() => {
        setTimeout(() => this.triggerSearchFocus(), 250);
      });
    }
  }

  private triggerSearchFocus() {
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      searchInput.focus();
    }
  }

  scrollToSarees() {
    if (this.router.url === '/') {
      this.triggerSareesScroll();
    } else {
      this.router.navigate(['/']).then(() => {
        setTimeout(() => this.triggerSareesScroll(), 250);
      });
    }
  }

  private triggerSareesScroll() {
    const collectionEl = document.getElementById('collection-explore');
    if (collectionEl) {
      collectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  isCurrentRoute(route: string): boolean {
    return this.router.url === route;
  }
}


import { Component, signal, inject, effect } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from './services/cart.service';
import { AuthService } from './services/auth.service';

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
  private router = inject(Router);

  // Cart Drawer open/close state
  isCartOpen = signal(false);

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
  }

  closeCart() {
    this.isCartOpen.set(false);
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
    this.orderNumber.set(`SB-${randNum}`);
    this.orderSubmitted.set(true);
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
}


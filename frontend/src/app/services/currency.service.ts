import { Injectable, signal } from '@angular/core';

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  rate: number; // Rate to convert 1 INR to target currency
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)', rate: 1.0 },
  { code: 'USD', symbol: '$', name: 'US Dollar (USD)', rate: 0.012 },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)', rate: 0.011 },
  { code: 'GBP', symbol: '£', name: 'British Pound (GBP)', rate: 0.0094 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (AUD)', rate: 0.018 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar (CAD)', rate: 0.016 },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham (AED)', rate: 0.044 }
];

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  private currencySignal = signal<CurrencyInfo>(this.loadCurrency());

  readonly currentCurrency = this.currencySignal.asReadonly();
  readonly supportedCurrencies = SUPPORTED_CURRENCIES;

  private loadCurrency(): CurrencyInfo {
    const storedCode = localStorage.getItem('selected_currency');
    if (storedCode) {
      const found = SUPPORTED_CURRENCIES.find(c => c.code === storedCode);
      if (found) return found;
    }
    return SUPPORTED_CURRENCIES[0]; // Default to INR
  }

  setCurrency(code: string) {
    const found = SUPPORTED_CURRENCIES.find(c => c.code === code);
    if (found) {
      localStorage.setItem('selected_currency', code);
      this.currencySignal.set(found);
    }
  }

  format(amountInINR: number): string {
    const cur = this.currencySignal();
    const converted = amountInINR * cur.rate;
    
    if (cur.code === 'INR') {
      return `₹${Math.round(converted).toLocaleString('en-IN')}`;
    } else {
      return `${cur.symbol}${Math.round(converted).toLocaleString('en-US')}`;
    }
  }
}

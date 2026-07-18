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

  constructor() {
    this.detectCurrencyAsync();
  }

  private loadCurrency(): CurrencyInfo {
    const storedCode = localStorage.getItem('selected_currency');
    if (storedCode) {
      const found = SUPPORTED_CURRENCIES.find(c => c.code === storedCode);
      if (found) return found;
    }
    // If no manual choice, run instant local heuristic detection
    const detectedCode = this.detectLocalCurrency();
    const foundDetected = SUPPORTED_CURRENCIES.find(c => c.code === detectedCode);
    return foundDetected || SUPPORTED_CURRENCIES[0];
  }

  private detectLocalCurrency(): string {
    const lang = navigator.language || (navigator.languages && navigator.languages[0]) || '';
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    
    const tz = timezone.toLowerCase();
    const ln = lang.toLowerCase();
    
    if (tz.includes('kolkata') || tz.includes('calcutta') || ln.includes('-in') || ln === 'hi') {
      return 'INR';
    } else if (tz.includes('london') || ln.includes('-gb')) {
      return 'GBP';
    } else if (tz.includes('europe') || ln.includes('-de') || ln.includes('-fr') || ln.includes('-it') || ln.includes('-es') || ln.includes('-nl')) {
      return 'EUR';
    } else if (tz.includes('australia') || tz.includes('sydney') || tz.includes('melbourne') || ln.includes('-au')) {
      return 'AUD';
    } else if (tz.includes('toronto') || tz.includes('vancouver') || ln.includes('-ca')) {
      return 'CAD';
    } else if (tz.includes('dubai') || tz.includes('abu_dhabi') || ln.includes('-ae')) {
      return 'AED';
    } else if (tz.includes('america') || tz.includes('us/') || ln.includes('-us')) {
      return 'USD';
    }
    
    return 'USD'; // default
  }

  private detectCurrencyAsync() {
    // Only fetch if the user hasn't explicitly set a preference
    if (localStorage.getItem('selected_currency')) {
      return;
    }
    
    fetch('https://freeipapi.com/api/json')
      .then(res => res.json())
      .then(data => {
        if (data && data.currencyCode) {
          const found = SUPPORTED_CURRENCIES.find(c => c.code === data.currencyCode);
          if (found) {
            this.currencySignal.set(found);
          }
        }
      })
      .catch(err => {
        console.warn('IP geotargeting failed, using browser locale:', err);
      });
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

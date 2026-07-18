import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SareeService, Saree } from '../../services/saree.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit, OnDestroy {
  private sareeService = inject(SareeService);
  private authService = inject(AuthService);

  // Tab State
  activeTab = signal<'inventory' | 'orders'>('inventory');

  // Lists
  sareesList = signal<Saree[]>([]);
  loadingList = signal(true);

  // Orders State
  ordersList = signal<any[]>([]);
  loadingOrders = signal(true);
  orderViewMode = signal<'grid' | 'table'>('grid');

  // WebSocket Notification state
  private ws: WebSocket | null = null;
  activeAlert = signal<any | null>(null);

  // Custom Confirm Modal state
  isConfirmModalOpen = signal(false);
  orderIdToDeliver = signal<number | null>(null);
  orderNumberToDeliver = signal<string>('');

  // Edit State
  editingSareeId = signal<number | null>(null);
  existingImages = signal<string[]>([]);

  // Quick Paste & Auto-Fill Field
  quickPasteText = '';

  // Upload Form Fields
  name = '';

  price: number | null = null;
  description = '';
  length = '5.5 meters';
  blouse = 'Yes (Contrast)';
  deliveryDuration = '3-5 working days';
  work = '';
  quality = '';
  
  // Highlights (Admin can add multiple bullet points)
  highlightsList = signal<string[]>([]);
  newHighlightInput = '';

  // Files
  selectedFiles: File[] = [];
  imagePreviews = signal<string[]>([]);

  // Messages
  successMessage = signal('');
  errorMessage = signal('');
  submitting = signal(false);

  ngOnInit() {
    this.fetchAdminSarees();
    this.fetchAdminOrders();
    this.connectWebSocket();
  }

  fetchAdminOrders() {
    this.loadingOrders.set(true);
    this.sareeService.getOrders().subscribe({
      next: (data) => {
        this.ordersList.set(data);
        this.loadingOrders.set(false);
      },
      error: (err) => {
        console.error('Error fetching orders:', err);
        this.loadingOrders.set(false);
      }
    });
  }

  fetchAdminSarees() {
    this.loadingList.set(true);
    // Fetch first 100 sarees for admin view
    this.sareeService.getSarees(0, 100, 'newest').subscribe({
      next: (data) => {
        this.sareesList.set(data);
        this.loadingList.set(false);
      },
      error: (err) => {
        console.error('Error fetching sarees for admin:', err);
        this.loadingList.set(false);
      }
    });
  }

  // Highlights management
  addHighlight() {
    const val = this.newHighlightInput.trim();
    if (val) {
      this.highlightsList.update(hl => [...hl, val]);
      this.newHighlightInput = '';
    }
  }

  removeHighlight(index: number) {
    this.highlightsList.update(hl => hl.filter((_, i) => i !== index));
  }

  // Quick Description parsing and auto-fill
  parseQuickPaste() {
    if (!this.quickPasteText.trim()) {
      this.errorMessage.set('Please paste a WhatsApp description first.');
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');

    // Pre-clean: WhatsApp formats bold text with asterisks (e.g. *Saree Name*). 
    // We strip all asterisks first to make keyword matching 100% reliable.
    const cleanedText = this.quickPasteText.replace(/\*/g, '');

    const lines = cleanedText.split('\n');
    let sareeName = '';
    let work = '';
    let length = '';
    let blouse = '';
    let price: number | null = null;
    let deliveryDuration = '';
    let quality = '';
    const highlights: string[] = [];
    
    let isParsingHighlights = false;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // Skip lines consisting of only symbols/emojis (like borders: "💛💖💚💙💛💖")
      const cleanedLine = this.cleanLeadingSymbols(line);
      if (cleanedLine.length === 0) continue;

      const cleaned = cleanedLine.toLowerCase();

      // Check if highlights section starts
      if (cleaned.startsWith('highlights')) {
        isParsingHighlights = true;
        continue;
      }

      if (isParsingHighlights) {
        // Highlights continue until we hit another recognized section or header
        if (this.isLabelLine(line)) {
          isParsingHighlights = false;
        } else {
          highlights.push(cleanedLine);
          continue;
        }
      }

      // Check if it is a specific field
      if ((cleaned.startsWith('saree name') || cleaned.startsWith('name')) && !sareeName) {
        sareeName = this.extractValue(line, ['saree name', 'name']);
      } else if (cleaned.startsWith('work') && !work) {
        work = this.extractValue(line, ['work']);
      } else if (cleaned.startsWith('length') && !length) {
        length = this.extractValue(line, ['length']);
      } else if (cleaned.startsWith('blouse') && !blouse) {
        blouse = this.extractValue(line, ['blouse']);
      } else if (cleaned.startsWith('price') && price === null) {
        const priceStr = this.extractValue(line, ['price']);
        const match = priceStr.match(/\d+/);
        if (match) {
          price = parseInt(match[0], 10);
        }
      } else if ((cleaned.startsWith('delivery duration') || cleaned.startsWith('delivery') || cleaned.startsWith('dispatch')) && !deliveryDuration) {
        deliveryDuration = this.extractValue(line, ['delivery duration', 'delivery', 'dispatch']);
      }
    }

    // Auto-infer fabric quality type from Name
    if (sareeName) {
      const fabricKeywords = ['linen cotton', 'linen', 'cotton', 'silk', 'georgette', 'organza', 'chiffon', 'crepe', 'satin', 'banarasi', 'kanchipuram', 'tussar'];
      const nameLower = sareeName.toLowerCase();
      for (const kw of fabricKeywords) {
        if (nameLower.includes(kw)) {
          quality = kw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          break;
        }
      }
    }

    // Apply parsed values to fields if found
    if (sareeName) this.name = sareeName;
    if (price !== null) this.price = price;
    if (work) {
      this.work = work;
      // Copy Work description directly to detailed description too if empty!
      this.description = work;
    }
    if (length) this.length = length;
    if (blouse) this.blouse = blouse;
    if (deliveryDuration) this.deliveryDuration = deliveryDuration;
    if (quality) this.quality = quality;
    if (highlights.length > 0) this.highlightsList.set(highlights);

    this.successMessage.set('WhatsApp description parsed successfully! Fields have been auto-filled.');
  }

  private isLabelLine(line: string): boolean {
    const cleaned = this.cleanLeadingSymbols(line).toLowerCase();
    const labels = ['saree name', 'name', 'work', 'measurements', 'length', 'blouse', 'price', 'delivery duration', 'delivery', 'dispatch', 'highlights'];
    return labels.some(label => {
      if (cleaned === label) return true;
      if (cleaned.startsWith(label)) {
        const nextChar = cleaned.charAt(label.length);
        return !nextChar || /^[^\w]/u.test(nextChar);
      }
      return false;
    });
  }

  private cleanLeadingSymbols(text: string): string {
    // Strips leading decorative icons/emojis/hearts while strictly preserving digits 0-9 and letters.
    // Matches anything at the start that is NOT alphanumeric (word characters) or common text symbols.
    const leadingSymbolRegex = /^[^\w\s.,()\/\-+\u20B9%&]+/gu;
    return text.replace(leadingSymbolRegex, '').trim();
  }

  private extractValue(line: string, prefixesToStrip: string[]): string {
    // 1. Strip leading emojis/symbols safely
    let text = this.cleanLeadingSymbols(line);

    // 2. Strip labels (e.g. "Saree Name", "PRICE", etc.)
    for (const prefix of prefixesToStrip) {
      if (text.toLowerCase().startsWith(prefix)) {
        text = text.substring(prefix.length).trim();
        break;
      }
    }

    // 3. Strip separators like "-", ":", "="
    if (text.startsWith('-') || text.startsWith(':') || text.startsWith('=')) {
      text = text.substring(1).trim();
    }

    // 4. Run clean leading symbols again in case of spaces or extra leading emojis
    text = this.cleanLeadingSymbols(text);
    return text;
  }

  // File Upload previews


  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const filesArray = Array.from(input.files);
      this.selectedFiles = [...this.selectedFiles, ...filesArray];
      
      // Generate previews
      for (const file of filesArray) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreviews.update(prev => [...prev, e.target.result]);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  clearPreviews() {
    this.selectedFiles = [];
    this.imagePreviews.set([]);
  }

  // Form Submission
  onUploadSaree(form: any) {
    // If not editing, we require at least one photo.
    if (!this.editingSareeId() && this.selectedFiles.length === 0) {
      this.errorMessage.set('Please upload at least one image.');
      return;
    }

    this.submitting.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    const formData = new FormData();
    formData.append('name', this.name);
    formData.append('price', (this.price || 0).toString());
    formData.append('description', this.description);
    formData.append('length', this.length);
    formData.append('blouse', this.blouse);
    formData.append('delivery_duration', this.deliveryDuration);
    formData.append('work', this.work);
    formData.append('quality', this.quality);
    
    // Append highlights as JSON list string
    formData.append('highlights', JSON.stringify(this.highlightsList()));

    // Append all selected files
    for (const file of this.selectedFiles) {
      formData.append('files', file);
    }

    if (this.editingSareeId()) {
      // Edit/Update flow
      this.sareeService.updateSaree(this.editingSareeId()!, formData).subscribe({
        next: () => {
          this.successMessage.set('Saree updated successfully!');
          this.cancelEdit(form);
          this.fetchAdminSarees(); // Refresh list
          this.submitting.set(false);
        },
        error: (err) => {
          console.error('Error updating saree:', err);
          const msg = err.error?.detail || 'An error occurred while updating. Please check inputs.';
          this.errorMessage.set(msg);
          this.submitting.set(false);
        }
      });
    } else {
      // Create/Upload flow
      this.sareeService.createSaree(formData).subscribe({
        next: () => {
          this.successMessage.set('Saree uploaded successfully and images optimized!');
          this.resetForm(form);
          this.fetchAdminSarees(); // Refresh list
          this.submitting.set(false);
        },
        error: (err) => {
          console.error('Error uploading saree:', err);
          const msg = err.error?.detail || 'An error occurred while uploading. Please check inputs.';
          this.errorMessage.set(msg);
          this.submitting.set(false);
        }
      });
    }
  }

  onEditSaree(saree: Saree) {
    this.successMessage.set('');
    this.errorMessage.set('');

    // Toggle edit states
    this.editingSareeId.set(saree.id);
    this.existingImages.set(saree.images.map(img => img.image_url));

    // Refill fields
    this.name = saree.name;
    this.price = saree.price;
    this.description = saree.description;
    this.length = saree.length;
    this.blouse = saree.blouse;
    this.deliveryDuration = saree.delivery_duration;
    this.work = saree.work;
    this.quality = saree.quality;
    this.highlightsList.set([...saree.highlights]);

    // Clear local file selections
    this.clearPreviews();

    // Scroll form panel smoothly to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(form: any) {
    this.editingSareeId.set(null);
    this.existingImages.set([]);
    this.resetForm(form);
  }

  onDeleteSaree(sareeId: number) {
    if (confirm('Are you sure you want to delete this saree? This will permanently delete it and its images.')) {
      this.sareeService.deleteSaree(sareeId).subscribe({
        next: () => {
          this.sareesList.update(list => list.filter(item => item.id !== sareeId));
          alert('Saree deleted successfully.');
        },
        error: (err) => {
          console.error('Error deleting saree:', err);
          alert('Error deleting saree.');
        }
      });
    }
  }

  resetForm(form: any) {
    form.resetForm();
    this.name = '';
    this.price = null;
    this.description = '';
    this.length = '5.5 meters';
    this.blouse = 'Yes (Contrast)';
    this.deliveryDuration = '3-5 working days';
    this.work = '';
    this.quality = '';
    this.highlightsList.set([]);
    this.newHighlightInput = '';
    this.quickPasteText = '';
    this.clearPreviews();
  }

  connectWebSocket() {
    // Connect to backend WS server
    this.ws = new WebSocket('ws://localhost:8000/api/ws/orders');
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_ORDER') {
          this.activeAlert.set(data);
          this.playNotificationSound();
          this.fetchAdminOrders();
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    this.ws.onclose = () => {
      // Reconnect after 5 seconds
      setTimeout(() => {
        this.connectWebSocket();
      }, 5000);
    };
  }

  playNotificationSound() {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.playTone(audioCtx, 523.25, 0.1, 0.0); // C5
      this.playTone(audioCtx, 659.25, 0.15, 0.12); // E5
    } catch (e) {
      console.warn('Audio restrictions prevent auto-playing tone:', e);
    }
  }

  private playTone(ctx: AudioContext, freq: number, duration: number, delay: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(0.08, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  }

  confirmDelivery(orderId: number, orderNumber: string) {
    this.orderIdToDeliver.set(orderId);
    this.orderNumberToDeliver.set(orderNumber);
    this.isConfirmModalOpen.set(true);
  }

  executeMarkAsDelivered() {
    const orderId = this.orderIdToDeliver();
    if (orderId === null) return;
    
    this.sareeService.updateOrderStatus(orderId, 'Delivered').subscribe({
      next: (res) => {
        this.ordersList.update(list => list.map(o => o.id === orderId ? { ...o, status: 'Delivered' } : o));
        this.successMessage.set(`Order ${res.order_number} marked as Delivered!`);
        this.closeConfirmModal();
        setTimeout(() => this.successMessage.set(''), 4000);
      },
      error: (err) => {
        console.error('Error updating order status:', err);
        alert('Failed to mark order as delivered.');
        this.closeConfirmModal();
      }
    });
  }

  closeConfirmModal() {
    this.isConfirmModalOpen.set(false);
    this.orderIdToDeliver.set(null);
    this.orderNumberToDeliver.set('');
  }

  closeAlert() {
    this.activeAlert.set(null);
  }

  onLogout() {
    this.authService.logout().subscribe({
      error: (err) => console.error('Logout failed:', err)
    });
  }

  ngOnDestroy() {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }
  }
}

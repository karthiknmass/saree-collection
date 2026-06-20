import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SareeService, Saree } from '../../services/saree.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  private sareeService = inject(SareeService);

  // Lists
  sareesList = signal<Saree[]>([]);
  loadingList = signal(true);

  // Edit State
  editingSareeId = signal<number | null>(null);
  existingImages = signal<string[]>([]);

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
    this.clearPreviews();
  }

}

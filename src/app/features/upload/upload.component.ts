import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { UploadService, ExtractedFile } from '../../services/upload.service';
import { ConflictService, Conflict } from '../../services/conflict.service';

/**
 * Upload component for handling tar.gz file uploads for deduplication
 *
 * This component allows users to:
 * 1. Select a tar.gz file containing images
 * 2. Upload the file to the backend
 * 3. Receive a process ID for deduplication
 * 4. Navigate to the deduplication component with the process ID
 */
@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressBarModule,
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatGridListModule,
    MatSnackBarModule
  ],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss']
})
export class UploadComponent {
  selectedFiles: File[] = [];
  uploadProgress: number = 0;
  uploadInProgress: boolean = false;
  uploadComplete: boolean = false;
  processId: string = '';
  fileCount: number = 0;
  uploadedFiles: ExtractedFile[] = [];
  loadingFiles: boolean = false;
  hasConflicts: boolean = false;
  conflicts: Conflict[] = [];
  errorMessage: string = '';

  constructor(
    private uploadService: UploadService,
    private router: Router,
    private conflictService: ConflictService,
    private snackBar: MatSnackBar
  ) {}

  /**
   * Handle file selection from input
   */
  onFileSelected(event: any): void {
    this.selectedFiles = [];
    this.uploadComplete = false;
    this.processId = '';
    this.fileCount = 0;
    this.uploadedFiles = [];
    this.hasConflicts = false;
    this.conflicts = [];
    this.errorMessage = '';

    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];

      // Validate file type
      if (!this.isTarGzFile(file)) {
        this.showNotification('Please select a valid tar.gz file', 'error');
        return;
      }

      // Only take the first file since we only need one tar.gz file
      this.selectedFiles.push(file);
      this.showNotification('File selected: ' + file.name, 'info');
    }
  }

  /**
   * Trigger the file input click
   */
  triggerFileInput(): void {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    fileInput.click();
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    return this.uploadService.formatFileSize(bytes);
  }

  /**
   * Check if file is a tar.gz file
   */
  isTarGzFile(file: File): boolean {
    return this.uploadService.isTarGzFile(file);
  }

  /**
   * Upload the selected tar.gz file
   */
  uploadFiles(): void {
    if (this.selectedFiles.length === 0) {
      this.showNotification('Please select a tar.gz file', 'error');
      return;
    }

    const file = this.selectedFiles[0];

    if (!this.isTarGzFile(file)) {
      this.showNotification('Please select a valid tar.gz file', 'error');
      return;
    }

    this.uploadInProgress = true;
    this.uploadProgress = 0;
    this.uploadComplete = false;
    this.uploadedFiles = [];
    this.hasConflicts = false;
    this.conflicts = [];
    this.errorMessage = '';

    this.uploadService.uploadTarGzFile(file).subscribe({
      next: (event) => {
        if (event.type === 'progress' && event.progress !== undefined) {
          this.uploadProgress = event.progress;
        } else if (event.type === 'complete' && event.response) {
          const response = event.response;
          console.log('Upload response:', response);

          if (response.success) {
            this.processId = response.processId || '';
            this.fileCount = response.fileCount || 0;
            this.uploadComplete = true;

            // Check for conflicts
            if (response.warning && response.conflictId) {
              this.hasConflicts = true;
              this.showNotification('Upload completed with potential conflicts. Please review.', 'warning');

              // Fetch conflicts if available
              if (this.processId) {
                this.fetchConflicts(this.processId);
              }
            } else {
              this.showNotification('Upload successful!', 'success');
            }

            console.log(`Upload successful. Process ID: ${this.processId}, Files: ${this.fileCount}`);

            // If we have extracted files in the response, use them
            if (response.extractedFiles && response.extractedFiles.length > 0) {
              console.log(`Upload response contains ${response.extractedFiles.length} extracted files`);
              this.uploadedFiles = response.extractedFiles;

              // Load image previews for the files
              this.loadImagePreviews();
            }
            // Otherwise fetch the uploaded files to display them
            else if (this.processId) {
              console.log(`No extracted files in response, fetching files for process: ${this.processId}`);
              this.fetchUploadedFiles(this.processId);
            } else {
              console.log('No process ID available to fetch files');
              this.loadingFiles = false;
            }
          } else {
            this.errorMessage = response.message || 'Unknown error';
            this.showNotification(`Upload failed: ${this.errorMessage}`, 'error');
          }

          this.uploadInProgress = false;
        }
      },
      error: (error) => {
        console.error('Upload error:', error);
        this.uploadInProgress = false;
        this.errorMessage = error.message || 'Unknown error';
        this.showNotification(`Upload failed: ${this.errorMessage}`, 'error');
      }
    });
  }

  /**
   * Fetch the uploaded files for a process
   */
  fetchUploadedFiles(processId: string): void {
    this.loadingFiles = true;
    console.log(`Fetching uploaded files for process: ${processId}`);

    // Use the upload service to get process images with previews
    this.uploadService.getProcessImagesWithPreviews(processId).subscribe({
      next: (files) => {
        console.log(`Received ${files.length} files from getProcessImagesWithPreviews`);
        this.uploadedFiles = files;

        // Now load the image previews for these files
        if (files.length > 0) {
          this.loadImagePreviews();
        } else {
          this.loadingFiles = false;
          console.log('No files to display');
        }
      },
      error: (error) => {
        console.error('Error fetching uploaded files:', error);
        this.loadingFiles = false;
        this.showNotification('Error loading file previews', 'error');
      }
    });
  }

  /**
   * Load image previews for the uploaded files
   */
  loadImagePreviews(): void {
    if (this.uploadedFiles.length === 0) {
      console.log('No files to load previews for');
      return;
    }

    this.loadingFiles = true;
    console.log(`Loading image previews for ${this.uploadedFiles.length} files`);

    // Use the upload service to load image previews
    // Limit to 20 files to avoid performance issues
    this.uploadService.loadImagePreviews(this.uploadedFiles, 20).subscribe({
      next: (files) => {
        console.log(`Received ${files.length} files with previews`);

        // Check if we have any previews
        const filesWithPreviews = files.filter(file => file.base64Preview && file.base64Preview.length > 0);
        console.log(`${filesWithPreviews.length} files have valid previews`);

        this.uploadedFiles = files;
        this.loadingFiles = false;
      },
      error: (error) => {
        console.error('Error loading image previews:', error);
        this.loadingFiles = false;
        this.showNotification('Error loading image previews', 'error');
      }
    });
  }

  /**
   * Fetch conflicts for a process
   */
  fetchConflicts(processId: string): void {
    this.conflictService.getConflictsByProcess(processId).subscribe({
      next: (conflicts) => {
        this.conflicts = conflicts;
        console.log('Fetched conflicts:', conflicts);

        if (conflicts.length > 0) {
          this.hasConflicts = true;
          this.showNotification(`Found ${conflicts.length} potential conflicts`, 'warning');
        }
      },
      error: (error) => {
        console.error('Error fetching conflicts:', error);
      }
    });
  }

  /**
   * Clear the file selection and reset the component
   */
  clearSelection(): void {
    this.selectedFiles = [];
    this.uploadComplete = false;
    this.uploadProgress = 0;
    this.processId = '';
    this.fileCount = 0;
    this.uploadedFiles = [];
    this.hasConflicts = false;
    this.conflicts = [];
    this.errorMessage = '';

    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';

    // Clear temp files on the server
    this.uploadService.clearTempFiles().subscribe({
      next: (response) => {
        console.log(response.message);
        this.showNotification('Ready for a new upload', 'info');
      },
      error: (error) => {
        console.error('Error clearing temp folder:', error);
        this.showNotification('Error clearing temporary files', 'error');
      }
    });
  }

  /**
   * Navigate to the deduplication component with the process ID
   */
  goToDeduplication(): void {
    if (this.processId) {
      this.router.navigate(['/features/deduplication'], {
        queryParams: { processId: this.processId }
      });
    }
  }

  /**
   * Navigate to the upload history component
   */
  viewHistory(): void {
    this.router.navigate(['/features/upload-history']);
  }

  /**
   * Navigate to the conflicts component with the process ID
   */
  goToConflicts(): void {
    if (this.processId) {
      this.router.navigate(['/features/conflicts'], {
        queryParams: { processId: this.processId }
      });
    }
  }

  /**
   * Handle image loading errors by displaying a fallback icon
   * @param event The error event from the image
   */
  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    if (imgElement && imgElement.src) {
      console.log(`Image failed to load: ${imgElement.src}`);

      // Hide the image element that failed to load
      imgElement.style.display = 'none';

      // Find the parent container and add a class to show the fallback icon
      const container = imgElement.closest('.image-container');
      if (container) {
        // Check if the fallback is already added to avoid duplicates
        if (!container.querySelector('.no-image-container')) {
          console.log('Adding fallback image container');

          const fallbackDiv = document.createElement('div');
          fallbackDiv.className = 'no-image-container';

          const icon = document.createElement('mat-icon');
          icon.className = 'no-image-icon';
          icon.textContent = 'image_not_supported';

          const text = document.createElement('p');
          text.textContent = 'Image failed to load';

          fallbackDiv.appendChild(icon);
          fallbackDiv.appendChild(text);
          container.appendChild(fallbackDiv);
        }
      }
    }
  }

  /**
   * Show a notification message
   * @param message The message to display
   * @param type The type of notification (success, error, warning, info)
   */
  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    let panelClass = ['notification'];

    switch (type) {
      case 'success':
        panelClass.push('notification-success');
        break;
      case 'error':
        panelClass.push('notification-error');
        break;
      case 'warning':
        panelClass.push('notification-warning');
        break;
      case 'info':
        panelClass.push('notification-info');
        break;
    }

    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: panelClass
    });
  }
}

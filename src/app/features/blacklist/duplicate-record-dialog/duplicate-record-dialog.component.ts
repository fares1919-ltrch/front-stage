import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { DuplicateRecordService, DuplicateRecord, DuplicateMatch } from '../../../services/duplicate-record.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UploadService } from 'src/app/services/upload.service';

@Component({
  selector: 'app-duplicate-record-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    MatDialogModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './duplicate-record-dialog.component.html',
  styleUrls: ['./duplicate-record-dialog.component.scss']
})
export class DuplicateRecordDialogComponent implements OnInit {
  record: DuplicateRecord | null = null;
  isLoading = true;
  error: string | null = null;
  originalImagePreview: string | null = null;
  duplicateImagePreviews: Map<string, string> = new Map();

  constructor(
    public dialogRef: MatDialogRef<DuplicateRecordDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { recordId: string },
    private duplicateRecordService: DuplicateRecordService,
    private uploadService: UploadService
  ) {}

  ngOnInit(): void {
    this.loadRecordDetails();
  }

  /**
   * Load the duplicate record details
   */
  loadRecordDetails(): void {
    this.isLoading = true;
    this.error = null;

    // Validate record ID
    if (!this.data || !this.data.recordId) {
      this.error = 'Invalid record ID provided.';
      this.isLoading = false;
      return;
    }

    this.duplicateRecordService.getDuplicateRecord(this.data.recordId).subscribe({
      next: (record) => {
        if (!record) {
          this.error = 'No record data returned from server.';
          this.isLoading = false;
          return;
        }

        this.record = record;
        this.isLoading = false;

        // Create default values for missing properties to prevent errors
        if (!this.record.status) {
          this.record.status = 'Unknown';
        }

        if (!this.record.duplicates) {
          this.record.duplicates = [];
        }

        // Load image previews
        this.loadImagePreviews();
      },
      error: (error) => {
        console.error('Error loading duplicate record:', error);
        this.error = 'Failed to load record details. Please try again.';
        this.isLoading = false;
      }
    });
  }

  /**
   * Load image previews for the original file and duplicates
   */
  loadImagePreviews(): void {
    if (!this.record) return;

    // Only try to load the original file preview if we have a valid originalFileId
    if (this.record.originalFileId) {
      this.uploadService.getFilePreview(this.record.originalFileId).subscribe({
        next: (preview) => {
          if (preview) {
            this.originalImagePreview = preview;
          }
        },
        error: (error) => {
          console.error('Error loading original file preview:', error);
          // We'll just leave originalImagePreview as null, which will show the "No preview available" message
        }
      });
    }

    // Load duplicate file previews
    if (this.record.duplicates && this.record.duplicates.length > 0) {
      this.record.duplicates.forEach(duplicate => {
        // Only try to load if we have a valid fileId
        if (duplicate && duplicate.fileId) {
          this.uploadService.getFilePreview(duplicate.fileId).subscribe({
            next: (preview) => {
              if (preview) {
                this.duplicateImagePreviews.set(duplicate.fileId, preview);
              }
            },
            error: (error) => {
              console.error(`Error loading preview for duplicate ${duplicate.fileId}:`, error);
              // We'll just not add this preview to the map, which will show the "No preview available" message
            }
          });
        }
      });
    }
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    return date.toLocaleString();
  }

  /**
   * Format confidence score as percentage
   */
  formatConfidence(confidence: number | undefined): string {
    if (confidence === undefined || confidence === null) {
      return 'N/A';
    }
    return (confidence * 100).toFixed(2) + '%';
  }

  /**
   * Close the dialog
   */
  close(): void {
    this.dialogRef.close();
  }
}

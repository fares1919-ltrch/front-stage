import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import { SelectionModel } from '@angular/cdk/collections';
import { UploadService, ExtractedFile } from '../../services/upload.service';
import { ConflictService, Conflict, AutoResolveResponse } from '../../services/conflict.service';
import { AuthService } from '../../services/auth.service';

/**
 * Conflicts component for managing and resolving conflicts
 */
@Component({
  selector: 'app-conflicts',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatDialogModule,
    MatCheckboxModule
  ],
  templateUrl: './conflicts.component.html',
  styleUrls: ['./conflicts.component.scss']
})
export class ConflictsComponent implements OnInit {
  processId: string | null = '';
  conflicts: Conflict[] = [];
  conflictFiles: ExtractedFile[] = [];
  loading: boolean = false;
  displayedColumns: string[] = ['select', 'fileName', 'matchedFileName', 'confidence', 'status', 'actions'];
  showingAllConflicts: boolean = false;
  selection = new SelectionModel<Conflict>(true, []);

  // Pagination
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];
  pageIndex: number = 0;
  totalConflicts: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private uploadService: UploadService,
    private conflictService: ConflictService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['processId']) {
        this.processId = params['processId'];
        this.loadConflictsByProcess();
      } else {
        // If no process ID is provided, load all conflicts
        this.loadAllConflicts();
      }
    });
  }

  /**
   * Load all conflicts from the system
   */
  loadAllConflicts(): void {
    this.loading = true;
    this.processId = null;
    this.clearSelection();

    this.conflictService.getAllConflicts().subscribe({
      next: (conflicts) => {
        this.conflicts = conflicts;
        this.totalConflicts = conflicts.length;
        this.loading = false;

        if (conflicts.length === 0) {
          this.showNotification('No conflicts found in the system', 'info');
        } else {
          this.showNotification(`Found ${conflicts.length} conflicts in the system`, 'info');
        }
      },
      error: (error) => {
        console.error('Error loading all conflicts:', error);
        this.loading = false;
        this.showNotification('Error loading conflicts', 'error');
      }
    });
  }

  /**
   * Load conflicts for a specific process
   */
  loadConflictsByProcess(): void {
    if (!this.processId) {
      return;
    }

    this.loading = true;
    this.clearSelection();

    this.conflictService.getConflictsByProcess(this.processId).subscribe({
      next: (conflicts) => {
        this.conflicts = conflicts;
        this.totalConflicts = conflicts.length;
        this.loading = false;

        if (conflicts.length === 0) {
          this.showNotification('No conflicts found for this process', 'info');
        } else {
          // Load conflict files
          this.loadConflictFiles();
        }
      },
      error: (error) => {
        console.error('Error loading conflicts:', error);
        this.loading = false;
        this.showNotification('Error loading conflicts', 'error');
      }
    });
  }

  /**
   * Load files with conflict status
   */
  loadConflictFiles(): void {
    if (!this.processId) {
      return;
    }

    this.uploadService.getConflictFiles(this.processId).subscribe({
      next: (files) => {
        this.conflictFiles = files;

        // Load image previews
        if (files.length > 0) {
          this.loadImagePreviews();
        }
      },
      error: (error) => {
        console.error('Error loading conflict files:', error);
      }
    });
  }

  /**
   * Load image previews for conflict files
   */
  loadImagePreviews(): void {
    this.uploadService.loadImagePreviews(this.conflictFiles).subscribe({
      next: (files) => {
        this.conflictFiles = files;
      },
      error: (error) => {
        console.error('Error loading image previews:', error);
      }
    });
  }

  /**
   * Handle page change event
   */
  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
  }

  /**
   * Resolve a conflict
   */
  resolveConflict(conflictId: string, resolution: string): void {
    this.loading = true;

    // Get the current user's email from the AuthService
    const currentUser = this.authService.getCurrentUser();
    const userEmail = currentUser?.email || 'User';

    console.log(`Resolving conflict with ID: ${conflictId} as user: ${userEmail}`);

    const payload = {
      resolution: resolution,
      resolvedBy: userEmail // Use the user's email
    };

    this.conflictService.resolveConflict(conflictId, payload).subscribe({
      next: (result) => {
        this.loading = false;
        console.log('Conflict resolved successfully:', result);
        this.showNotification(`Conflict resolved as: ${resolution}`, 'success');

        // Reload conflicts
        if (this.processId) {
          this.loadConflictsByProcess();
        } else {
          this.loadAllConflicts();
        }
      },
      error: (error) => {
        console.error('Error resolving conflict:', error);
        this.loading = false;
        this.showNotification('Error resolving conflict', 'error');
      }
    });
  }

  /**
   * Go to deduplication with the current process ID
   */
  goToDeduplication(): void {
    this.router.navigate(['/features/deduplication'], {
      queryParams: { processId: this.processId }
    });
  }

  /**
   * Go back to upload history
   */
  goToHistory(): void {
    this.router.navigate(['/features/upload-history']);
  }

  /**
   * Auto-resolve all conflicts in the system
   */
  autoResolveAllConflicts(): void {
    if (confirm('Are you sure you want to auto-resolve all conflicts? This action cannot be undone.')) {
      this.loading = true;

      // Get the current user's email from the AuthService
      const currentUser = this.authService.getCurrentUser();
      const userEmail = currentUser?.email || 'System';

      console.log(`Auto-resolving conflicts as user: ${userEmail}`);

      // Use the new approach to resolve all conflicts one by one
      this.conflictService.resolveAllConflicts(
        this.conflicts,
        'Keep Both', // Default resolution for all conflicts
        userEmail
      ).subscribe({
        next: (result) => {
          this.loading = false;
          console.log('Auto-resolve result:', result);

          const message = result.message ||
            `Resolved ${result.autoResolvedCount} of ${result.totalConflicts} conflicts`;

          this.showNotification(message, 'success');
          this.loadAllConflicts(); // Reload the conflicts list
        },
        error: (error) => {
          console.error('Error resolving all conflicts:', error);
          this.loading = false;
          this.showNotification('Error resolving conflicts', 'error');
        }
      });
    }
  }

  /**
   * Resolve all conflicts with a specific resolution
   * @param resolution The resolution to apply to all conflicts
   */
  resolveAllConflicts(resolution: string): void {
    if (confirm(`Are you sure you want to resolve all conflicts as "${resolution}"? This action cannot be undone.`)) {
      this.loading = true;

      // Get the current user's email from the AuthService
      const currentUser = this.authService.getCurrentUser();
      const userEmail = currentUser?.email || 'System';

      console.log(`Resolving all conflicts as "${resolution}" by user: ${userEmail}`);

      // Use the service to resolve all conflicts one by one
      this.conflictService.resolveAllConflicts(
        this.conflicts,
        resolution,
        userEmail
      ).subscribe({
        next: (result) => {
          this.loading = false;
          console.log('Resolve all result:', result);

          const message = result.message ||
            `Resolved ${result.autoResolvedCount} of ${result.totalConflicts} conflicts as "${resolution}"`;

          this.showNotification(message, 'success');

          // Reload conflicts
          if (this.processId) {
            this.loadConflictsByProcess();
          } else {
            this.loadAllConflicts();
          }
        },
        error: (error) => {
          console.error('Error resolving all conflicts:', error);
          this.loading = false;
          this.showNotification('Error resolving conflicts', 'error');
        }
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
      console.log('Image failed to load:', imgElement.src);

      // Hide the image element that failed to load
      imgElement.style.display = 'none';

      // Find the parent container and add a class to show the fallback icon
      const container = imgElement.closest('.image-container');
      if (container) {
        // Check if the fallback is already added
        if (!container.querySelector('.no-image-container')) {
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
   * Resolve selected conflicts with a specific resolution
   * @param resolution The resolution to apply to selected conflicts
   */
  resolveSelectedConflicts(resolution: string): void {
    if (this.selection.isEmpty()) {
      this.showNotification('No conflicts selected', 'warning');
      return;
    }

    if (confirm(`Are you sure you want to resolve ${this.selection.selected.length} selected conflicts as "${resolution}"?`)) {
      this.loading = true;

      // Get the current user's email from the AuthService
      const currentUser = this.authService.getCurrentUser();
      const userEmail = currentUser?.email || 'System';

      console.log(`Resolving ${this.selection.selected.length} selected conflicts as "${resolution}" by user: ${userEmail}`);

      // Use the service to resolve selected conflicts one by one
      this.conflictService.resolveAllConflicts(
        this.selection.selected,
        resolution,
        userEmail
      ).subscribe({
        next: (result: AutoResolveResponse) => {
          this.loading = false;
          console.log('Resolve selected conflicts result:', result);

          const message = result.message ||
            `Resolved ${result.autoResolvedCount} of ${result.totalConflicts} selected conflicts as "${resolution}"`;

          this.showNotification(message, 'success');

          // Clear selection
          this.selection.clear();

          // Reload conflicts
          if (this.processId) {
            this.loadConflictsByProcess();
          } else {
            this.loadAllConflicts();
          }
        },
        error: (error) => {
          console.error('Error resolving selected conflicts:', error);
          this.loading = false;
          this.showNotification('Error resolving conflicts', 'error');
        }
      });
    }
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.conflicts.filter(c => c.status !== 'Resolved').length;
    return numSelected === numRows && numRows > 0;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }

    // Select only unresolved conflicts
    this.selection.select(...this.conflicts.filter(c => c.status !== 'Resolved'));
  }

  /** Clears the selection when conflicts are reloaded */
  clearSelection() {
    this.selection.clear();
  }

  /**
   * Show a notification message
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

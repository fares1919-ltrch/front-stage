import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DeduplicationService, Process, DeduplicationResponse } from '../../services/deduplication.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';

/**
 * Processes component for displaying and managing all deduplication processes
 */
@Component({
  selector: 'app-processes',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressBarModule
  ],
  templateUrl: './processes.component.html',
  styleUrls: ['./processes.component.scss']
})
export class ProcessesComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<Process>([]);
  displayedColumns: string[] = ['id', 'name', 'createdAt', 'username', 'totalFiles', 'processedFiles', 'status', 'actions'];
  isLoading = true;
  error: string | null = null;
  processingIds: Set<string> = new Set();

  // Pagination
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];
  pageIndex: number = 0;
  totalProcesses: number = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private deduplicationService: DeduplicationService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadProcesses();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Load all processes from the backend
   */
  loadProcesses(): void {
    this.isLoading = true;
    this.error = null;

    this.deduplicationService.getAllProcesses().subscribe({
      next: (processes) => {
        this.dataSource.data = processes;
        this.totalProcesses = processes.length;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading processes:', err);
        this.error = 'Failed to load processes. Please try again later.';
        this.isLoading = false;
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
   * Navigate to the deduplication component with the selected process ID
   */
  viewProcessDetails(processId: string): void {
    if (!processId) return;

    // Extract the actual ID if it contains a prefix
    const actualId = processId.includes('/') ? processId.split('/')[1] : processId;

    this.router.navigate(['/features/deduplication'], {
      queryParams: { processId: actualId }
    });
  }

  /**
   * Navigate to the conflicts component with the selected process ID
   */
  viewProcessConflicts(processId: string): void {
    if (!processId) return;

    // Extract the actual ID if it contains a prefix
    const actualId = processId.includes('/') ? processId.split('/')[1] : processId;

    this.router.navigate(['/features/conflicts'], {
      queryParams: { processId: actualId }
    });
  }

  /**
   * Start deduplication for a process
   */
  startDeduplication(processId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (!processId || this.processingIds.has(processId)) {
      return;
    }

    // Extract the actual ID if it contains a prefix
    const actualId = processId.includes('/') ? processId.split('/')[1] : processId;

    this.processingIds.add(actualId);

    this.deduplicationService.startDeduplication(actualId).subscribe({
      next: (_: DeduplicationResponse) => {
        this.processingIds.delete(actualId);
        this.showNotification(`Deduplication started for process ${actualId}`, 'success');
        this.loadProcesses(); // Reload to update status
      },
      error: (error) => {
        this.processingIds.delete(actualId);
        console.error('Error starting deduplication:', error);
        this.showNotification(`Failed to start deduplication: ${error.message || 'Unknown error'}`, 'error');
      }
    });
  }

  /**
   * Navigate to the upload component
   */
  newUpload(): void {
    this.router.navigate(['/features/upload']);
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    return date.toLocaleString();
  }

  /**
   * Format process ID for display
   */
  formatProcessId(processId: string): string {
    if (!processId) return 'N/A';

    return processId.includes('/') ? processId.split('/')[1] : processId;
  }

  /**
   * Get status color class
   */
  getStatusClass(status: string): string {
    if (!status) return 'status-pending';

    const statusLower = status.toLowerCase();

    if (statusLower.includes('complete') || statusLower === 'completed') {
      return 'status-completed';
    } else if (statusLower.includes('process') || statusLower === 'processing' || statusLower === 'inprocessing') {
      return 'status-processing';
    } else if (statusLower.includes('error') || statusLower === 'failed') {
      return 'status-error';
    } else if (statusLower.includes('conflict')) {
      return 'status-conflict';
    } else {
      return 'status-pending';
    }
  }

  /**
   * Show notification
   */
  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    const panelClass = ['notification'];

    switch (type) {
      case 'success':
        panelClass.push('notification-success');
        break;
      case 'error':
        panelClass.push('notification-error');
        break;
      case 'info':
        panelClass.push('notification-info');
        break;
    }

    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass
    });
  }
}

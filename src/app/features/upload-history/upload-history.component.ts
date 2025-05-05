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
import { DeduplicationService, Process } from '../../services/deduplication.service';
import { MatTableDataSource } from '@angular/material/table';

/**
 * Upload History component for displaying all uploaded files and processes
 */
@Component({
  selector: 'app-upload-history',
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
    MatTooltipModule
  ],
  templateUrl: './upload-history.component.html',
  styleUrls: ['./upload-history.component.scss']
})
export class UploadHistoryComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<Process>([]);
  displayedColumns: string[] = ['processId', 'processDate', 'processFiles', 'status', 'actions'];
  isLoading = true;
  error: string | null = null;

  // Pagination
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];
  pageIndex: number = 0;
  totalProcesses: number = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private deduplicationService: DeduplicationService,
    private router: Router
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
        this.error = 'Failed to load upload history. Please try again later.';
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
  viewProcess(processId: string): void {
    this.router.navigate(['/features/deduplication'], {
      queryParams: { processId }
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
}

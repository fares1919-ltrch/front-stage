import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DuplicateRecordService, DuplicateRecord } from '../../services/duplicate-record.service';
import { MaterialModule } from 'src/app/material.module';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DuplicateRecordDialogComponent } from './duplicate-record-dialog/duplicate-record-dialog.component';

/**
 * Blacklist component for managing deduplicated records
 *
 * This component:
 * 1. Displays a list of all confirmed duplicate records
 * 2. Allows filtering and sorting of records
 * 3. Provides options to view and manage blacklisted items
 */
@Component({
    selector: 'app-blacklist',
    imports: [
        CommonModule,
        MaterialModule,
        RouterModule,
        ReactiveFormsModule,
        MatDialogModule
    ],
    templateUrl: './blacklist.component.html',
    styleUrls: ['./blacklist.component.scss'],
    standalone: true
})
export class BlacklistComponent implements OnInit {
    duplicateRecords: DuplicateRecord[] = [];
    filteredRecords: DuplicateRecord[] = [];
    isLoading: boolean = false;
    errorMessage: string | null = null;
    hasError: boolean = false;
    filterForm: FormGroup;
    processId: string | null = null;
    displayedColumns: string[] = ['id', 'processId', 'originalFileName', 'duplicateCount', 'status', 'detectedDate', 'actions'];

    constructor(
        private duplicateRecordService: DuplicateRecordService,
        private route: ActivatedRoute,
        private router: Router,
        private fb: FormBuilder,
        private snackBar: MatSnackBar,
        private dialog: MatDialog
    ) {
        this.filterForm = this.fb.group({
            status: ['All'], // Default to showing All duplicates
            processId: [''],
            fileName: ['']
        });
    }

    ngOnInit(): void {
        // Check if we have a processId in the URL parameters
        this.route.queryParams.subscribe(params => {
            this.processId = params['processId'] || null;

            if (this.processId) {
                // If we have a process ID, fetch duplicate records for that process
                this.fetchDuplicatesByProcess(this.processId);
                this.filterForm.get('processId')?.setValue(this.processId);
            } else {
                // Otherwise, fetch all duplicate records
                this.fetchAllDuplicates();
            }
        });
    }

    /**
     * Fetch all duplicate records
     */
    fetchAllDuplicates(): void {
        this.isLoading = true;
        this.errorMessage = null;
        this.hasError = false;

        this.duplicateRecordService.getAllDuplicateRecords().subscribe({
            next: (records: DuplicateRecord[]) => {
                this.duplicateRecords = records;
                this.applyFilters(); // Apply any existing filters
                this.isLoading = false;
            },
            error: (error: any) => {
                console.error('Error fetching duplicate records:', error);
                this.isLoading = false;
                this.duplicateRecords = [];
                this.filteredRecords = [];
                this.errorMessage = "Could not load duplicate records. Please check your connection and try again.";
                this.hasError = true;
                this.showNotification(this.errorMessage, 'error');
            }
        });
    }

    /**
     * Fetch duplicate records for a specific process
     * @param processId The ID of the process to fetch duplicate records for
     */
    fetchDuplicatesByProcess(processId: string): void {
        this.isLoading = true;
        this.errorMessage = null;
        this.hasError = false;

        this.duplicateRecordService.getDuplicateRecordsByProcess(processId).subscribe({
            next: (records: DuplicateRecord[]) => {
                this.duplicateRecords = records;
                this.applyFilters(); // Apply any existing filters
                this.isLoading = false;
            },
            error: (error: any) => {
                console.error(`Error fetching duplicate records for process ${processId}:`, error);
                this.isLoading = false;
                this.duplicateRecords = [];
                this.filteredRecords = [];
                this.errorMessage = `Could not load duplicate records for process ID: ${processId}. Please check your connection and try again.`;
                this.hasError = true;
                this.showNotification(this.errorMessage, 'error');
            }
        });
    }

    /**
     * Apply filters to the duplicate records list
     */
    applyFilters(): void {
        const status = this.filterForm.get('status')?.value;
        const processId = this.filterForm.get('processId')?.value;
        const fileName = this.filterForm.get('fileName')?.value;

        this.filteredRecords = this.duplicateRecords.filter(record => {
            // Filter by status
            if (status && record.status !== status) {
                return false;
            }

            // Filter by process ID
            if (processId) {
                const recordProcessId = record.processId.includes('/')
                    ? record.processId.split('/')[1]
                    : record.processId;

                if (!recordProcessId.includes(processId)) {
                    return false;
                }
            }

            // Filter by file name
            if (fileName && !record.originalFileName.toLowerCase().includes(fileName.toLowerCase())) {
                return false;
            }

            return true;
        });
    }

    /**
     * Reset all filters
     */
    resetFilters(): void {
        this.filterForm.reset({
            status: 'Confirmed',
            processId: this.processId || '',
            fileName: ''
        });
        this.applyFilters();
    }

    /**
     * Reject a duplicate record
     * @param record The duplicate record to reject
     */
    rejectDuplicate(record: DuplicateRecord): void {
        const notes = 'Rejected by user';

        this.duplicateRecordService.rejectDuplicateRecord(record.id, notes).subscribe({
            next: () => {
                this.showNotification('Duplicate record rejected successfully', 'success');

                // Refresh the duplicate records list
                if (this.processId) {
                    this.fetchDuplicatesByProcess(this.processId);
                } else {
                    this.fetchAllDuplicates();
                }
            },
            error: (error) => {
                console.error('Error rejecting duplicate record:', error);
                this.showNotification('Failed to reject duplicate record. Please try again.', 'error');
            }
        });
    }

    /**
     * Navigate to process details
     * @param processId The ID of the process to view
     */
    viewProcessDetails(processId: string): void {
        this.router.navigate(['/features/deduplication'], {
            queryParams: { processId }
        });
    }

    /**
     * Format process ID for display
     * @param processId The full process ID
     * @returns The shortened process ID
     */
    formatProcessId(processId: string): string {
        return processId.includes('/') ? processId.split('/')[1] : processId;
    }

    /**
     * Get the count of duplicates for a record
     * @param record The duplicate record
     * @returns The number of duplicates
     */
    getDuplicateCount(record: DuplicateRecord): number {
        return record.duplicates?.length || 0;
    }

    /**
     * View duplicate record details
     * @param record The duplicate record to view
     */
    viewDuplicateDetails(record: DuplicateRecord): void {
        this.dialog.open(DuplicateRecordDialogComponent, {
            width: '800px',
            maxHeight: '90vh',
            data: {
                recordId: record.id
            }
        });
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

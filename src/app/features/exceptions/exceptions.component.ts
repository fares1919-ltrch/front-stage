import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ExceptionService, Exception, ResolveExceptionsResponse } from '../../services/exception.service';
import { MaterialModule } from 'src/app/material.module';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SelectionModel } from '@angular/cdk/collections';

/**
 * Exceptions component for managing deduplication exceptions
 *
 * This component:
 * 1. Displays a list of all exceptions or exceptions for a specific process
 * 2. Allows users to resolve exceptions
 * 3. Provides filtering and sorting options
 */
@Component({
    selector: 'app-exceptions',
    imports: [CommonModule, MaterialModule, RouterModule, ReactiveFormsModule, MatDialogModule],
    templateUrl: './exceptions.component.html',
    styleUrls: ['./exceptions.component.scss'],
    standalone: true
})
export class ExceptionsComponent implements OnInit {
    exceptions: Exception[] = [];
    filteredExceptions: Exception[] = [];
    isLoading: boolean = false;
    errorMessage: string | null = null;
    hasError: boolean = false;
    filterForm: FormGroup;
    processId: string | null = null;
    displayedColumns: string[] = ['select', 'id', 'processId', 'fileName', 'comparisonScore', 'status', 'createdAt', 'actions'];
    selection = new SelectionModel<Exception>(true, []);

    constructor(
        private exceptionService: ExceptionService,
        private route: ActivatedRoute,
        private router: Router,
        private fb: FormBuilder,
        private snackBar: MatSnackBar,
        private dialog: MatDialog
    ) {
        this.filterForm = this.fb.group({
            status: [''],
            processId: [''],
            fileName: [''],
            minScore: ['', [Validators.min(0), Validators.max(1)]],
            maxScore: ['', [Validators.min(0), Validators.max(1)]]
        });
    }

    ngOnInit(): void {
        // Check if we have a processId in the URL parameters
        this.route.queryParams.subscribe(params => {
            this.processId = params['processId'] || null;

            if (this.processId) {
                // If we have a process ID, fetch exceptions for that process
                this.fetchExceptionsByProcess(this.processId);
                this.filterForm.get('processId')?.setValue(this.processId);
            } else {
                // Otherwise, fetch all exceptions
                this.fetchAllExceptions();
            }
        });
    }

    /**
     * Fetch all exceptions
     */
    fetchAllExceptions(): void {
        this.isLoading = true;
        this.errorMessage = null;
        this.hasError = false;

        this.exceptionService.getAllExceptions().subscribe({
            next: (exceptions: Exception[]) => {
                this.exceptions = exceptions;
                this.applyFilters(); // Apply any existing filters
                this.isLoading = false;
            },
            error: (error: any) => {
                console.error('Error fetching exceptions:', error);
                this.isLoading = false;
                this.exceptions = [];
                this.filteredExceptions = [];
                this.errorMessage = "Could not load exceptions. Please check your connection and try again.";
                this.hasError = true;
                this.showNotification(this.errorMessage, 'error');
            }
        });
    }

    /**
     * Fetch exceptions for a specific process
     * @param processId The ID of the process to fetch exceptions for
     */
    fetchExceptionsByProcess(processId: string): void {
        this.isLoading = true;
        this.errorMessage = null;
        this.hasError = false;

        this.exceptionService.getExceptionsByProcess(processId).subscribe({
            next: (exceptions: Exception[]) => {
                this.exceptions = exceptions;
                this.applyFilters(); // Apply any existing filters
                this.isLoading = false;
            },
            error: (error: any) => {
                console.error(`Error fetching exceptions for process ${processId}:`, error);
                this.isLoading = false;
                this.exceptions = [];
                this.filteredExceptions = [];
                this.errorMessage = `Could not load exceptions for process ID: ${processId}. Please check your connection and try again.`;
                this.hasError = true;
                this.showNotification(this.errorMessage, 'error');
            }
        });
    }

    /**
     * Apply filters to the exceptions list
     */
    applyFilters(): void {
        const status = this.filterForm.get('status')?.value;
        const processId = this.filterForm.get('processId')?.value;
        const fileName = this.filterForm.get('fileName')?.value;
        const minScore = this.filterForm.get('minScore')?.value;
        const maxScore = this.filterForm.get('maxScore')?.value;

        this.filteredExceptions = this.exceptions.filter(exception => {
            // Filter by status
            if (status && exception.status !== status) {
                return false;
            }

            // Filter by process ID
            if (processId) {
                const exceptionProcessId = exception.processId.includes('/')
                    ? exception.processId.split('/')[1]
                    : exception.processId;

                if (!exceptionProcessId.includes(processId)) {
                    return false;
                }
            }

            // Filter by file name
            if (fileName && !exception.fileName.toLowerCase().includes(fileName.toLowerCase())) {
                return false;
            }

            // Filter by comparison score
            if (minScore !== null && minScore !== '' && exception.comparisonScore < minScore) {
                return false;
            }
            if (maxScore !== null && maxScore !== '' && exception.comparisonScore > maxScore) {
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
            status: '',
            processId: this.processId || '',
            fileName: '',
            minScore: '',
            maxScore: ''
        });
        this.applyFilters();
    }

    /**
     * Resolve an exception
     * @param exception The exception to resolve
     */
    resolveException(exception: Exception): void {
        this.isLoading = true;
        const resolution = {
            status: 'Resolved',
            notes: 'Resolved by user',
            resolution: 'Accepted'
        };

        this.exceptionService.updateExceptionStatus(exception.id, resolution).subscribe({
            next: () => {
                this.isLoading = false;
                this.showNotification('Exception resolved successfully', 'success');

                // Refresh the exceptions list
                if (this.processId) {
                    this.fetchExceptionsByProcess(this.processId);
                } else {
                    this.fetchAllExceptions();
                }
            },
            error: (error) => {
                this.isLoading = false;
                console.error('Error resolving exception:', error);
                this.showNotification('Failed to resolve exception. Please try again.', 'error');
            }
        });
    }

    /**
     * Resolve all selected exceptions
     */
    resolveSelectedExceptions(): void {
        if (this.selection.isEmpty()) {
            this.showNotification('No exceptions selected', 'warning');
            return;
        }

        this.isLoading = true;
        const selectedExceptions = this.selection.selected;

        this.exceptionService.resolveMultipleExceptions(selectedExceptions).subscribe({
            next: (result: ResolveExceptionsResponse) => {
                this.isLoading = false;
                console.log('Resolve selected exceptions result:', result);

                const message = result.message ||
                    `Resolved ${result.resolvedCount} of ${result.totalExceptions} exceptions`;

                this.showNotification(message, 'success');

                // Clear selection
                this.selection.clear();

                // Refresh the exceptions list
                if (this.processId) {
                    this.fetchExceptionsByProcess(this.processId);
                } else {
                    this.fetchAllExceptions();
                }
            },
            error: (error) => {
                this.isLoading = false;
                console.error('Error resolving selected exceptions:', error);
                this.showNotification('Failed to resolve exceptions. Please try again.', 'error');
            }
        });
    }

    /**
     * Resolve all pending exceptions
     */
    resolveAllPendingExceptions(): void {
        const pendingExceptions = this.filteredExceptions.filter(e => e.status !== 'Resolved');

        if (pendingExceptions.length === 0) {
            this.showNotification('No pending exceptions to resolve', 'info');
            return;
        }

        this.isLoading = true;

        this.exceptionService.resolveMultipleExceptions(pendingExceptions).subscribe({
            next: (result: ResolveExceptionsResponse) => {
                this.isLoading = false;
                console.log('Resolve all pending exceptions result:', result);

                const message = result.message ||
                    `Resolved ${result.resolvedCount} of ${result.totalExceptions} exceptions`;

                this.showNotification(message, 'success');

                // Clear selection
                this.selection.clear();

                // Refresh the exceptions list
                if (this.processId) {
                    this.fetchExceptionsByProcess(this.processId);
                } else {
                    this.fetchAllExceptions();
                }
            },
            error: (error) => {
                this.isLoading = false;
                console.error('Error resolving all pending exceptions:', error);
                this.showNotification('Failed to resolve exceptions. Please try again.', 'error');
            }
        });
    }

    /** Whether the number of selected elements matches the total number of rows. */
    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const numRows = this.filteredExceptions.filter(e => e.status !== 'Resolved').length;
        return numSelected === numRows;
    }

    /** Selects all rows if they are not all selected; otherwise clear selection. */
    toggleAllRows() {
        if (this.isAllSelected()) {
            this.selection.clear();
            return;
        }

        // Select only unresolved exceptions
        this.selection.select(...this.filteredExceptions.filter(e => e.status !== 'Resolved'));
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

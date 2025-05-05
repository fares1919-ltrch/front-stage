import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DeduplicationService, Process, DeduplicationResponse, FileDetails } from '../../services/deduplication.service';
import { UploadService } from '../../services/upload.service';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MaterialModule } from 'src/app/material.module';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

interface ProcessStats {
    time: string;
    color: string;
    title?: string;
    subtext?: string;
    link?: string;
    processId?: string;
}

/**
 * Deduplication component for managing deduplication processes
 *
 * This component:
 * 1. Displays a list of all deduplication processes
 * 2. Can highlight a specific process when navigated to with a processId parameter
 * 3. Allows users to view details of each process
 */
@Component({
    selector: 'app-deduplication-component',
    imports: [CommonModule, NgApexchartsModule, MaterialModule, RouterModule, ReactiveFormsModule],
    templateUrl: './deduplication.component.html',
    styleUrls: ['./deduplication.component.scss'],
    standalone: true
})
export class deduplicationComponent implements OnInit {
    stats: ProcessStats[] = [];
    highlightedProcessId: string | null = null;
    highlightedProcess: Process | null = null;
    processFiles: FileDetails[] = [];
    processFilesWithPreviews: any[] = []; // Files with base64 previews
    isLoadingFiles: boolean = false;
    isLoadingPreviews: boolean = false;
    processIdForm: FormGroup;
    isProcessing: boolean = false;
    deduplicationResult: DeduplicationResponse | null = null;
    showAllProcesses: boolean = false;
    errorMessage: string | null = null;
    hasError: boolean = false;
    hasConflicts: boolean = false;
    conflictCount: number = 0;

    constructor(
        private deduplicationService: DeduplicationService,
        private uploadService: UploadService,
        private route: ActivatedRoute,
        private router: Router,
        private fb: FormBuilder,
        private snackBar: MatSnackBar
    ) {
        this.processIdForm = this.fb.group({
            processId: ['', [Validators.required, Validators.minLength(36), Validators.maxLength(36)]]
        });
    }

    ngOnInit(): void {
        // Check if we have a processId in the URL parameters
        this.route.queryParams.subscribe(params => {
            this.highlightedProcessId = params['processId'] || null;

            if (this.highlightedProcessId) {
                // If we have a process ID, fetch that specific process
                this.fetchProcessById(this.highlightedProcessId);
            } else {
                // Otherwise, fetch all processes
                this.showAllProcesses = true;
                this.fetchProcesses();
            }
        });
    }

    fetchProcessById(processId: string): void {
        this.isLoadingFiles = true;
        this.errorMessage = null;
        this.hasError = false;

        // Check if the processId is in the correct format
        // If it doesn't include a slash, add the 'processes/' prefix
        const formattedProcessId = processId.includes('/') ? processId : `processes/${processId}`;

        console.log(`Fetching process with ID: ${formattedProcessId}`);

        this.deduplicationService.getProcessDetails(formattedProcessId).subscribe({
            next: (process: Process) => {
                if (!process) {
                    console.error('Process data is null or undefined');
                    this.handleProcessError(processId, 'Process data is empty');
                    return;
                }

                this.highlightedProcess = process;
                this.errorMessage = null;
                this.hasError = false;

                // Extract the actual process ID from the full ID string (e.g., "processes/030f5974-fbcc-4c4e-a55b-b6a83e2234dc")
                const actualProcessId = process.id && process.id.includes('/') ? process.id.split('/')[1] : process.id;

                console.log(`Process loaded successfully. ID: ${process.id}, Actual ID: ${actualProcessId}`);

                // Create a single item for the stats array
                this.stats = [{
                    time: process.createdAt,
                    color: 'accent',
                    title: `Process ID: ${actualProcessId}`,
                    subtext: `Files Processed: ${process.totalFiles}`,
                    processId: actualProcessId
                }];

                // Fetch the files for this process
                this.fetchProcessFiles(formattedProcessId);
            },
            error: (error: any) => {
                console.error('Error fetching process:', error);
                this.handleProcessError(processId, error);
            }
        });
    }

    /**
     * Handle errors when fetching process details
     */
    private handleProcessError(processId: string, error: any): void {
        this.isLoadingFiles = false;

        // Use error message if available
        const errorMessage = error?.error?.message || error?.message || 'Unknown error';
        this.errorMessage = `Could not find process with ID: ${processId}. Error: ${errorMessage}`;
        this.hasError = true;

        // Try with the alternative format
        if (processId.includes('/')) {
            const altProcessId = processId.split('/')[1];
            console.log(`Trying alternative process ID format: ${altProcessId}`);

            this.deduplicationService.getProcessDetails(altProcessId).subscribe({
                next: (process: Process) => {
                    if (process) {
                        console.log(`Process found with alternative ID format: ${altProcessId}`);
                        this.highlightedProcess = process;
                        this.errorMessage = null;
                        this.hasError = false;

                        // Extract the actual process ID
                        const actualProcessId = process.id && process.id.includes('/') ? process.id.split('/')[1] : process.id;

                        // Create a single item for the stats array
                        this.stats = [{
                            time: process.createdAt,
                            color: 'accent',
                            title: `Process ID: ${actualProcessId}`,
                            subtext: `Files Processed: ${process.totalFiles}`,
                            processId: actualProcessId
                        }];

                        // Fetch the files for this process
                        this.fetchProcessFiles(altProcessId);
                    } else {
                        // If all attempts fail, show all processes
                        this.showAllProcesses = true;
                        this.fetchProcesses();
                    }
                },
                error: () => {
                    // If all attempts fail, show all processes
                    this.showAllProcesses = true;
                    this.fetchProcesses();
                }
            });
        } else {
            // If all attempts fail, show all processes
            this.showAllProcesses = true;
            this.fetchProcesses();
        }
    }

    fetchProcessFiles(processId: string): void {
        this.isLoadingFiles = true;
        this.processFiles = [];
        this.processFilesWithPreviews = [];

        console.log(`Fetching files for process ID: ${processId}`);

        this.deduplicationService.getProcessFiles(processId).subscribe({
            next: (files: FileDetails[]) => {
                console.log('Received files:', files);
                this.processFiles = files;
                this.errorMessage = null;
                this.hasError = false;

                // Check for files with conflict status
                const conflictFiles = files.filter(file => file.status === 'Conflict');
                this.hasConflicts = conflictFiles.length > 0;
                this.conflictCount = conflictFiles.length;

                if (this.hasConflicts) {
                    this.showNotification(`Found ${this.conflictCount} files with conflicts`, 'warning');
                }

                // Load image previews using the upload service
                this.loadImagePreviews(files);

                // Set loading to false after a short delay to ensure UI updates
                setTimeout(() => {
                    this.isLoadingFiles = false;
                }, 500);
            },
            error: (error: any) => {
                console.error('Error fetching process files:', error);
                this.isLoadingFiles = false;
                // Don't override the main error message if we already have one
                if (!this.errorMessage) {
                    this.errorMessage = `Could not load files for process ID: ${processId}. The process may not have any files yet.`;
                    this.hasError = true;
                    this.showNotification(this.errorMessage, 'error');
                }
                // Ensure we have empty arrays to prevent null reference errors
                this.processFiles = [];
                this.processFilesWithPreviews = [];
            }
        });
    }

    /**
     * Load image previews for files using the upload service
     */
    loadImagePreviews(files: FileDetails[]): void {
        if (files.length === 0) {
            this.processFilesWithPreviews = [];
            return;
        }

        console.log('Loading image previews for files:', files);

        // First, create basic previews from the base64String if available
        const extractedFiles = files.map(file => {
            // Check if the file already has base64 data
            let base64Preview = undefined;
            let previewStatus: 'pending' | 'success' | 'error' = 'pending';

            if (file.base64String && file.base64String.length > 0) {
                // Make sure it has the proper data URL prefix
                if (file.base64String.startsWith('data:image')) {
                    base64Preview = file.base64String;
                } else {
                    base64Preview = `data:image/jpeg;base64,${file.base64String}`;
                }
                previewStatus = 'success';
                console.log(`Created preview for file ${file.fileName} from base64String`);
            } else {
                console.log(`No base64String available for file ${file.fileName}`);
            }

            return {
                id: file.id,
                fileName: file.fileName,
                filePath: file.filePath,
                status: file.status,
                base64Preview: base64Preview,
                base64String: file.base64String,
                previewStatus: previewStatus,
                previewError: null
            };
        });

        // Set initial previews
        this.processFilesWithPreviews = [...extractedFiles];

        // Show loading indicator
        this.isLoadingPreviews = true;

        // Then try to load better previews using the upload service
        this.uploadService.loadImagePreviews(extractedFiles, files.length).subscribe({
            next: (filesWithPreviews) => {
                console.log('Received image previews:', filesWithPreviews);
                this.isLoadingPreviews = false;

                // Ensure we preserve any additional data from the original files
                const updatedFiles = filesWithPreviews.map(file => {
                    // Find the original file to get its data
                    const originalFile = extractedFiles.find(f => f.id === file.id);

                    // Determine preview status
                    let previewStatus: 'pending' | 'success' | 'error' = 'pending';
                    let previewError = null;

                    if (file.base64Preview && file.base64Preview.length > 0) {
                        previewStatus = 'success';
                    } else {
                        previewStatus = 'error';
                        previewError = 'Failed to load preview';
                    }

                    return {
                        ...file,
                        // Add any properties that might be missing in the preview
                        base64String: originalFile?.base64String || '',
                        filePath: originalFile?.filePath || file.filePath || '',
                        status: originalFile?.status || file.status || '',
                        previewStatus: previewStatus,
                        previewError: previewError
                    };
                });

                this.processFilesWithPreviews = updatedFiles;

                // Check if any previews failed to load
                const failedPreviews = updatedFiles.filter(f => f.previewStatus === 'error').length;
                if (failedPreviews > 0) {
                    this.showNotification(
                        `${failedPreviews} of ${updatedFiles.length} image previews failed to load. Showing placeholders instead.`,
                        'warning'
                    );
                }
            },
            error: (error) => {
                console.error('Error loading image previews:', error);
                this.isLoadingPreviews = false;

                // Update all files to show they had an error loading
                this.processFilesWithPreviews = extractedFiles.map(file => ({
                    ...file,
                    previewStatus: 'error',
                    previewError: 'Failed to load preview: ' + (error.message || 'Unknown error')
                }));

                this.showNotification(
                    'Failed to load image previews. Please check your connection and try again.',
                    'error'
                );
            }
        });
    }

    fetchProcesses(): void {
        this.isLoadingFiles = true;

        this.deduplicationService.getAllProcesses().subscribe({
            next: (processes: Process[]) => {
                if (processes && processes.length > 0) {
                    this.stats = processes.map((p) => {
                        // Extract the actual process ID from the full ID string
                        const actualProcessId = p.id && p.id.includes('/') ? p.id.split('/')[1] : p.id;

                        // Determine if this process should be highlighted
                        const isHighlighted = this.highlightedProcessId === actualProcessId;

                        return {
                            time: p.createdAt,
                            color: isHighlighted ? 'accent' : (p.processedFiles === 0 ? 'error' : 'primary'),
                            title: `Process ID: ${actualProcessId}`,
                            subtext: `Files Processed: ${p.totalFiles}`,
                            processId: actualProcessId
                        };
                    });

                    // If we have processes but no specific error, clear any error state
                    if (!this.hasError) {
                        this.errorMessage = null;
                    }
                } else {
                    // If we got an empty array, make sure stats is also empty
                    this.stats = [];

                    // Only set this message if we don't already have an error
                    if (!this.hasError) {
                        this.errorMessage = "No deduplication processes found. Upload a file to start a new process.";
                    }
                }

                this.isLoadingFiles = false;
            },
            error: (error: any) => {
                console.error('Error fetching processes:', error);
                this.isLoadingFiles = false;
                this.stats = []; // Ensure stats is empty on error

                // Only set this message if we don't already have an error
                if (!this.hasError) {
                    this.errorMessage = "Could not load deduplication processes. Please check your connection and try again.";
                    this.hasError = true;
                }
            }
        });
    }

    /**
     * Start deduplication for a specific process
     * @param processId The ID of the process to start deduplication for
     */
    startDeduplication(processId: string): void {
        // Check if there are conflicts that need to be resolved first
        if (this.hasConflicts && this.conflictCount > 0) {
            const confirmStart = confirm(`This process has ${this.conflictCount} unresolved conflicts. Do you want to proceed with deduplication anyway?`);
            if (!confirmStart) {
                this.showNotification('Deduplication cancelled. Please resolve conflicts first.', 'info');
                this.router.navigate(['/features/conflicts'], {
                    queryParams: { processId: processId }
                });
                return;
            }
        }

        this.isProcessing = true;
        this.deduplicationResult = null;
        this.errorMessage = null;
        this.hasError = false;

        this.showNotification('Starting deduplication process...', 'info');

        this.deduplicationService.startDeduplication(processId).subscribe({
            next: (response: DeduplicationResponse) => {
                console.log('Deduplication started:', response);
                this.deduplicationResult = response;
                this.isProcessing = false;
                this.errorMessage = null;
                this.hasError = false;

                if (response.success) {
                    this.showNotification('Deduplication started successfully!', 'success');
                } else {
                    this.showNotification(response.message || 'Deduplication started with warnings', 'warning');
                }

                // Refresh the process data
                if (this.highlightedProcessId) {
                    this.fetchProcessById(this.highlightedProcessId);
                } else {
                    this.fetchProcesses();
                }
            },
            error: (error: any) => {
                console.error('Error starting deduplication:', error);
                this.isProcessing = false;

                // Create a custom error response
                this.deduplicationResult = {
                    success: false,
                    message: error.error?.message || 'Failed to start deduplication. Please try again later.'
                };

                this.errorMessage = "Could not start deduplication process. The server may be unavailable.";
                this.hasError = true;
                this.showNotification(this.errorMessage, 'error');
            }
        });
    }

    // Method to handle form submission for process ID
    submitProcessId(): void {
        if (this.processIdForm.valid) {
            const processId = this.processIdForm.get('processId')?.value;
            if (processId) {
                // Reset error states
                this.errorMessage = null;
                this.hasError = false;
                this.deduplicationResult = null;

                // Navigate to the same component with the new process ID
                this.router.navigate([], {
                    relativeTo: this.route,
                    queryParams: { processId },
                    queryParamsHandling: 'merge'
                });
            }
        } else {
            // Show validation error if the form is invalid
            this.errorMessage = "Please enter a valid Process ID (36 characters).";
            this.hasError = true;
        }
    }

    /**
     * Navigate to the processes overview page
     */
    viewProcessesOverview(): void {
        this.router.navigate(['/features/processes']);
    }

    /**
     * Navigate to the conflicts page for the current process
     */
    goToConflicts(): void {
        if (this.highlightedProcessId) {
            this.router.navigate(['/features/conflicts'], {
                queryParams: { processId: this.highlightedProcessId }
            });
        } else {
            this.showNotification('No process selected', 'error');
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


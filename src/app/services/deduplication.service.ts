import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ConflictService } from './conflict.service';
import { DuplicateRecordService } from './duplicate-record.service';
import { FileService } from './file.service';

export interface Process {
    id: string;
    name: string;
    status: string;
    createdAt: string;
    username: string;
    totalFiles: number;
    processedFiles: number;
    processStartDate?: string;
    processEndDate?: string;
    completedAt?: string;
    startDate?: string;
    endDate?: string;
    cleanupDate?: string;
    cleanupUsername?: string;
    steps?: ProcessStep[];
    completionNotes?: string;
    currentStage?: string;
    duplicateRecordsCount?: number;
    exceptionsCount?: number;
    errorCount?: number;
    warningCount?: number;
    createdBy?: string;
    fileCount?: number;
}

export interface ProcessStep {
    id: string;
    name: string;
    processId: string;
    startDate: string;
    endDate?: string;
    status: string;
    processedFiles: string[];
    errorCount?: number;
    warningCount?: number;
    notes?: string;
    duration?: number;  // Duration in seconds
}

export interface DeduplicationResponse {
    success: boolean;
    message: string;
    processId?: string;
}

export interface DuplicateRecord {
    id: string;
    processId: string;
    originalFileId: string;
    originalFileName: string;
    detectedDate: string;
    status: string;
    confirmationUser?: string;
    confirmationDate?: string;
    notes?: string;
    duplicates: Duplicate[];
}

export interface Duplicate {
    fileId: string;
    fileName: string;
    confidence: number;
    personId?: string;
}

export interface FileDetails {
    id: string;
    fileName: string;
    filePath: string;
    base64String: string;
    status: string;
    createdAt: string;
    faceId?: string | null;
    processStartDate?: string | null;
    processStatus?: string;
    photodeduplique?: boolean;
    processId?: string;
}

@Injectable({
    providedIn: 'root', // Ensures this service is available globally
})
export class DeduplicationService {
    private apiUrl = environment.apiUrl;

    constructor(
        private http: HttpClient,
        private conflictService: ConflictService,
        private duplicateRecordService: DuplicateRecordService,
        private fileService: FileService
    ) {}

    /**
     * Get all deduplication processes
     */
    getAllProcesses(): Observable<Process[]> {
        return this.http.get<Process[]>(`${this.apiUrl}/Deduplication/processes`);
    }

    /**
     * Start deduplication for a specific process
     * @param processId The ID of the process to start deduplication for
     */
    startDeduplication(processId: string): Observable<DeduplicationResponse> {
        return this.http.post<DeduplicationResponse>(
            `${this.apiUrl}/Deduplication/process/${processId}`,
            {}
        );
    }

    /**
     * Get details for a specific process
     * @param processId The ID of the process to get details for
     */
    getProcessDetails(processId: string): Observable<Process> {
        // Clean the process ID to avoid double prefixes
        let cleanProcessId = processId;

        // If the ID has a prefix, extract just the ID part
        if (processId.includes('/')) {
            cleanProcessId = processId.split('/')[1];
        }

        console.log(`Fetching process details with clean ID: ${cleanProcessId}`);

        return this.http.get<Process>(`${this.apiUrl}/Deduplication/process/${cleanProcessId}`).pipe(
            catchError(error => {
                console.error(`Error fetching process details for ${cleanProcessId}:`, error);

                // If the error is a 404, try with the normalized ID (with prefix)
                if (error.status === 404) {
                    const normalizedId = this.normalizeProcessId(processId);
                    // Make sure we don't have a double prefix
                    const idPart = normalizedId.includes('/') ? normalizedId.split('/')[1] : normalizedId;
                    console.log(`Retrying with normalized ID part: ${idPart}`);
                    return this.http.get<Process>(`${this.apiUrl}/Deduplication/process/${idPart}`);
                }

                return throwError(() => new Error(`Failed to fetch process details: ${error.message}`));
            }),
            // Add additional information and ensure all fields are properly set
            map((process: Process) => {
                // Calculate duration for each step if not provided
                if (process.steps) {
                    process.steps.forEach((step: ProcessStep) => {
                        if (!step.duration && step.startDate && step.endDate) {
                            const start = new Date(step.startDate).getTime();
                            const end = new Date(step.endDate).getTime();
                            step.duration = Math.round((end - start) / 1000); // Duration in seconds
                        }
                    });
                }

                // Ensure all date fields are properly set for completed processes
                if (process.status === 'Completed') {
                    // If completedAt is null but processEndDate exists, use processEndDate
                    if (!process.completedAt && process.processEndDate) {
                        process.completedAt = process.processEndDate;
                    }

                    // If startDate is null but processStartDate exists, use processStartDate
                    if (!process.startDate && process.processStartDate) {
                        process.startDate = process.processStartDate;
                    }

                    // If endDate is null but processEndDate exists, use processEndDate
                    if (!process.endDate && process.processEndDate) {
                        process.endDate = process.processEndDate;
                    }

                    // If fileCount is 0 but totalFiles is set, use totalFiles
                    if ((!process.fileCount || process.fileCount === 0) && process.totalFiles > 0) {
                        process.fileCount = process.totalFiles;
                    }
                }

                return process;
            })
        );
    }

    /**
     * Get duplicate records for a specific process
     * @param processId The ID of the process to get duplicates for
     */
    getDuplicateRecords(processId: string): Observable<DuplicateRecord[]> {
        // Use the dedicated DuplicateRecordService
        return this.duplicateRecordService.getDuplicateRecordsByProcess(processId);
    }

    /**
     * Get file details for a specific file
     * @param fileId The ID of the file to get details for
     */
    getFileDetails(fileId: string): Observable<FileDetails> {
        // Use the dedicated FileService
        return this.fileService.getFile(fileId) as Observable<FileDetails>;
    }

    /**
     * Get all files for a specific process
     * @param processId The ID of the process to get files for
     */
    getProcessFiles(processId: string): Observable<FileDetails[]> {
        // Use the dedicated FileService
        return this.fileService.getFilesByProcess(processId) as Observable<FileDetails[]>;
    }

    /**
     * Normalize a duplicate record ID to ensure it works with the backend
     * @param duplicateId The ID of the duplicate record
     * @returns The normalized ID
     */
    private normalizeDuplicateId(duplicateId: string): string {
        // If the ID already has the prefix, return it as is
        if (duplicateId.startsWith('DuplicatedRecords/')) {
            return duplicateId;
        }

        // Otherwise, add the prefix
        return `DuplicatedRecords/${duplicateId}`;
    }

    /**
     * Normalize a process ID to ensure it works with the backend
     * @param processId The ID of the process
     * @returns The normalized ID
     */
    private normalizeProcessId(processId: string): string {
        if (!processId) return processId;

        // If the ID already has the prefix, return it as is
        if (processId.startsWith('processes/')) {
            return processId;
        }

        // If it has a different prefix, extract the ID part
        if (processId.includes('/')) {
            const idPart = processId.split('/')[1];
            return `processes/${idPart}`;
        }

        // Otherwise, add the prefix
        return `processes/${processId}`;
    }

    /**
     * Get a specific duplicate record by ID
     * @param duplicateId The ID of the duplicate record to retrieve
     */
    getDuplicateRecord(duplicateId: string): Observable<DuplicateRecord> {
        // Use the dedicated DuplicateRecordService
        return this.duplicateRecordService.getDuplicateRecord(duplicateId);
    }

    /**
     * Confirm a duplicate record
     * @param duplicateId The ID of the duplicate record to confirm
     * @param notes Optional notes about the confirmation
     */
    confirmDuplicate(duplicateId: string, notes?: string): Observable<any> {
        // Use the dedicated DuplicateRecordService
        return this.duplicateRecordService.confirmDuplicateRecord(duplicateId, notes);
    }

    /**
     * Reject a duplicate record
     * @param duplicateId The ID of the duplicate record to reject
     * @param notes Optional notes about the rejection
     */
    rejectDuplicate(duplicateId: string, notes?: string): Observable<any> {
        // Use the dedicated DuplicateRecordService
        return this.duplicateRecordService.rejectDuplicateRecord(duplicateId, notes);
    }

    /**
     * Clean up a process
     * @param processId The ID of the process to clean up
     */
    cleanupProcess(processId: string): Observable<any> {
        return this.http.post<any>(
            `${this.apiUrl}/Deduplication/cleanup/${processId}`,
            {}
        );
    }

    /**
     * Check if a process has conflicts
     * @param processId The ID of the process to check
     * @returns Observable with boolean indicating if conflicts exist
     */
    hasConflicts(processId: string): Observable<boolean> {
        return this.conflictService.hasConflicts(processId);
    }

    /**
     * Get conflicts for a specific process
     * @param processId The ID of the process to get conflicts for
     * @returns Observable with array of conflicts
     */
    getProcessConflicts(processId: string): Observable<any[]> {
        return this.conflictService.getConflictsByProcess(processId);
    }

    /**
     * Auto-resolve high-confidence conflicts for a process
     * @param processId The ID of the process to auto-resolve conflicts for
     * @param threshold Confidence threshold for auto-resolution (default: 0.95)
     * @returns Observable with summary of auto-resolved conflicts
     */
    autoResolveConflicts(processId: string, threshold: number = 0.95): Observable<any> {
        return this.conflictService.autoResolveConflicts(processId, threshold);
    }
}

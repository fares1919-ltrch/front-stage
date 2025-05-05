import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, map, catchError, throwError, of, forkJoin } from 'rxjs';
import { DeduplicationService, Process } from './deduplication.service';
import { ConflictService } from './conflict.service';
import { ExceptionService } from './exception.service';
import { FileService, FileModel } from './file.service';
import { environment } from '../../environments/environment';

export interface UploadResponse {
  success: boolean;
  processId?: string;
  message?: string;
  fileCount?: number;
  warning?: boolean;
  conflictId?: string;
  conflictCount?: number;
  extractedFiles?: ExtractedFile[];
  errorType?: string;
  exceptionId?: string;
}

export interface ExtractedFile {
  id: string;
  fileName: string;
  filePath?: string;
  thumbnailUrl?: string;
  base64Preview?: string;
  status?: string;
}



@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private deduplicationService: DeduplicationService,
    private conflictService: ConflictService,
    private exceptionService: ExceptionService,
    private fileService: FileService
  ) {}

  /**
   * Upload a tar.gz file to the backend
   * @param file The tar.gz file to upload
   * @returns Observable with upload progress and response
   */
  uploadTarGzFile(file: File): Observable<{ type: string; progress?: number; response?: UploadResponse }> {
    // Validate the file before uploading
    const validation = this.validateTarGzFile(file);
    if (!validation.isValid) {
      return throwError(() => new Error(validation.errorMessage || 'Invalid file'));
    }

    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<UploadResponse>(
      `${this.apiUrl}/Uploading/upload`,
      formData,
      {
        reportProgress: true,
        observe: 'events'
      }
    ).pipe(
      map((event: HttpEvent<any>) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            const progress = event.total ? Math.round(100 * event.loaded / event.total) : 0;
            return { type: 'progress', progress };

          case HttpEventType.Response:
            const response = event.body;

            if (response.success) {
              // Extract file count from the message if available
              const fileCountMatch = response.message?.match(/extracted (\d+) files/i);
              const fileCount = fileCountMatch ? parseInt(fileCountMatch[1]) : 0;

              // Add file count to the response
              response.fileCount = fileCount;

              // Check if there are conflicts
              if (response.warning && response.conflictId) {
                console.warn('Upload completed with conflicts:', response);
              }

              // If we have a process ID, fetch process details and file information
              if (response.processId) {
                // Fetch process details to get accurate file count
                this.fetchProcessDetails(response.processId).subscribe({
                  next: (process) => {
                    if (process) {
                      response.fileCount = process.totalFiles || 0;

                      // Fetch the extracted files for preview
                      this.getExtractedFiles(response.processId!).subscribe({
                        next: (files) => {
                          response.extractedFiles = files.map(file => ({
                            id: file.id,
                            fileName: file.fileName,
                            filePath: file.filePath,
                            status: file.status
                          }));

                          // Get preview images for the first few files (limit to 5 to avoid performance issues)
                          const previewLimit = Math.min(files.length, 5);
                          if (previewLimit > 0) {
                            const previewRequests = files.slice(0, previewLimit).map(file =>
                              this.getImagePreview(file.id)
                            );

                            forkJoin(previewRequests).subscribe({
                              next: (previews) => {
                                previews.forEach((preview, index) => {
                                  if (response.extractedFiles && response.extractedFiles[index]) {
                                    response.extractedFiles[index].base64Preview = preview;
                                  }
                                });
                              },
                              error: (error) => {
                                console.error('Error fetching image previews:', error);
                              }
                            });
                          }

                          // If there are conflicts, fetch conflict details
                          if (response.warning) {
                            this.conflictService.getConflictsByProcess(response.processId!).subscribe({
                              next: (conflicts) => {
                                console.log('Conflicts found:', conflicts);
                                // You could add these to the response if needed
                                // response.conflicts = conflicts;
                              },
                              error: (error) => {
                                console.error('Error fetching conflicts:', error);
                              }
                            });
                          }
                        },
                        error: (error) => {
                          console.error('Error fetching extracted files:', error);
                        }
                      });
                    }
                  },
                  error: (error) => {
                    console.error('Error fetching process details:', error);
                  }
                });
              }
            }

            return { type: 'complete', response };

          default:
            return { type: 'other' };
        }
      }),
      catchError(error => {
        console.error('Upload error:', error);

        // Check if we have a structured error response
        if (error.error && typeof error.error === 'object') {
          const errorResponse = error.error;

          // Create a more detailed error object with all available information
          const enhancedError = {
            message: errorResponse.message || 'Upload failed',
            errorType: errorResponse.errorType,
            processId: errorResponse.processId,
            exceptionId: errorResponse.exceptionId,
            status: error.status,
            statusText: error.statusText
          };

          // Log the enhanced error for debugging
          console.error('Enhanced error details:', enhancedError);

          // Return a structured error that can be handled by the UI
          return throwError(() => enhancedError);
        }

        // Fallback for unstructured errors
        return throwError(() => new Error(error.error?.message || 'Upload failed'));
      })
    );
  }

  /**
   * Fetch process details to get the file count and process status
   * @param processId The ID of the process to fetch details for
   */
  fetchProcessDetails(processId: string): Observable<Process> {
    return this.deduplicationService.getProcessDetails(processId).pipe(
      map(process => {
        // Log detailed process information for debugging
        console.log('Process details:', process);

        // Extract step information if available
        if (process.steps && process.steps.length > 0) {
          console.log('Process steps:', process.steps);

          // Calculate processed files count from steps
          const processedFileIds = new Set<string>();
          process.steps.forEach(step => {
            if (step.processedFiles) {
              step.processedFiles.forEach(fileId => processedFileIds.add(fileId));
            }
          });

          // Update the processed files count
          process.processedFiles = processedFileIds.size;
          console.log(`Processed ${process.processedFiles} out of ${process.totalFiles} files`);
        }

        return process;
      }),
      catchError(error => {
        console.error(`Error fetching process details for ${processId}:`, error);
        return throwError(() => new Error(`Failed to fetch process details: ${error.message}`));
      })
    );
  }

  /**
   * Clear the temporary files on the server
   */
  clearTempFiles(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/Uploading/clear-temp`, {});
  }

  /**
   * Check if a file is a tar.gz file
   * @param file The file to check
   */
  isTarGzFile(file: File): boolean {
    return file.name.endsWith('.tar.gz');
  }

  /**
   * Validate a tar.gz file before upload
   * @param file The file to validate
   * @returns An object with validation result and optional error message
   */
  validateTarGzFile(file: File): { isValid: boolean; errorMessage?: string } {
    // Check file extension
    if (!this.isTarGzFile(file)) {
      return {
        isValid: false,
        errorMessage: 'Invalid file format. Only tar.gz files are supported.'
      };
    }

    // Check file size (max 100MB as an example limit)
    const maxSizeInBytes = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSizeInBytes) {
      return {
        isValid: false,
        errorMessage: `File is too large. Maximum size is ${this.formatFileSize(maxSizeInBytes)}.`
      };
    }

    // Check if file is empty
    if (file.size === 0) {
      return {
        isValid: false,
        errorMessage: 'File is empty.'
      };
    }

    // Basic validation passed
    return { isValid: true };
  }

  /**
   * Format file size for display
   * @param bytes The file size in bytes
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get all extracted files for a specific process
   * @param processId The ID of the process to get files for
   * @returns Observable with array of file details
   */
  getExtractedFiles(processId: string): Observable<FileModel[]> {
    return this.fileService.getFilesByProcess(processId);
  }

  /**
   * Get a preview image for a specific file
   * @param fileId The ID of the file to get a preview for
   * @returns Observable with the Base64-encoded image data
   */
  getImagePreview(fileId: string): Observable<string> {
    return this.fileService.getImagePreview(fileId);
  }

  /**
   * Get a file preview (alias for getImagePreview for better semantics)
   * @param fileId The ID of the file to get a preview for
   * @returns Observable with the Base64-encoded image data
   */
  getFilePreview(fileId: string): Observable<string> {
    return this.getImagePreview(fileId);
  }

  /**
   * Get a full-size image for a specific file
   * @param fileId The ID of the file to get
   * @returns Observable with the Base64-encoded image data
   */
  getFullSizeImage(fileId: string): Observable<string> {
    return this.deduplicationService.getFileDetails(fileId).pipe(
      map(fileDetails => {
        if (fileDetails && fileDetails.base64String) {
          // Check if the base64String already has a data URL prefix
          if (fileDetails.base64String.startsWith('data:image')) {
            return fileDetails.base64String;
          } else {
            // Return the Base64 string with the appropriate data URL prefix
            return `data:image/jpeg;base64,${fileDetails.base64String}`;
          }
        }
        return '';
      }),
      catchError(error => {
        console.error(`Error fetching full-size image for file ${fileId}:`, error);
        return of('');
      })
    );
  }

  /**
   * Get all images for a specific process with previews
   * @param processId The ID of the process to get images for
   * @returns Observable with array of extracted files with previews
   */
  getProcessImagesWithPreviews(processId: string): Observable<ExtractedFile[]> {
    console.log(`Getting images with previews for process: ${processId}`);

    return this.getExtractedFiles(processId).pipe(
      map(files => {
        console.log(`Retrieved ${files.length} files for process ${processId}`, files);

        // First map the files to our ExtractedFile format
        const extractedFiles = files.map(file => ({
          id: file.id,
          fileName: file.fileName,
          filePath: file.filePath,
          status: file.status,
          base64Preview: '' // We'll load this separately
        }));

        // Return the files without previews initially
        return extractedFiles;
      }),
      catchError(error => {
        console.error(`Error fetching images for process ${processId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Load image previews for a list of extracted files
   * @param files Array of extracted files to load previews for
   * @param limit Maximum number of previews to load (default: 10)
   * @returns Observable with the updated array of extracted files including previews
   */
  loadImagePreviews(files: ExtractedFile[], limit: number = 10): Observable<ExtractedFile[]> {
    console.log(`Loading image previews for ${files.length} files, limit: ${limit}`);

    // Limit the number of previews to avoid performance issues
    const filesToPreview = files.slice(0, Math.min(files.length, limit));

    if (filesToPreview.length === 0) {
      console.log('No files to preview, returning original files');
      return of(files);
    }

    console.log(`Processing ${filesToPreview.length} files for preview`);

    // Create an array of observables for each file preview request
    const previewRequests = filesToPreview.map(file => {
      console.log(`Requesting preview for file: ${file.id}`);

      return this.fileService.getImagePreview(file.id).pipe(
        map(preview => {
          console.log(`Received preview for file ${file.id}, preview length: ${preview.length}`);

          return {
            ...file,
            base64Preview: preview
          };
        }),
        catchError(error => {
          console.error(`Error getting preview for file ${file.id}:`, error);
          return of(file); // Keep the original file if preview fails
        })
      );
    });

    // Combine all preview requests and update the files array
    return forkJoin(previewRequests).pipe(
      map(previewedFiles => {
        console.log(`Received ${previewedFiles.length} previewed files`);

        // Replace the first 'limit' files with their previewed versions
        const result = [...files];
        previewedFiles.forEach((file, index) => {
          result[index] = file;
        });

        return result;
      }),
      catchError(error => {
        console.error('Error loading image previews:', error);
        return of(files); // Return original files if preview loading fails
      })
    );
  }

  /**
   * Create a downloadable URL for an image
   * @param base64Data The Base64-encoded image data
   * @returns URL that can be used for downloading
   */
  createDownloadableUrl(base64Data: string): string {
    // Remove the data URL prefix if present
    const base64Content = base64Data.includes('base64,')
      ? base64Data.split('base64,')[1]
      : base64Data;

    // Create a Blob from the Base64 data
    const byteCharacters = atob(base64Content);
    const byteArrays: Uint8Array[] = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);

      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, { type: 'image/jpeg' });
    return URL.createObjectURL(blob);
  }



  /**
   * Get exception details for a file upload error
   * @param exceptionId The ID of the exception to retrieve
   * @returns Observable with the exception details
   */
  getUploadException(exceptionId: string): Observable<any> {
    // Use the injected ExceptionService to get exception details
    return this.exceptionService.getException(exceptionId);
  }

  /**
   * Handle upload errors based on error type
   * @param error The error object from the upload attempt
   * @returns A user-friendly error message
   */
  getUploadErrorMessage(error: any): string {
    // Default error message
    let message = 'An error occurred during file upload. Please try again.';

    // Check if we have a structured error
    if (error) {
      // Use the error message if available
      if (error.message) {
        message = error.message;
      }

      // Add more specific guidance based on error type
      if (error.errorType) {
        switch (error.errorType) {
          case 'InvalidArchiveFormat':
            message = 'The file you uploaded is not a valid tar.gz archive. Please check the file and try again.';
            break;

          case 'CorruptedArchive':
            message = 'The archive file appears to be corrupted. Please try creating a new archive and uploading again.';
            break;

          case 'ValidationError':
            message = 'The file failed validation. Please ensure it is a properly formatted tar.gz archive.';
            break;
        }
      }
    }

    return message;
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
   * Get files with conflict status for a process
   * @param processId The ID of the process to check
   * @returns Observable with array of files that have conflicts
   */
  getConflictFiles(processId: string): Observable<ExtractedFile[]> {
    return this.fileService.getFilesByProcess(processId).pipe(
      map(files => files.filter(file => file.status === 'Conflict').map(file => ({
        id: file.id,
        fileName: file.fileName,
        filePath: file.filePath,
        status: file.status,
        base64Preview: file.base64String?.startsWith('data:image')
          ? file.base64String
          : file.base64String ? `data:image/jpeg;base64,${file.base64String}` : ''
      }))),
      catchError(() => of([]))
    );
  }
}

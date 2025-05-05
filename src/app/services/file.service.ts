import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface FileModel {
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
  providedIn: 'root'
})
export class FileService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get a specific file by ID
   * @param fileId The ID of the file to retrieve
   * @returns Observable with the file details
   */
  getFile(fileId: string): Observable<FileModel> {
    // Clean the file ID to handle different formats
    let cleanFileId = fileId;

    // If the ID has a prefix, extract just the ID part
    if (fileId.startsWith('files/')) {
      cleanFileId = fileId;
    } else {
      // Add the files/ prefix if it's missing
      cleanFileId = `files/${fileId}`;
    }

    console.log(`Fetching file with ID: ${cleanFileId}`);

    // Create an array of possible endpoints to try in sequence
    const endpoints = [
      // First try the standard Uploading endpoint with the clean ID
      `${this.apiUrl}/Uploading/file/${cleanFileId}`,

      // Then try with the raw ID (without prefix)
      `${this.apiUrl}/Uploading/file/${cleanFileId.startsWith('files/') ? cleanFileId.substring('files/'.length) : cleanFileId}`,

      // Try the original ID format
      `${this.apiUrl}/Uploading/file/${fileId}`,

      // Try the Deduplication endpoint with the clean ID
      `${this.apiUrl}/Deduplication/file/${cleanFileId}`,

      // Try the Deduplication endpoint with the raw ID
      `${this.apiUrl}/Deduplication/file/${cleanFileId.startsWith('files/') ? cleanFileId.substring('files/'.length) : cleanFileId}`,

      // Try the Deduplication endpoint with the original ID
      `${this.apiUrl}/Deduplication/file/${fileId}`
    ];

    // Try each endpoint in sequence until one succeeds
    return this.tryEndpoints(endpoints, 0, fileId);
  }

  /**
   * Try multiple endpoints in sequence until one succeeds
   * @param endpoints Array of endpoint URLs to try
   * @param index Current index in the endpoints array
   * @param fileId Original file ID for error reporting
   * @returns Observable with the file details
   */
  private tryEndpoints(endpoints: string[], index: number, fileId: string): Observable<FileModel> {
    if (index >= endpoints.length) {
      // We've tried all endpoints and none worked
      return throwError(() => new Error(`Failed to fetch file ${fileId} after trying all available endpoints`));
    }

    const endpoint = endpoints[index];
    console.log(`Trying endpoint ${index + 1}/${endpoints.length}: ${endpoint}`);

    return this.http.get<FileModel>(endpoint).pipe(
      catchError(error => {
        console.error(`Endpoint ${index + 1}/${endpoints.length} failed:`, error);

        // If this endpoint failed, try the next one
        return this.tryEndpoints(endpoints, index + 1, fileId);
      })
    );
  }

  /**
   * Get all files for a specific process
   * @param processId The ID of the process to get files for
   * @returns Observable with array of files for the process
   */
  getFilesByProcess(processId: string): Observable<FileModel[]> {
    // Extract just the ID part without any prefix
    let cleanProcessId = processId;
    if (processId.includes('/')) {
      cleanProcessId = processId.split('/')[1];
    }

    console.log(`Fetching files for process with clean ID: ${cleanProcessId}`);

    // Use the correct endpoint for file retrieval
    return this.http.get<FileModel[]>(`${this.apiUrl}/Deduplication/process/${cleanProcessId}/files`).pipe(
      catchError(error => {
        console.error(`Error fetching files for process ${cleanProcessId}:`, error);

        // If the first attempt fails, try alternative endpoints
        if (error.status === 404) {
          // Try with the original ID as a fallback
          if (cleanProcessId !== processId) {
            console.log(`Trying with original ID: ${processId}`);
            return this.http.get<FileModel[]>(`${this.apiUrl}/Deduplication/process/${processId}/files`);
          }

          // Try with the Uploading endpoint as a last resort
          console.log(`Trying Uploading endpoint: /Uploading/files/process/${cleanProcessId}`);
          return this.http.get<FileModel[]>(`${this.apiUrl}/Uploading/files/process/${cleanProcessId}`);
        }

        return throwError(() => new Error(`Failed to fetch files for process: ${error.message}`));
      })
    );
  }

  /**
   * Get files by status
   * @param status The status to filter by (Uploaded, Inserted, Deleted, etc.)
   * @returns Observable with array of files with the specified status
   */
  getFilesByStatus(status: string): Observable<FileModel[]> {
    return this.http.get<FileModel[]>(`${this.apiUrl}/Uploading/files/status/${status}`).pipe(
      catchError(error => {
        console.error(`Error fetching files with status ${status}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Get files by process status
   * @param processStatus The process status to filter by (Pending, Processing, Completed, Failed, etc.)
   * @returns Observable with array of files with the specified process status
   */
  getFilesByProcessStatus(processStatus: string): Observable<FileModel[]> {
    return this.http.get<FileModel[]>(`${this.apiUrl}/Uploading/files/process-status/${processStatus}`).pipe(
      catchError(error => {
        console.error(`Error fetching files with process status ${processStatus}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Get a base64 image preview for a file
   * @param fileId The ID of the file to get a preview for
   * @returns Observable with the base64 image data
   */
  getImagePreview(fileId: string): Observable<string> {
    // Handle null or undefined fileId
    if (!fileId) {
      console.warn('Attempted to get image preview with null or undefined fileId');
      return of(''); // Return empty string instead of throwing an error
    }

    return this.getFile(fileId).pipe(
      map(file => {
        if (file && file.base64String) {
          // If the base64 string already has the data URL prefix, return it as is
          if (typeof file.base64String === 'string' && file.base64String.startsWith('data:image')) {
            return file.base64String;
          }

          // Otherwise, add the data URL prefix
          if (typeof file.base64String === 'string') {
            return `data:image/jpeg;base64,${file.base64String}`;
          }
        }

        // If we have a file but no base64String, log a warning
        if (file) {
          console.warn(`File ${fileId} found but has no valid base64String data`);
        }

        return '';
      }),
      catchError(error => {
        console.error(`Error getting image preview for file ${fileId}:`, error);

        // Return empty string for failed images
        return of('');
      }),
      // Add a timeout to prevent hanging requests
      timeout({
        each: 10000, // 10 seconds timeout for the request
        with: () => {
          console.warn(`Timeout getting image preview for file ${fileId}`);
          return of('');
        }
      })
    );
  }

  /**
   * Normalize a process ID to ensure it has the correct format
   * @param processId The ID to normalize
   * @returns The normalized ID
   */
  private normalizeProcessId(processId: string): string {
    if (!processId) return processId;

    // If it already has the prefix, return as is
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
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface DuplicateRecord {
  id: string;
  shortId?: string;
  processId: string;
  shortProcessId?: string;
  originalFileId: string;
  originalFileName: string;
  detectedDate: string;
  status: string;
  confirmationUser?: string;
  confirmationDate?: string;
  notes?: string;
  duplicates: DuplicateMatch[];
}

export interface DuplicateMatch {
  fileId: string;
  fileName: string;
  confidence: number;
  personId?: string;
}

export interface DuplicateAction {
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DuplicateRecordService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get all duplicate records in the system
   * @returns Observable with array of all duplicate records
   */
  getAllDuplicateRecords(): Observable<DuplicateRecord[]> {
    return this.http.get<any>(`${this.apiUrl}/DuplicateRecord`).pipe(
      map(response => {
        // Check if the response has a data property (API response format)
        if (response && response.data) {
          return response.data as DuplicateRecord[];
        }
        // If it's already an array, return it directly
        if (Array.isArray(response)) {
          return response as DuplicateRecord[];
        }
        // If we can't find the data, return an empty array
        console.warn('Unexpected response format from DuplicateRecord endpoint:', response);
        return [] as DuplicateRecord[];
      }),
      catchError(error => {
        console.error('Error fetching all duplicate records:', error);
        return of([]);
      })
    );
  }

  /**
   * Get a specific duplicate record by ID
   * @param duplicateId The ID of the duplicate record to retrieve
   * @returns Observable with the duplicate record
   */
  getDuplicateRecord(duplicateId: string): Observable<DuplicateRecord> {
    // Try all possible endpoint variations
    const endpoints = [
      // Standard endpoint
      `${this.apiUrl}/DuplicateRecord/${duplicateId}`,

      // With DuplicatedRecords/ prefix if not already present
      !duplicateId.startsWith('DuplicatedRecords/') ?
        `${this.apiUrl}/DuplicateRecord/DuplicatedRecords/${duplicateId}` : null,

      // Without DuplicatedRecords/ prefix if present
      duplicateId.startsWith('DuplicatedRecords/') ?
        `${this.apiUrl}/DuplicateRecord/${duplicateId.substring('DuplicatedRecords/'.length)}` : null,

      // Direct endpoint (no DuplicateRecord/ path segment)
      `${this.apiUrl}/${duplicateId}`,

      // Legacy endpoint
      `${this.apiUrl}/Deduplication/duplicate/${duplicateId}`
    ].filter(Boolean) as string[]; // Remove null values

    // Try each endpoint in sequence until one works
    return this.tryEndpoints(endpoints, duplicateId);
  }

  /**
   * Try multiple endpoints in sequence until one works
   * @param endpoints Array of endpoints to try
   * @param duplicateId The ID of the duplicate record (for logging)
   * @param index Current index in the endpoints array
   * @returns Observable with the duplicate record
   */
  private tryEndpoints(endpoints: string[], duplicateId: string, index: number = 0): Observable<DuplicateRecord> {
    // If we've tried all endpoints, return an error
    if (index >= endpoints.length) {
      console.error(`All endpoints failed for duplicate record ${duplicateId}`);
      return throwError(() => new Error(`Failed to fetch duplicate record: All endpoints failed`));
    }

    const endpoint = endpoints[index];
    console.log(`Trying endpoint ${index + 1}/${endpoints.length}: ${endpoint}`);

    return this.http.get<any>(endpoint).pipe(
      map(response => {
        // Handle different response formats
        if (response && response.data) {
          return response.data as DuplicateRecord;
        }
        return response as DuplicateRecord;
      }),
      catchError(error => {
        console.error(`Endpoint ${index + 1}/${endpoints.length} failed:`, error);
        // Try the next endpoint
        return this.tryEndpoints(endpoints, duplicateId, index + 1);
      })
    );
  }

  /**
   * Get all duplicate records for a specific process
   * @param processId The ID of the process to get duplicate records for
   * @returns Observable with array of duplicate records for the process
   */
  getDuplicateRecordsByProcess(processId: string): Observable<DuplicateRecord[]> {
    return this.http.get<any>(`${this.apiUrl}/DuplicateRecord/process/${processId}`).pipe(
      map(response => {
        // Check if the response has a data property (API response format)
        if (response && response.data) {
          return response.data as DuplicateRecord[];
        }
        // If it's already an array, return it directly
        if (Array.isArray(response)) {
          return response as DuplicateRecord[];
        }
        // If we can't find the data, return an empty array
        console.warn('Unexpected response format from DuplicateRecord/process endpoint:', response);
        return [] as DuplicateRecord[];
      }),
      catchError(error => {
        console.error(`Error fetching duplicate records for process ${processId}:`, error);

        // If the error is a 404, try with a normalized ID
        if (error.status === 404) {
          // Try with processes/ prefix
          if (!processId.startsWith('processes/')) {
            const normalizedId = `processes/${processId}`;
            console.log(`Retrying with normalized ID: ${normalizedId}`);
            return this.http.get<any>(`${this.apiUrl}/DuplicateRecord/process/${normalizedId}`).pipe(
              map(response => {
                if (response && response.data) {
                  return response.data as DuplicateRecord[];
                }
                if (Array.isArray(response)) {
                  return response as DuplicateRecord[];
                }
                return [] as DuplicateRecord[];
              })
            );
          }

          // Try without processes/ prefix
          if (processId.startsWith('processes/')) {
            const normalizedId = processId.substring('processes/'.length);
            console.log(`Retrying with normalized ID: ${normalizedId}`);
            return this.http.get<any>(`${this.apiUrl}/DuplicateRecord/process/${normalizedId}`).pipe(
              map(response => {
                if (response && response.data) {
                  return response.data as DuplicateRecord[];
                }
                if (Array.isArray(response)) {
                  return response as DuplicateRecord[];
                }
                return [] as DuplicateRecord[];
              })
            );
          }
        }

        // Fall back to the legacy endpoint if needed
        console.log(`Falling back to legacy endpoint: /Deduplication/duplicates/${processId}`);
        return this.http.get<any>(`${this.apiUrl}/Deduplication/duplicates/${processId}`).pipe(
          map(response => {
            if (response && response.data) {
              return response.data as DuplicateRecord[];
            }
            if (Array.isArray(response)) {
              return response as DuplicateRecord[];
            }
            return [] as DuplicateRecord[];
          })
        );
      })
    );
  }

  /**
   * Confirm a duplicate record
   * @param duplicateId The ID of the duplicate record to confirm
   * @param notes Optional notes about the confirmation
   * @returns Observable with the confirmed duplicate record
   */
  confirmDuplicateRecord(duplicateId: string, notes?: string): Observable<DuplicateRecord> {
    return this.http.post<DuplicateRecord>(
      `${this.apiUrl}/DuplicateRecord/${duplicateId}/confirm`,
      { notes }
    ).pipe(
      catchError(error => {
        console.error(`Error confirming duplicate record ${duplicateId}:`, error);

        // If the error is a 404, try with a normalized ID
        if (error.status === 404) {
          // Try with DuplicatedRecords/ prefix
          if (!duplicateId.startsWith('DuplicatedRecords/')) {
            const normalizedId = `DuplicatedRecords/${duplicateId}`;
            console.log(`Retrying with normalized ID: ${normalizedId}`);
            return this.confirmDuplicateRecord(normalizedId, notes);
          }

          // Try without DuplicatedRecords/ prefix
          if (duplicateId.startsWith('DuplicatedRecords/')) {
            const normalizedId = duplicateId.substring('DuplicatedRecords/'.length);
            console.log(`Retrying with normalized ID: ${normalizedId}`);
            return this.confirmDuplicateRecord(normalizedId, notes);
          }
        }

        // Fall back to the legacy endpoint if needed
        console.log(`Falling back to legacy endpoint: /Deduplication/confirm-duplicate/${duplicateId}`);
        return this.http.post<any>(
          `${this.apiUrl}/Deduplication/confirm-duplicate/${duplicateId}`,
          { notes }
        ).pipe(
          map(response => response as DuplicateRecord)
        );
      })
    );
  }

  /**
   * Reject a duplicate record
   * @param duplicateId The ID of the duplicate record to reject
   * @param notes Optional notes about the rejection
   * @returns Observable with the rejected duplicate record
   */
  rejectDuplicateRecord(duplicateId: string, notes?: string): Observable<DuplicateRecord> {
    return this.http.post<DuplicateRecord>(
      `${this.apiUrl}/DuplicateRecord/${duplicateId}/reject`,
      { notes }
    ).pipe(
      catchError(error => {
        console.error(`Error rejecting duplicate record ${duplicateId}:`, error);

        // If the error is a 404, try with a normalized ID
        if (error.status === 404) {
          // Try with DuplicatedRecords/ prefix
          if (!duplicateId.startsWith('DuplicatedRecords/')) {
            const normalizedId = `DuplicatedRecords/${duplicateId}`;
            console.log(`Retrying with normalized ID: ${normalizedId}`);
            return this.rejectDuplicateRecord(normalizedId, notes);
          }

          // Try without DuplicatedRecords/ prefix
          if (duplicateId.startsWith('DuplicatedRecords/')) {
            const normalizedId = duplicateId.substring('DuplicatedRecords/'.length);
            console.log(`Retrying with normalized ID: ${normalizedId}`);
            return this.rejectDuplicateRecord(normalizedId, notes);
          }
        }

        // Fall back to the legacy endpoint if needed
        console.log(`Falling back to legacy endpoint: /Deduplication/reject-duplicate/${duplicateId}`);
        return this.http.post<any>(
          `${this.apiUrl}/Deduplication/reject-duplicate/${duplicateId}`,
          { notes }
        ).pipe(
          map(response => response as DuplicateRecord)
        );
      })
    );
  }

  /**
   * Get duplicate records by status
   * @param status The status to filter by (Detected, Confirmed, Rejected)
   * @returns Observable with array of duplicate records with the specified status
   */
  getDuplicateRecordsByStatus(status: string): Observable<DuplicateRecord[]> {
    return this.http.get<any>(`${this.apiUrl}/DuplicateRecord/status/${status}`).pipe(
      map(response => {
        // Check if the response has a data property (API response format)
        if (response && response.data) {
          return response.data as DuplicateRecord[];
        }
        // If it's already an array, return it directly
        if (Array.isArray(response)) {
          return response as DuplicateRecord[];
        }
        // If we can't find the data, return an empty array
        console.warn('Unexpected response format from DuplicateRecord/status endpoint:', response);
        return [] as DuplicateRecord[];
      }),
      catchError(error => {
        console.error(`Error fetching duplicate records with status ${status}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Normalize a duplicate record ID to ensure it has the correct format
   * @param duplicateId The ID to normalize
   * @returns The normalized ID
   */
  normalizeDuplicateRecordId(duplicateId: string): string {
    if (!duplicateId) return duplicateId;

    // If it already has the prefix, return as is
    if (duplicateId.startsWith('DuplicatedRecords/')) {
      return duplicateId;
    }

    // Add the prefix
    return `DuplicatedRecords/${duplicateId}`;
  }
}

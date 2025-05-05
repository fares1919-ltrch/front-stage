import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of, forkJoin } from 'rxjs';
import { catchError, map, mergeMap, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Exception {
  id: string;
  processId: string;
  fileName: string;
  candidateFileNames: string[];
  comparisonScore: number;
  createdAt: string;
  updatedAt?: string;
  status: string;
  metadata?: Record<string, any>;
  shortId?: string;
  shortProcessId?: string;
}

export interface ExceptionStatusUpdate {
  status: string;
  notes?: string;
  resolution?: string;
}

export interface ResolveExceptionsResponse {
  success: boolean;
  message: string;
  totalExceptions: number;
  resolvedCount: number;
  remainingExceptions: number;
}

@Injectable({
  providedIn: 'root'
})
export class ExceptionService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get all exceptions in the system
   * @returns Observable with array of all exceptions
   */
  getAllExceptions(): Observable<Exception[]> {
    return this.http.get<any>(`${this.apiUrl}/Exception/all`).pipe(
      map(response => {
        // Check if the response has a data property (API response format)
        if (response && response.data) {
          return response.data as Exception[];
        }
        // If it's already an array, return it directly
        if (Array.isArray(response)) {
          return response as Exception[];
        }
        // If we can't find the data, return an empty array
        console.warn('Unexpected response format from Exception/all endpoint:', response);
        return [] as Exception[];
      }),
      catchError(error => {
        console.error('Error fetching all exceptions:', error);
        return of([]);
      })
    );
  }

  /**
   * Get a specific exception by ID
   * @param exceptionId The ID of the exception to retrieve
   * @returns Observable with the exception details
   */
  getException(exceptionId: string): Observable<Exception> {
    return this.http.get<Exception>(`${this.apiUrl}/Exception/${exceptionId}`).pipe(
      catchError(error => {
        console.error(`Error fetching exception ${exceptionId}:`, error);

        // If the error is a 404, try with a normalized ID
        if (error.status === 404) {
          // Try with Exceptions/ prefix
          if (!exceptionId.startsWith('Exceptions/')) {
            const normalizedId = `Exceptions/${exceptionId}`;
            console.log(`Retrying with normalized ID: ${normalizedId}`);
            return this.http.get<Exception>(`${this.apiUrl}/Exception/${normalizedId}`);
          }

          // Try without Exceptions/ prefix
          if (exceptionId.startsWith('Exceptions/')) {
            const normalizedId = exceptionId.substring('Exceptions/'.length);
            console.log(`Retrying with normalized ID: ${normalizedId}`);
            return this.http.get<Exception>(`${this.apiUrl}/Exception/${normalizedId}`);
          }
        }

        return throwError(() => new Error(`Failed to fetch exception: ${error.message}`));
      })
    );
  }

  /**
   * Get all exceptions for a specific process
   * @param processId The ID of the process to get exceptions for
   * @returns Observable with array of exceptions for the process
   */
  getExceptionsByProcess(processId: string): Observable<Exception[]> {
    return this.http.get<any>(`${this.apiUrl}/Exception/process/${processId}`).pipe(
      map(response => {
        // Check if the response has a data property (API response format)
        if (response && response.data) {
          return response.data as Exception[];
        }
        // If it's already an array, return it directly
        if (Array.isArray(response)) {
          return response as Exception[];
        }
        // If we can't find the data, return an empty array
        console.warn('Unexpected response format from Exception/process endpoint:', response);
        return [] as Exception[];
      }),
      catchError(error => {
        console.error(`Error fetching exceptions for process ${processId}:`, error);

        // If the error is a 404, try with a normalized ID
        if (error.status === 404) {
          // Try with processes/ prefix
          if (!processId.startsWith('processes/')) {
            const normalizedId = `processes/${processId}`;
            console.log(`Retrying with normalized ID: ${normalizedId}`);
            return this.http.get<any>(`${this.apiUrl}/Exception/process/${normalizedId}`).pipe(
              map(response => {
                if (response && response.data) {
                  return response.data as Exception[];
                }
                if (Array.isArray(response)) {
                  return response as Exception[];
                }
                return [] as Exception[];
              })
            );
          }

          // Try without processes/ prefix
          if (processId.startsWith('processes/')) {
            const normalizedId = processId.substring('processes/'.length);
            console.log(`Retrying with normalized ID: ${normalizedId}`);
            return this.http.get<any>(`${this.apiUrl}/Exception/process/${normalizedId}`).pipe(
              map(response => {
                if (response && response.data) {
                  return response.data as Exception[];
                }
                if (Array.isArray(response)) {
                  return response as Exception[];
                }
                return [] as Exception[];
              })
            );
          }
        }

        return of([]);
      })
    );
  }

  /**
   * Update the status of an exception
   * @param exceptionId The ID of the exception to update
   * @param status The new status for the exception
   * @returns Observable with the updated exception
   */
  updateExceptionStatus(exceptionId: string, statusUpdate: ExceptionStatusUpdate): Observable<Exception> {
    return this.http.put<any>(
      `${this.apiUrl}/Exception/status/${exceptionId}`,
      { status: statusUpdate.status }
    ).pipe(
      switchMap(response => {
        console.log('Update exception status response:', response);
        // Check if the response has a data property
        if (response && response.data) {
          return of(response.data as Exception);
        }
        // If the response is successful but doesn't have the expected format,
        // we'll need to fetch the exception again to get the updated data
        if (response && response.success) {
          return this.getException(exceptionId).pipe(
            catchError(() => {
              // If we can't fetch the updated exception, return a partial object
              return of({
                id: exceptionId,
                status: statusUpdate.status
              } as Exception);
            })
          );
        }
        // If we can't find the exception data, return a partial object
        console.warn('Unexpected response format from Exception/status endpoint:', response);
        return of({
          id: exceptionId,
          status: statusUpdate.status
        } as Exception);
      }),
      catchError(error => {
        console.error(`Error updating exception ${exceptionId} status:`, error);

        // If the error is a 404, try with a normalized ID
        if (error.status === 404) {
          // Try with Exceptions/ prefix
          if (!exceptionId.startsWith('Exceptions/')) {
            const normalizedId = `Exceptions/${exceptionId}`;
            console.log(`Retrying with normalized ID: ${normalizedId}`);
            return this.updateExceptionStatus(normalizedId, statusUpdate);
          }

          // Try without Exceptions/ prefix
          if (exceptionId.startsWith('Exceptions/')) {
            const normalizedId = exceptionId.substring('Exceptions/'.length);
            console.log(`Retrying with normalized ID: ${normalizedId}`);
            return this.updateExceptionStatus(normalizedId, statusUpdate);
          }
        }

        return throwError(() => new Error(`Failed to update exception status: ${error.message}`));
      })
    );
  }

  /**
   * Resolve an exception
   * @param exceptionId The ID of the exception to resolve
   * @param resolution Optional resolution details
   * @returns Observable with the resolved exception
   */
  resolveException(exceptionId: string, resolution?: string): Observable<Exception> {
    return this.updateExceptionStatus(exceptionId, {
      status: 'Resolved',
      resolution: resolution
    });
  }

  /**
   * Get exceptions with a comparison score above a threshold
   * @param threshold The minimum comparison score to filter by
   * @returns Observable with array of exceptions above the threshold
   */
  getExceptionsByThreshold(threshold: number): Observable<Exception[]> {
    return this.http.get<any>(`${this.apiUrl}/Exception/threshold/${threshold}`).pipe(
      map(response => {
        // Check if the response has a data property (API response format)
        if (response && response.data) {
          return response.data as Exception[];
        }
        // If it's already an array, return it directly
        if (Array.isArray(response)) {
          return response as Exception[];
        }
        // If we can't find the data, return an empty array
        console.warn('Unexpected response format from Exception/threshold endpoint:', response);
        return [] as Exception[];
      }),
      catchError(error => {
        console.error(`Error fetching exceptions with threshold ${threshold}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Resolve multiple exceptions at once
   * @param exceptions Array of exceptions to resolve
   * @returns Observable with summary of resolved exceptions
   */
  resolveMultipleExceptions(exceptions: Exception[]): Observable<ResolveExceptionsResponse> {
    // Filter only unresolved exceptions
    const unresolvedExceptions = exceptions.filter(e => e.status !== 'Resolved');

    if (unresolvedExceptions.length === 0) {
      return of({
        success: true,
        message: 'No unresolved exceptions to process',
        totalExceptions: exceptions.length,
        resolvedCount: 0,
        remainingExceptions: 0
      });
    }

    const totalToResolve = unresolvedExceptions.length;
    let resolvedCount = 0;

    // Process exceptions one by one
    return of(unresolvedExceptions).pipe(
      // Map each exception to an observable that resolves it
      map(exceptions => {
        return exceptions.map(exception => {
          return this.updateExceptionStatus(exception.id, { status: 'Resolved' }).pipe(
            map(result => {
              resolvedCount++;
              return result;
            }),
            catchError(error => {
              console.error(`Error resolving exception ${exception.id}:`, error);
              // Continue with other exceptions even if one fails
              return of(null);
            })
          );
        });
      }),
      // Convert array of observables to a single observable that completes when all are done
      mergeMap(observables => forkJoin(observables)),
      // Return a summary response
      map(() => {
        return {
          success: true,
          message: `Resolved ${resolvedCount} of ${totalToResolve} exceptions`,
          totalExceptions: exceptions.length,
          resolvedCount: resolvedCount,
          remainingExceptions: totalToResolve - resolvedCount
        } as ResolveExceptionsResponse;
      }),
      catchError(error => {
        console.error('Error resolving multiple exceptions:', error);
        return of({
          success: false,
          message: `Error: ${error.message}`,
          totalExceptions: exceptions.length,
          resolvedCount: resolvedCount,
          remainingExceptions: totalToResolve - resolvedCount
        } as ResolveExceptionsResponse);
      })
    );
  }

  /**
   * Normalize an exception ID to ensure it has the correct format
   * @param exceptionId The ID to normalize
   * @returns The normalized ID
   */
  normalizeExceptionId(exceptionId: string): string {
    if (!exceptionId) return exceptionId;

    // If it already has the prefix, return as is
    if (exceptionId.startsWith('Exceptions/')) {
      return exceptionId;
    }

    // Add the prefix
    return `Exceptions/${exceptionId}`;
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of, forkJoin } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Conflict {
  id: string;
  processId: string;
  fileName: string;
  matchedFileName: string;
  confidence: number;
  status: string;
  createdAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
}

export interface ConflictResolution {
  resolution: string;
  resolvedBy: string;
}

export interface AutoResolveResponse {
  success: boolean;
  message: string;
  totalConflicts: number;
  autoResolvedCount: number;
  remainingConflicts: number;
}

@Injectable({
  providedIn: 'root'
})
export class ConflictService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get all conflicts in the system
   * @returns Observable with array of all conflicts
   */
  getAllConflicts(): Observable<Conflict[]> {
    return this.http.get<any>(`${this.apiUrl}/Conflict/all`).pipe(
      map(response => {
        // Check if the response has a data property (API response format)
        if (response && response.data) {
          return response.data as Conflict[];
        }
        // If it's already an array, return it directly
        if (Array.isArray(response)) {
          return response as Conflict[];
        }
        // If we can't find the data, return an empty array
        console.warn('Unexpected response format from Conflict/all endpoint:', response);
        return [] as Conflict[];
      }),
      catchError(error => {
        console.error('Error fetching all conflicts:', error);
        return of([]);
      })
    );
  }

  /**
   * Get a specific conflict by ID
   * @param conflictId The ID of the conflict to retrieve
   * @returns Observable with the conflict details
   */
  getConflict(conflictId: string): Observable<Conflict> {
    return this.http.get<Conflict>(`${this.apiUrl}/Conflict/${conflictId}`).pipe(
      catchError(error => {
        console.error(`Error fetching conflict ${conflictId}:`, error);

        // If the error is a 404, try with a normalized ID
        if (error.status === 404) {
          // Try with Conflicts/ prefix
          if (!conflictId.startsWith('Conflicts/')) {
            const normalizedId = `Conflicts/${conflictId}`;
            console.log(`Retrying with normalized ID: ${normalizedId}`);
            return this.http.get<Conflict>(`${this.apiUrl}/Conflict/${normalizedId}`);
          }

          // Try without Conflicts/ prefix
          if (conflictId.startsWith('Conflicts/')) {
            const normalizedId = conflictId.substring('Conflicts/'.length);
            console.log(`Retrying with normalized ID: ${normalizedId}`);
            return this.http.get<Conflict>(`${this.apiUrl}/Conflict/${normalizedId}`);
          }
        }

        return throwError(() => new Error(`Failed to fetch conflict: ${error.message}`));
      })
    );
  }

  /**
   * Get all conflicts for a specific process
   * @param processId The ID of the process to get conflicts for
   * @returns Observable with array of conflicts
   */
  getConflictsByProcess(processId: string): Observable<Conflict[]> {
    return this.http.get<any>(`${this.apiUrl}/Conflict/process/${processId}`).pipe(
      map(response => {
        // Check if the response has a conflicts property (API response format)
        if (response && response.conflicts) {
          return response.conflicts as Conflict[];
        }
        // Check if the response has a data property (API response format)
        if (response && response.data) {
          return response.data as Conflict[];
        }
        // If it's already an array, return it directly
        if (Array.isArray(response)) {
          return response as Conflict[];
        }
        // If we can't find the data, return an empty array
        console.warn('Unexpected response format from Conflict/process endpoint:', response);
        return [] as Conflict[];
      }),
      catchError(error => {
        console.error(`Error fetching conflicts for process ${processId}:`, error);

        // If the error is a 404, try with a normalized ID
        if (error.status === 404) {
          // Try with processes/ prefix
          if (!processId.startsWith('processes/')) {
            const normalizedId = `processes/${processId}`;
            console.log(`Retrying with normalized ID: ${normalizedId}`);
            return this.http.get<any>(`${this.apiUrl}/Conflict/process/${normalizedId}`).pipe(
              map(response => {
                if (response && response.conflicts) {
                  return response.conflicts as Conflict[];
                }
                if (response && response.data) {
                  return response.data as Conflict[];
                }
                if (Array.isArray(response)) {
                  return response as Conflict[];
                }
                return [] as Conflict[];
              })
            );
          }

          // Try without processes/ prefix
          if (processId.startsWith('processes/')) {
            const normalizedId = processId.substring('processes/'.length);
            console.log(`Retrying with normalized ID: ${normalizedId}`);
            return this.http.get<any>(`${this.apiUrl}/Conflict/process/${normalizedId}`).pipe(
              map(response => {
                if (response && response.conflicts) {
                  return response.conflicts as Conflict[];
                }
                if (response && response.data) {
                  return response.data as Conflict[];
                }
                if (Array.isArray(response)) {
                  return response as Conflict[];
                }
                return [] as Conflict[];
              })
            );
          }
        }

        return of([]);
      })
    );
  }

  /**
   * Resolve a conflict
   * @param conflictId The ID of the conflict to resolve
   * @param resolution The resolution details (decision and who resolved it)
   * @returns Observable with the resolved conflict
   */
  resolveConflict(conflictId: string, resolution: ConflictResolution): Observable<Conflict> {
    // Strip the 'Conflicts/' prefix if it exists
    // The backend expects the raw ID in the URL
    const normalizedId = conflictId.startsWith('Conflicts/')
      ? conflictId.substring('Conflicts/'.length)
      : conflictId;

    console.log(`Resolving conflict with normalized ID: ${normalizedId}`);
    console.log('Resolution payload:', resolution);

    return this.http.post<any>(
      `${this.apiUrl}/Conflict/resolve/${normalizedId}`,
      resolution
    ).pipe(
      map(response => {
        console.log('Resolve conflict response:', response);
        // Check if the response has a conflict property
        if (response && response.conflict) {
          return response.conflict as Conflict;
        }
        // Check if the response has a data property
        if (response && response.data) {
          return response.data as Conflict;
        }
        // If we can't find the conflict data, return a default object
        console.warn('Unexpected response format from Conflict/resolve endpoint:', response);
        return {} as Conflict;
      }),
      catchError(error => {
        console.error(`Error resolving conflict ${conflictId}:`, error);
        return throwError(() => new Error(`Failed to resolve conflict: ${error.message}`));
      })
    );
  }

  /**
   * Auto-resolve high-confidence conflicts for a process
   * @param processId The ID of the process to auto-resolve conflicts for
   * @param threshold Confidence threshold for auto-resolution (default: 0.95)
   * @returns Observable with summary of auto-resolved conflicts
   */
  autoResolveConflicts(processId: string, threshold: number = 0.95): Observable<AutoResolveResponse> {
    // Let the backend handle the ID normalization
    // The backend controller already has logic to try different ID formats

    return this.http.post<any>(
      `${this.apiUrl}/Conflict/auto-resolve/${processId}?threshold=${threshold}`,
      {}
    ).pipe(
      map(response => {
        // If the response is already in the expected format, return it directly
        if (response && response.success !== undefined) {
          return response as AutoResolveResponse;
        }
        // If the response has a data property, return that
        if (response && response.data) {
          return response.data as AutoResolveResponse;
        }
        // If we can't find the expected data, return a default object
        console.warn('Unexpected response format from Conflict/auto-resolve endpoint:', response);
        return {
          success: true,
          message: 'Auto-resolution completed',
          totalConflicts: 0,
          autoResolvedCount: 0,
          remainingConflicts: 0
        } as AutoResolveResponse;
      }),
      catchError(error => {
        console.error(`Error auto-resolving conflicts for process ${processId}:`, error);
        return throwError(() => new Error(`Failed to auto-resolve conflicts: ${error.message}`));
      })
    );
  }

  /**
   * Check if a process has any conflicts
   * @param processId The ID of the process to check
   * @returns Observable with boolean indicating if conflicts exist
   */
  hasConflicts(processId: string): Observable<boolean> {
    return this.getConflictsByProcess(processId).pipe(
      map(conflicts => conflicts.length > 0),
      catchError(() => of(false))
    );
  }

  /**
   * Get the count of unresolved conflicts for a process
   * @param processId The ID of the process to check
   * @returns Observable with the count of unresolved conflicts
   */
  getUnresolvedConflictCount(processId: string): Observable<number> {
    return this.getConflictsByProcess(processId).pipe(
      map(conflicts => conflicts.filter(c => c.status === 'Unresolved').length),
      catchError(() => of(0))
    );
  }

  /**
   * Get the count of resolved conflicts for a process
   * @param processId The ID of the process to check
   * @returns Observable with the count of resolved conflicts
   */
  getResolvedConflictCount(processId: string): Observable<number> {
    return this.getConflictsByProcess(processId).pipe(
      map(conflicts => conflicts.filter(c => c.status === 'Resolved').length),
      catchError(() => of(0))
    );
  }

  /**
   * Auto-resolve all conflicts in the system
   * @param resolvedBy The email of the user resolving the conflicts
   * @param threshold Confidence threshold for auto-resolution (default: 0.95)
   * @returns Observable with summary of auto-resolved conflicts
   */
  autoResolveAllConflicts(resolvedBy: string, threshold: number = 0.95): Observable<AutoResolveResponse> {
    return this.http.post<any>(
      `${this.apiUrl}/Conflict/auto-resolve/all?threshold=${threshold}`,
      { resolvedBy }
    ).pipe(
      map(response => {
        // If the response is already in the expected format, return it directly
        if (response && response.success !== undefined) {
          return response as AutoResolveResponse;
        }
        // If the response has a data property, return that
        if (response && response.data) {
          return response.data as AutoResolveResponse;
        }
        // If we can't find the expected data, return a default object
        console.warn('Unexpected response format from Conflict/auto-resolve/all endpoint:', response);
        return {
          success: true,
          message: 'Auto-resolution completed',
          totalConflicts: 0,
          autoResolvedCount: 0,
          remainingConflicts: 0
        } as AutoResolveResponse;
      }),
      catchError(error => {
        console.error('Error auto-resolving all conflicts:', error);
        return throwError(() => new Error(`Failed to auto-resolve all conflicts: ${error.message}`));
      })
    );
  }

  /**
   * Resolve all conflicts one by one
   * @param conflicts Array of conflicts to resolve
   * @param resolution Resolution to apply to all conflicts
   * @param resolvedBy Email of the user resolving the conflicts
   * @returns Observable with summary of resolved conflicts
   */
  resolveAllConflicts(
    conflicts: Conflict[],
    resolution: string,
    resolvedBy: string
  ): Observable<AutoResolveResponse> {
    // Filter only unresolved conflicts
    const unresolvedConflicts = conflicts.filter(c => c.status !== 'Resolved');

    if (unresolvedConflicts.length === 0) {
      return of({
        success: true,
        message: 'No unresolved conflicts to process',
        totalConflicts: conflicts.length,
        autoResolvedCount: 0,
        remainingConflicts: 0
      });
    }

    // Create a counter for successful resolutions
    let resolvedCount = 0;
    let totalToResolve = unresolvedConflicts.length;

    // Create the resolution payload
    const resolutionPayload: ConflictResolution = {
      resolution: resolution,
      resolvedBy: resolvedBy
    };

    // Process conflicts one by one
    return of(unresolvedConflicts).pipe(
      // Process each conflict sequentially
      map(conflicts => {
        // Return an array of observables, one for each conflict resolution
        return conflicts.map(conflict => {
          return this.resolveConflict(conflict.id, resolutionPayload).pipe(
            map(result => {
              resolvedCount++;
              return result;
            }),
            catchError(error => {
              console.error(`Error resolving conflict ${conflict.id}:`, error);
              // Continue with other conflicts even if one fails
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
          message: `Resolved ${resolvedCount} of ${totalToResolve} conflicts`,
          totalConflicts: conflicts.length,
          autoResolvedCount: resolvedCount,
          remainingConflicts: totalToResolve - resolvedCount
        } as AutoResolveResponse;
      }),
      catchError(error => {
        console.error('Error resolving all conflicts:', error);
        return of({
          success: false,
          message: `Error: ${error.message}`,
          totalConflicts: conflicts.length,
          autoResolvedCount: resolvedCount,
          remainingConflicts: totalToResolve - resolvedCount
        } as AutoResolveResponse);
      })
    );
  }
}

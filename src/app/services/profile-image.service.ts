import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { catchError, map, tap } from 'rxjs/operators';
import { ProfileResponse } from './profile.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileImageService {
  private readonly STORAGE_KEY = 'profile_image';
  private apiUrl = environment.apiUrl;
  private cachedImageData: string | null = null;

  constructor(private http: HttpClient) {
    // Try to load cached image data from localStorage for faster initial rendering
    this.cachedImageData = localStorage.getItem(this.STORAGE_KEY);
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  saveProfileImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ProfileResponse>(
      `${this.apiUrl}/profile/upload-picture`,
      formData,
      {
        withCredentials: true
      }
    ).pipe(
      map(response => {
        if (response.profilePictureUrl) {
          // Cache the image data for faster access
          localStorage.setItem(this.STORAGE_KEY, response.profilePictureUrl);
          this.cachedImageData = response.profilePictureUrl;
          console.log('Profile image saved as base64 data');

          return response.profilePictureUrl;
        }
        // If the profile object contains the image
        else if (response.profile?.profilePicture) {
          // Cache the image data
          localStorage.setItem(this.STORAGE_KEY, response.profile.profilePicture);
          this.cachedImageData = response.profile.profilePicture;
          console.log('Profile image retrieved from profile data');

          return response.profile.profilePicture;
        }
        // If we have a different structure in the response, log it for debugging
        else {
          console.warn('Unexpected response structure:',
            Object.keys(response).filter(key => key !== 'profilePictureUrl' && key !== 'profile'));

          // Try to find any property that might contain the image
          for (const key of Object.keys(response)) {
            const value = (response as any)[key];
            if (typeof value === 'string' && (
                value.startsWith('data:image/') ||
                value.startsWith('/api/profile/images') ||
                value.includes('/profile/images')
              )) {
              console.log('Found potential image data in response property:', key);
              localStorage.setItem(this.STORAGE_KEY, value);
              this.cachedImageData = value;
              return value;
            }
          }

          throw new Error('No profile picture data returned from server');
        }
      }),
      catchError(error => {
        console.error('Error uploading profile picture:', error);
        throw error;
      })
    );
  }

  getProfileImage(): Observable<string | null> {
    // If we have a cached image data, return it immediately
    if (this.cachedImageData) {
      return of(this.cachedImageData);
    }

    // If no cached image data, return null and let the component handle loading
    // from the profile data instead
    return of(null);
  }

  updateCachedImageData(imageData: string | null): void {
    if (imageData) {
      localStorage.setItem(this.STORAGE_KEY, imageData);
      this.cachedImageData = imageData;
    } else {
      localStorage.removeItem(this.STORAGE_KEY);
      this.cachedImageData = null;
    }
  }

  deleteProfileImage(): Observable<void> {
    return this.http.delete<ProfileResponse>(`${this.apiUrl}/profile/picture`, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      tap(() => {
        // Clear cached image
        localStorage.removeItem(this.STORAGE_KEY);
        this.cachedImageData = null;
      }),
      map(() => void 0),
      catchError(error => {
        console.error('Error deleting profile picture:', error);
        throw error;
      })
    );
  }

  // Check if the string is a valid base64 image data URL
  isBase64Image(str: string): boolean {
    return Boolean(str && str.startsWith('data:image/') && str.includes(';base64,'));
  }
}

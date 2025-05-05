import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserProfile {
  userId: string;
  userName: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  dateOfBirth?: Date;
  profilePicture?: string;
  bio?: string;
  isValidated: boolean;
  role: string;
}

export interface ProfileResponse {
  success: boolean;
  message: string;
  profile?: UserProfile;
  profilePictureUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/profile/me`, {
      headers: this.getHeaders(),
      withCredentials: true
    });
  }

  updateProfile(profile: Partial<UserProfile>): Observable<ProfileResponse> {
    return this.http.put<ProfileResponse>(`${this.apiUrl}/profile/update`, profile, {
      headers: this.getHeaders(),
      withCredentials: true
    });
  }

  uploadProfilePicture(file: File): Observable<ProfileResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ProfileResponse>(
      `${this.apiUrl}/profile/upload-picture`,
      formData,
      {
        withCredentials: true
      }
    );
  }

  deleteProfilePicture(): Observable<ProfileResponse> {
    return this.http.delete<ProfileResponse>(`${this.apiUrl}/profile/picture`, {
      headers: this.getHeaders(),
      withCredentials: true
    });
  }
}

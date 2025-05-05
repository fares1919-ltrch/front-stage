import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export enum UserRole {
  User = 0,
  Admin = 1,
  SuperAdmin = 2
}

export interface UserDTO {
  userId: string;
  userName: string;
  email: string;
  role: UserRole;  // Numeric role value from the backend
  isValidated: boolean;
  phoneNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  dateOfBirth?: Date;
  profilePicture?: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
}

export interface RoleChangeResponse {
  message: string;
  user: {
    id: string;
    username: string;
    email: string;
    previousRole: string;
    newRole: string;
    notificationSent: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl + '/User'; // Backend API URL from environment

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  getAllUsers(): Observable<UserDTO[]> {
    return this.http.get<UserDTO[]>(`${this.apiUrl}/all`, {
      headers: this.getHeaders(),
      withCredentials: true
    });
  }

  confirmUser(userId: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/confirm/${userId}`, {}, {
      headers: this.getHeaders(),
      withCredentials: true
    });
  }

  deleteUser(userId: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/delete/${userId}`, {
      headers: this.getHeaders(),
      withCredentials: true
    });
  }

  promoteUser(userId: string): Observable<RoleChangeResponse> {
    return this.http.put<RoleChangeResponse>(`${this.apiUrl}/promote/${userId}`, {}, {
      headers: this.getHeaders(),
      withCredentials: true
    });
  }

  demoteUser(userId: string): Observable<RoleChangeResponse> {
    return this.http.put<RoleChangeResponse>(`${this.apiUrl}/demote/${userId}`, {}, {
      headers: this.getHeaders(),
      withCredentials: true
    });
  }

  // Check if notification was sent for role change
  wasNotificationSent(response: RoleChangeResponse): boolean {
    return response.user && response.user.notificationSent === true;
  }

  // Get role change details for display
  getRoleChangeDetails(response: RoleChangeResponse): string {
    if (!response.user) return response.message;

    return `${response.user.username} was ${response.user.previousRole === 'User' ? 'promoted' : 'demoted'}
            from ${response.user.previousRole} to ${response.user.newRole}.
            ${response.user.notificationSent ? 'A notification email was sent.' : 'No notification was sent.'}`;
  }

  // Helper method to convert numeric role to string
  getRoleString(role: UserRole): string {
    switch (role) {
      case UserRole.User:
        return 'User';
      case UserRole.Admin:
        return 'Admin';
      case UserRole.SuperAdmin:
        return 'SuperAdmin';
      default:
        return 'Unknown';
    }
  }
}

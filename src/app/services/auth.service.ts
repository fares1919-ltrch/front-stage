import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserProfile } from './profile.service';

export interface LoginResponse {
  token: string;
  user: UserProfile;
  redirectUrl: string;
}

export interface RegisterResponse {
  user: UserProfile;
  message: string;
  isFirstUser: boolean;
  isValidated: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private tokenSubject = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient) {
    // Check if we have a stored user and token in localStorage
    const storedUser = localStorage.getItem('currentUser');
    const storedToken = localStorage.getItem('token');
    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser));
    }
    if (storedToken) {
      this.tokenSubject.next(storedToken);
    }
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`,
      { email, password },
      { headers: this.getHeaders(), withCredentials: true }
    ).pipe(
      tap(response => {
        // Store the user and token in localStorage and the BehaviorSubjects
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        localStorage.setItem('token', response.token);
        this.currentUserSubject.next(response.user);
        this.tokenSubject.next(response.token);
      })
    );
  }

  loginWithUsername(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`,
      { username, password },
      { headers: this.getHeaders(), withCredentials: true }
    ).pipe(
      tap(response => {
        // Store the user and token in localStorage and the BehaviorSubjects
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        localStorage.setItem('token', response.token);
        this.currentUserSubject.next(response.user);
        this.tokenSubject.next(response.token);
      })
    );
  }

  googleLogin(idToken: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/google-login`,
      { idToken },
      { headers: this.getHeaders(), withCredentials: true }
    ).pipe(
      tap(response => {
        // Store the user and token in localStorage and the BehaviorSubjects
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        localStorage.setItem('token', response.token);
        this.currentUserSubject.next(response.user);
        this.tokenSubject.next(response.token);
      })
    );
  }

  register(username: string, email: string, password: string, confirmPassword: string): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/auth/register`,
      { Username: username, Email: email, Password: password, Confirmpassword: confirmPassword },
      { headers: this.getHeaders(), withCredentials: true }
    ).pipe(
      tap(response => {
        // If this is the first user (SuperAdmin) and is already validated, we can log them in automatically
        if (response.isFirstUser && response.isValidated && response.user) {
          // Store the user in localStorage and the BehaviorSubject
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
        }
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/logout`, {},
      { headers: this.getHeaders(), withCredentials: true }
    ).pipe(
      tap(() => {
        // Clear the user and token from localStorage and the BehaviorSubjects
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');
        this.currentUserSubject.next(null);
        this.tokenSubject.next(null);
      })
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/forgot-password`,
      { email },
      { headers: this.getHeaders(), withCredentials: true }
    );
  }

  // Get the current user from the BehaviorSubject
  getCurrentUser(): UserProfile | null {
    return this.currentUserSubject.value;
  }

  // Check if the user is authenticated
  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/reset-password`,
      { token, newPass: newPassword },
      { headers: this.getHeaders(), withCredentials: true }
    );
  }
  getToken(): string | null {
    return this.tokenSubject.value;
  }

  // Check if the registration response indicates this is the first user (SuperAdmin)
  isFirstUserRegistration(response: RegisterResponse): boolean {
    return response.isFirstUser === true;
  }

  // Check if the user is already validated (for first user)
  isUserValidated(response: RegisterResponse): boolean {
    return response.isValidated === true;
  }

  // Get a user-friendly message based on the registration response
  getRegistrationMessage(response: RegisterResponse): string {
    if (response.isFirstUser) {
      return 'Your account has been created as a Super Administrator with full system access. You can log in immediately.';
    } else {
      return 'Your account has been created. Please wait for an administrator to validate your account.';
    }
  }
}

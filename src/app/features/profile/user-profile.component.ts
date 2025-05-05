import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ProfileService, UserProfile } from '../../services/profile.service';
import { ProfileImageService } from '../../services/profile-image.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule
  ]
})
export class UserProfileComponent implements OnInit {
  profileForm: FormGroup;
  isEditing = false;
  previewUrl: string | null = null;
  defaultImageUrl = 'assets/images/profile/user-1.jpg';
  selectedFile: File | null = null;
  isLoading = false;
  isImageLoading = false; // Specific flag for image uploads
  userProfile: UserProfile | null = null;
  private apiUrl = environment.apiUrl;
  debugMode = false; // Set to true to show debug information

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    public profileImageService: ProfileImageService,
    private snackBar: MatSnackBar
  ) {
    this.profileForm = this.fb.group({
      userName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: [''],
      address: [''],
      city: [''],
      country: [''],
      dateOfBirth: [null]
    });

    // Make sure API URL is properly configured for relative URLs
    if (!this.apiUrl.endsWith('/')) {
      this.apiUrl += '/';
    }

    const apiBaseUrl = this.extractServerUrl(this.apiUrl);
    console.log('API URL configured as:', this.apiUrl);
    console.log('API base URL:', apiBaseUrl);
    console.log('Frontend base URL:', window.location.origin);

    // Check if API URL and frontend URL are different, which could cause CORS issues
    if (apiBaseUrl !== this.extractServerUrl(window.location.origin)) {
      console.warn('API base URL differs from frontend base URL - ensure CORS is properly configured');
    }
  }

  ngOnInit(): void {
    this.loadProfile();
    // Enable debug mode in development
    this.debugMode = !environment.production;
  }

  // Handle image loading errors
  handleImageError(event: any): void {
    console.error('Error loading profile image:', event);

    // Set to default image if loading fails
    event.target.src = this.defaultImageUrl;

    // Only log debugging info if we had a previewUrl that failed
    if (this.previewUrl) {
      // Log safely without revealing full base64 content
      if (this.profileImageService.isBase64Image(this.previewUrl)) {
        console.log('Failed image URL: [base64 data]');
      } else {
        console.log('Failed image URL:', this.previewUrl);
      }

      // Get the API base URL
      const apiBaseUrl = this.extractServerUrl(this.apiUrl);
      console.log('API base URL:', apiBaseUrl);

      // If the image is a base64 data URL but still failed, it could be corrupted
      if (this.profileImageService.isBase64Image(this.previewUrl)) {
        console.log('Base64 image data might be corrupted');
      }
      // Only try direct URL approach if it's not a base64 image
      else if (this.previewUrl.startsWith('http')) {
        try {
          // Parse the URL path
          const urlObj = new URL(this.previewUrl);
          const path = urlObj.pathname;

          // Create a direct URL to the image using API base + path
          const directUrl = `${apiBaseUrl}${path}`;

          console.log('Attempting with direct URL from API base:', directUrl);
          this.loadImageDirectly(directUrl);
        } catch (e) {
          console.error('Failed to parse URL:', this.previewUrl, e);
        }
      }
      // For relative URLs, try with the API base URL
      else if (this.previewUrl.startsWith('/')) {
        // Remove /api prefix if the API URL already has it
        const path = this.apiUrl.includes('/api') && this.previewUrl.startsWith('/api')
          ? this.previewUrl.replace(/^\/api/, '')
          : this.previewUrl;

        const directUrl = `${apiBaseUrl}${path}`;
        console.log('Attempting with API base + path:', directUrl);
        this.loadImageDirectly(directUrl);
      }
    }
  }

  // Try to load the image directly to check if it's accessible
  private loadImageDirectly(url: string): void {
    const img = new Image();
    img.onload = () => console.log('Image loaded successfully with direct URL');
    img.onerror = () => console.error('Failed to load image with direct URL');
    img.src = url;
  }

  // Helper method to ensure the image URL is fully qualified
  private getFullImageUrl(path: string): string {
    // If it's a base64 data URL, return it as is
    if (this.profileImageService.isBase64Image(path)) {
      return path;
    }

    // If the URL is already absolute (starts with http:// or https://), return it as is
    if (!path || path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    // Get the base URL of the backend API (not the frontend)
    const apiBaseUrl = this.extractServerUrl(this.apiUrl);

    // For API paths that start with /api
    if (path.startsWith('/api')) {
      // Remove the /api prefix if the API URL already includes it
      const apiPath = this.apiUrl.includes('/api') ? path.replace(/^\/api/, '') : path;

      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      return `${apiBaseUrl}${apiPath}?t=${timestamp}`;
    }

    // If the URL starts with a slash, it's relative to the domain root
    if (path.startsWith('/')) {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      return `${apiBaseUrl}${path}?t=${timestamp}`;
    }

    // Otherwise, it's relative to the API endpoint
    const timestamp = new Date().getTime();
    return `${this.apiUrl}${path}?t=${timestamp}`;
  }

  // Helper to extract just the server part of a URL (protocol + host + port)
  private extractServerUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}`;
    } catch (e) {
      console.error('Invalid URL:', url);
      return url;
    }
  }

  loadProfile(): void {
    this.isLoading = true;
    this.profileService.getProfile().subscribe({
      next: (profile: UserProfile) => {
        this.userProfile = profile;
        this.profileForm.patchValue({
          userName: profile.userName,
          email: profile.email,
          phoneNumber: profile.phoneNumber || '',
          address: profile.address || '',
          city: profile.city || '',
          country: profile.country || '',
          dateOfBirth: profile.dateOfBirth || null
        });

        // Set profile picture if available in profile data
        if (profile.profilePicture) {
          // Log safely without revealing full base64 content
          if (this.profileImageService.isBase64Image(profile.profilePicture)) {
            console.log('Profile picture from API: [base64 data]');
          } else {
            console.log('Profile picture from API:', profile.profilePicture);
          }

          // Try to load the image with our fallback mechanism
          this.loadProfileImage(profile.profilePicture).then(url => {
            if (url) {
              this.previewUrl = url;
              this.profileImageService.updateCachedImageData(url);
            } else {
              // If all attempts fail, use default image
              this.previewUrl = null;
              console.warn('All image loading attempts failed - using default image');
            }
          });
        } else {
          console.log('No profile picture received from API');
          this.previewUrl = null;
        }

        this.isLoading = false;
      },
      error: (error: Error) => {
        console.error('Error loading profile:', error);
        this.snackBar.open('Failed to load profile. Please try again.', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        this.isLoading = false;
      }
    });
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      // Validate file size and type first
      if (file.size > 5 * 1024 * 1024) {
        this.snackBar.open('File is too large. Maximum size is 5MB.', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        return;
      }

      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        this.snackBar.open('Invalid file type. Only JPEG, JPG and PNG files are allowed.', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        return;
      }

      // Show a preview of the image before uploading
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const result = e.target?.result as string;
        // Show a temporary preview
        this.previewUrl = result;
      };
      reader.readAsDataURL(file);

      // Set the selected file and start uploading
      this.selectedFile = file;
      this.isLoading = true;
      this.isImageLoading = true;

      this.profileImageService.saveProfileImage(file).subscribe({
        next: (imageUrl) => {
          // Log safely without revealing full base64 content
          if (this.profileImageService.isBase64Image(imageUrl)) {
            console.log('Image uploaded successfully, server returned: [base64 data]');
          } else {
            console.log('Image uploaded successfully, server returned:', imageUrl);
          }

          // Try to load the image with our fallback mechanism
          this.loadProfileImage(imageUrl).then(url => {
            if (url) {
              this.previewUrl = url;
              this.profileImageService.updateCachedImageData(url);
              this.snackBar.open('Profile picture updated successfully', 'Close', {
                duration: 3000
              });
            } else {
              // If all attempts fail, force reload the profile to get the latest image
              this.loadProfile();
              this.snackBar.open('Profile picture updated. Refreshing data...', 'Close', {
                duration: 3000
              });
            }
            this.isLoading = false;
            this.isImageLoading = false;
          });
        },
        error: (error) => {
          console.error('Error saving profile image:', error);
          this.snackBar.open('Failed to update profile picture: ' + (error.message || 'Unknown error'), 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.isLoading = false;
          this.isImageLoading = false;

          // Reload profile to ensure we have the correct image
          this.loadProfile();
        }
      });
    }
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      return;
    }

    this.isLoading = true;
    const formData = this.profileForm.value;

    // Only include fields that have changed
    const updatedFields: Partial<UserProfile> = {};

    Object.keys(formData).forEach(key => {
      const formValue = formData[key];
      const profileValue = this.userProfile ? (this.userProfile as any)[key] : null;

      // Only include changed fields to avoid overriding with empty values
      if (formValue !== profileValue && formValue !== '') {
        (updatedFields as any)[key] = formValue;
      }
    });

    this.profileService.updateProfile(updatedFields).subscribe({
      next: (response) => {
        this.snackBar.open('Profile updated successfully', 'Close', {
          duration: 3000
        });
        this.isEditing = false;
        this.loadProfile(); // Reload the profile data after successful update
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.snackBar.open('Failed to update profile', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        this.isLoading = false;
      }
    });
  }

  deleteProfilePicture(): void {
    this.isLoading = true;
    this.isImageLoading = true;
    this.profileImageService.deleteProfileImage().subscribe({
      next: () => {
        this.previewUrl = null;
        this.snackBar.open('Profile picture deleted successfully', 'Close', {
          duration: 3000
        });
        this.isLoading = false;
        this.isImageLoading = false;

        // Force reload of profile data to ensure synchronization
        this.loadProfile();
      },
      error: (error) => {
        console.error('Error deleting profile picture:', error);
        this.snackBar.open('Failed to delete profile picture', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        this.isLoading = false;
        this.isImageLoading = false;
      }
    });
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
  }

  // Check if an image exists at a URL
  private checkImageExists(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  // Load a profile image with fallbacks
  private async loadProfileImage(path: string): Promise<string | null> {
    // Log safely without revealing full base64 content
    if (this.profileImageService.isBase64Image(path)) {
      console.log('Original profile image path: [base64 data]');
    } else {
      console.log('Original profile image path:', path);
    }

    // If it's a base64 data URL, use it directly
    if (this.profileImageService.isBase64Image(path)) {
      console.log('Using base64 image data');
      return path;
    }

    // Try different URL constructions
    const apiBaseUrl = this.extractServerUrl(this.apiUrl);
    const apiPath = path.startsWith('/api') && this.apiUrl.includes('/api')
      ? path.replace(/^\/api/, '')
      : path;

    // Create alternative URLs to try
    const timestamp = new Date().getTime();
    const attempts = [
      // First try: full API URL + path (without /api prefix if already in apiUrl)
      `${this.apiUrl}${path.startsWith('/') ? path.substring(1) : path}?t=${timestamp}`,

      // Second try: API base URL + path
      `${apiBaseUrl}${path}?t=${timestamp}`,

      // Third try: API base URL + modified path (removed /api if needed)
      `${apiBaseUrl}${apiPath}?t=${timestamp}`,

      // Fourth try: Frontend URL + path (sometimes images are served through the Angular app)
      `${window.location.origin}${path.startsWith('/') ? path : '/' + path}?t=${timestamp}`
    ];

    // Log the attempts we'll make
    console.log('Will attempt to load image from these URLs:', attempts);

    // Try each URL until one works
    for (const url of attempts) {
      console.log('Trying URL:', url);
      const exists = await this.checkImageExists(url);
      if (exists) {
        console.log('Image found at URL:', url);
        return url;
      }
    }

    console.error('Could not load image from any attempted URL');
    return null;
  }

  // Helper method to safely display image URLs for debugging
  getSafeImageUrlForDisplay(url: string | null): string {
    if (!url) {
      return 'No URL';
    }

    if (this.profileImageService.isBase64Image(url)) {
      return '[base64 data]';
    }

    return url;
  }

  // Helper method to display user role in a user-friendly format
  getRoleDisplay(role: string | number): string {
    if (typeof role === 'string') {
      return role;
    }

    // Convert numeric role to string
    switch (role) {
      case 0:
        return 'User';
      case 1:
        return 'Admin';
      case 2:
        return 'SuperAdmin';
      default:
        return 'Unknown Role';
    }
  }

  // Helper method to get numeric role value for consistent comparison
  getRoleValue(role: string | number): number {
    if (typeof role === 'number') {
      return role;
    }

    // Convert string role to number
    switch (role) {
      case 'User':
        return 0;
      case 'Admin':
        return 1;
      case 'SuperAdmin':
        return 2;
      default:
        return -1; // Unknown role
    }
  }
}

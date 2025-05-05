import { Component, AfterViewInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthService } from 'src/app/services/auth.service';

declare var google: any; // Déclarer Google pour TypeScript

@Component({
  selector: 'app-side-login',
  standalone: true,
  imports: [RouterModule, MaterialModule, FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './side-login.component.html',
})
export class AppSideLoginComponent implements AfterViewInit {
  hidePassword = true;
  loginError = '';
  loginWithEmail = true; // Toggle between email and username login

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    username: new FormControl(''),
    password: new FormControl('', [Validators.required])
  });

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngAfterViewInit() {
    this.initializeGoogleSignIn();
  }

  // Initialiser le SDK Google Sign-In
  initializeGoogleSignIn() {
    google.accounts.id.initialize({
      client_id: '110137029112-8o191dgnivc0f3al16oo2jr90ptf3er2.apps.googleusercontent.com', // Remplacez par votre client ID
      callback: (response: any) => this.handleGoogleSignIn(response),
    });
  }

  // Méthode pour déclencher manuellement le flux de connexion Google
  onLoginGoogle() {
    google.accounts.id.prompt(); // Déclencher le flux de connexion Google
  }

  // Gérer la réponse de Google Sign-In
  handleGoogleSignIn(response: any) {
    const idToken = response.credential; // Récupérer le token Google

    this.authService.googleLogin(idToken).subscribe(
      (response: any) => {
        if (response.redirectUrl) {
          console.log('Google login successful, redirecting to:', response.redirectUrl);
          this.router.navigate([response.redirectUrl]);
        } else {
          alert(response.message || 'Unexpected server response');
        }
      },
      (error) => {
        console.error('Google login failed', error);
        this.loginError = 'Google login failed. Please try again.';
      }
    );
  }

  // Toggle between email and username login
  toggleLoginMethod() {
    this.loginWithEmail = !this.loginWithEmail;

    // Reset validation
    if (this.loginWithEmail) {
      this.loginForm.get('email')?.setValidators([Validators.required, Validators.email]);
      this.loginForm.get('username')?.clearValidators();
      this.loginForm.get('username')?.setValue('');
    } else {
      this.loginForm.get('email')?.clearValidators();
      this.loginForm.get('email')?.setValue('');
      this.loginForm.get('username')?.setValidators([Validators.required]);
    }

    // Update validation
    this.loginForm.get('email')?.updateValueAndValidity();
    this.loginForm.get('username')?.updateValueAndValidity();

    // Log form state for debugging
    console.log('Form valid:', this.loginForm.valid);
    console.log('Form errors:', this.loginForm.errors);
    console.log('Email errors:', this.loginForm.get('email')?.errors);
    console.log('Username errors:', this.loginForm.get('username')?.errors);
    console.log('Password errors:', this.loginForm.get('password')?.errors);
  }

  onLogin() {
    if (this.loginForm.invalid) {
      console.log('Form is invalid');
      return;
    }

    this.loginError = '';

    const password = this.loginForm.value.password || '';

    if (this.loginWithEmail) {
      const email = this.loginForm.value.email || '';
      this.authService.login(email, password).subscribe(
        (response: any) => {
          if (response.redirectUrl) {
            console.log('Login successful, redirecting to:', response.redirectUrl);
            this.router.navigate([response.redirectUrl]);
          } else {
            alert(response.message || 'Login successful');
          }
        },
        (error: HttpErrorResponse) => {
          console.error('Login failed', error);

          if (error.status === 401) {
            this.loginError = 'Invalid credentials. Please check your information.';
          } else if (error.error && error.error.message) {
            this.loginError = error.error.message;
          } else {
            this.loginError = 'Login failed. Please try again later.';
          }
        }
      );
    } else {
      const username = this.loginForm.value.username || '';
      this.authService.loginWithUsername(username, password).subscribe(
        (response: any) => {
          if (response.redirectUrl) {
            console.log('Login successful, redirecting to:', response.redirectUrl);
            this.router.navigate([response.redirectUrl]);
          } else {
            alert(response.message || 'Login successful');
          }
        },
        (error: HttpErrorResponse) => {
          console.error('Login failed', error);

          if (error.status === 401) {
            this.loginError = 'Invalid credentials. Please check your information.';
          } else if (error.error && error.error.message) {
            this.loginError = error.error.message;
          } else {
            this.loginError = 'Login failed. Please try again later.';
          }
        }
      );
    }
  }
}

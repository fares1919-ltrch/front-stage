import { Component, AfterViewInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http'; // Import HttpClient

declare var google: any; // Déclarer Google pour TypeScript

@Component({
  selector: 'app-side-reset',
  imports: [RouterModule, MaterialModule, FormsModule, ReactiveFormsModule],
  templateUrl: './side-reset.component.html',
})
export class AppSidegetEmailComponent implements AfterViewInit{
  email: string = '';

  constructor(private http: HttpClient, private router: Router) {}

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



  }


  onReset() {
    const resetData = {
      email: this.email,
    };

    this.http.post('https://localhost:7294/api/auth/forgot-password', resetData, { withCredentials: true })
    .subscribe(
      (response: any) => {
        console.log("data sent is", resetData)
        if (response.redirectUrl) {
          console.log(response.redirectUrl,"response")
        } else {
          alert(response.message);
        }
      },
      (error) => {
        alert('Login failed. Please check your credentials.');
      }
    );
  }
}

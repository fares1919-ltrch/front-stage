import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-side-register',
  standalone: true,
  imports: [RouterModule, MaterialModule, FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './side-register.component.html',
})
export class AppSideRegisterComponent {
  hidePassword = true;
  hideConfirmPassword = true;

  form = new FormGroup({
    username: new FormControl('', [Validators.required, Validators.minLength(6)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(8)]),
    confirmPassword: new FormControl('', [Validators.required]),
  }, { validators: this.passwordMatchValidator });

  constructor(private http: HttpClient, private router: Router) {}

  // Validation personnalisée pour vérifier que les mots de passe correspondent
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onRegister() {
    if (this.form.invalid) {
      alert('Veuillez remplir tous les champs correctement.');
      return;
    }

    const registerData = {
      username: this.form.value.username,
      email: this.form.value.email,
      password: this.form.value.password,
      confirmPassword : this.form.value.confirmPassword
    };

    console.log("Données envoyées :", registerData); // 🔍 Debugging

    this.http.post('https://localhost:7294/api/auth/register', registerData, {
      headers: { 'Content-Type': 'application/json' }, // 👈 Ajout du header JSON
      // withCredentials: true // Si tu gères l'authentification par cookie
    }).subscribe(
      (response: any) => {
        console.log("Réponse du serveur :", response); // 🔍 Debugging
        if (response.redirectUrl) {
          this.router.navigate([response.redirectUrl]);
        } else {
          alert(response.message || 'Inscription réussie.');
        }
      },
      (error) => {
        console.error('Échec de l\'inscription', error);
        alert('Échec de l\'inscription. Vérifiez vos informations.');
      }
    );
  }

  onLogin() {
    alert("Redirection vers la connexion...");
    this.router.navigate(['/login']);
  }
}

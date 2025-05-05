import { Router, ActivatedRoute } from '@angular/router'; // Ajout de ActivatedRoute
import { Component, AfterViewInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http'; // Import HttpClient

declare var google: any; // Déclarer Google pour TypeScript

@Component({
  selector: 'app-side-reset',
  imports: [RouterModule, MaterialModule, FormsModule, ReactiveFormsModule],
  templateUrl: './side-newPass.component.html',
})
export class AppSideNewPassComponent implements AfterViewInit {
  password: string = '';
  confirmPassword: string = '';
  message: string = ''; // Pour afficher les erreurs
  newPass: string = ''; // Déclaration de la variable newPass
  token: string | null = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InNpd2Fyc2FpZGFuaTlAZ21haWwuY29tIiwibmJmIjoxNzQyMzE2MzM0LCJleHAiOjE3NDIzMTcyMzQsImlhdCI6MTc0MjMxNjMzNH0.lYUlJjpdj1vSd_Z75uPwYlkWr6U_uC8g1jmUGFNh-F8'; // Déclaration du token

  constructor(private http: HttpClient, private router: Router, private route: ActivatedRoute) {}

  ngAfterViewInit() {
    // La méthode verifyPasswords() n'est plus appelée ici.
  }

  // Méthode pour déclencher manuellement le flux de connexion Google
  onLoginGoogle() {
    google.accounts.id.prompt(); // Déclencher le flux de connexion Google
  }

  // Fonction pour vérifier les mots de passe
  verifyPasswords() {
    if (this.password === this.confirmPassword) {
      this.newPass = this.password; // Si les mots de passe correspondent, on assigne à newPass
      return true;
    } else {
      this.message = "Passwords don't match!";
      console.log(this.message); // Afficher un message d'erreur si les mots de passe ne correspondent pas
      return false;
    }
  }

  // Fonction pour changer le mot de passe
  onChangePassword() {
    if (this.verifyPasswords()) {  // Vérification des mots de passe avant d'envoyer la requête
      const resetData = {
        token: this.token, // Utiliser le token statique
        newPass: this.newPass,
      };

      this.http.post('https://localhost:7294/api/auth/reset-password', resetData, { withCredentials: true })
        .subscribe(
          (response: any) => {
            console.log("Data sent is", resetData);
            if (response.redirectUrl) {
              console.log(response.redirectUrl, "Response");
            } else {
              alert(response.message);
            }
          },
          (error) => {
            alert('Reset password failed. Please try again.');
          }
        );
    } else {
      // message déjà défini dans verifyPasswords si les mots de passe ne correspondent pas
    }
  }
}

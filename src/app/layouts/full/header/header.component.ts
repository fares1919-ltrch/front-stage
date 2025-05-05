import { HttpClient } from '@angular/common/http'; // Import HttpClient
import { Component, Output, EventEmitter, Input, ViewEncapsulation } from '@angular/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { FormsModule } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-header',
  standalone: true, // Si vous utilisez Angular 14+ avec des composants autonomes
  imports: [
    RouterModule,
    CommonModule,
    NgScrollbarModule,
    TablerIconsModule,
    MaterialModule,
    FormsModule,
  ],
  templateUrl: './header.component.html',
  encapsulation: ViewEncapsulation.None,
  styles: [`
    .topbar {
      padding: 0 16px;
      background-color: white;
      border-bottom: 1px solid rgba(0,0,0,0.1);
      height: 64px;
    }

    .mat-toolbar {
      position: relative;
      z-index: 2;
    }
  `]
})
export class HeaderComponent {
  constructor(private http: HttpClient) {}

  onLogout() {
    this.http.post('https://localhost:7294/api/auth/logout', {}, { withCredentials: true })
      .subscribe(
        (response: any) => {
          if (response.message) {
            console.log("Déconnexion réussie", response.message);
            // Rediriger l'utilisateur vers la page de connexion
            window.location.href = '/authentication/login'; // Ou utilisez le routeur Angular
          } else {
            alert("Réponse inattendue du serveur");
          }
        },
        (error) => {
          console.error('Échec de la déconnexion', error);
          alert('Échec de la déconnexion. Veuillez réessayer.');
        }
      );
  }

  @Input() showToggle = true;
  @Input() toggleChecked = false;
  @Output() toggleMobileNav = new EventEmitter<void>();
}

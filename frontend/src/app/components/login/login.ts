import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SoundService } from '../../services/sound.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private http = inject(HttpClient);
  private router = inject(Router);
  public sound: SoundService = inject(SoundService);

  showPassword = false;

  credentials = {
    username: '',
    password: ''
  };

  toggleShowPassword() {
    this.sound.playClick();
    this.showPassword = !this.showPassword;
  }

  onLogin() {
    this.sound.playClick();
    this.http.post('http://localhost:3000/api/login', this.credentials).subscribe({
      next: (res: any) => {
        this.sound.playSuccess();
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.sound.playError();
        alert(err.error?.error || 'Nombre de usuario o contraseña incorrectos.');
      }
    });
  }
}
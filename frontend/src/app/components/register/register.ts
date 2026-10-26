import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SoundService } from '../../services/sound.service';

@Component({
  selector: 'app-register',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  private http = inject(HttpClient);
  private router = inject(Router);
  public sound: SoundService = inject(SoundService);

  showPassword = false;
  successMessage: string = '';
  errorMessage: string = '';
  isSubmitting: boolean = false;

  user = {
    fullname: '',
    username: '',
    email: '',
    password: ''
  };

  toggleShowPassword() {
    this.sound.playClick();
    this.showPassword = !this.showPassword;
  }

  onRegister() {
    if (this.isSubmitting) return;

    // Validación rápida local antes de enviar la petición
    if (!this.user.fullname.trim() || !this.user.username.trim() || !this.user.email.trim() || !this.user.password) {
      this.sound.playError();
      this.errorMessage = 'Todos los campos son obligatorios.';
      return;
    }

    this.sound.playClick();
    this.errorMessage = '';
    this.successMessage = '';
    this.isSubmitting = true;

    // Enviamos todas las variantes de nombres de variables para que el backend lo reciba sí o sí
    const payload = {
      fullname: this.user.fullname.trim(),
      fullName: this.user.fullname.trim(),
      username: this.user.username.trim(),
      email: this.user.email.trim(),
      password: this.user.password
    };

    this.http.post('http://localhost:3000/api/register', payload).subscribe({
      next: () => {
        this.sound.playSuccess();
        this.successMessage = '¡Registro exitoso! Tu cuenta ha sido creada. Ahora puedes iniciar sesión';
        
        // Espera 2 segundos y redirige a la página principal de inicio de sesión
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.sound.playError();
        this.isSubmitting = false;
        this.errorMessage = err.error?.error || 'Error al registrar el usuario. Revisa los datos e intenta de nuevo.';
      }
    });
  }
}
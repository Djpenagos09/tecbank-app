import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SoundService } from '../../services/sound.service';

@Component({
  selector: 'app-help',
  imports: [CommonModule, FormsModule],
  templateUrl: './help.html',
  styleUrl: './help.css'
})
export class HelpComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  public sound: SoundService = inject(SoundService);

  activeTab: 'faq' | 'ticket' | 'my-tickets' = 'faq';

  ticketData = {
    category: 'Transferencias',
    subject: '',
    description: ''
  };

  myTickets: any[] = [];
  successMessage: string = '';

  faqs = [
    { q: '¿Cómo inicio sesión?', a: 'Ingresa con tu nombre de usuario (seudónimo único) y tu contraseña registrada.' },
    { q: '¿Cómo recupero mi contraseña?', a: 'Usa la opción "¿Olvidaste tu contraseña?" en el Login para recibir un enlace a tu correo.' },
    { q: '¿Cómo realizo una transferencia?', a: 'Ingresa al Dashboard, presiona "Transferir Dinero por Seudónimo", busca el seudónimo del destinatario, confirma sus datos y monto, y presiona "Confirmar Envío".' },
    { q: '¿Cómo consultar mi saldo y movimientos?', a: 'En el Panel Principal verás tu saldo disponible actualizado y el historial de transacciones enviadas y recibidas.' }
  ];

  ngOnInit() {
    this.loadTickets();
  }

  getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  setTab(tab: 'faq' | 'ticket' | 'my-tickets') {
    this.sound.playClick();
    this.activeTab = tab;
    if (tab === 'my-tickets') {
      this.loadTickets();
    }
  }

  submitTicket() {
    this.sound.playClick();
    this.http.post('http://localhost:3000/api/tickets', this.ticketData, { headers: this.getHeaders() }).subscribe({
      next: (res: any) => {
        this.sound.playSuccess();
        this.successMessage = `Solicitud creada con éxito. Número de caso: ${res.ticketCode}`;
        this.ticketData = { category: 'Transferencias', subject: '', description: '' };
        this.loadTickets();
      },
      error: (err) => {
        this.sound.playError();
        alert(err.error?.error || 'Error al registrar la solicitud.');
      }
    });
  }

  loadTickets() {
    this.http.get('http://localhost:3000/api/tickets', { headers: this.getHeaders() }).subscribe({
      next: (data: any) => {
        this.myTickets = data;
      }
    });
  }

  backToDashboard() {
    this.sound.playClick();
    this.router.navigate(['/dashboard']);
  }
}
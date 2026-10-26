import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SoundService } from '../../services/sound.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  public sound: SoundService = inject(SoundService);

  user: any = null;
  transfersHistory: any[] = [];

  // Formulario Simulador de Transferencias
  targetAccount: string = '';
  transferAmount: number | null = null;
  transferConcept: string = '';

  // Estados del flujo
  foundRecipient: any = null;
  searchError: string = '';
  transferError: string = '';
  isSearching: boolean = false;
  isSubmitting: boolean = false;
  showConfirmModal: boolean = false;
  receiptModalData: any = null;
  selectedTxDetail: any = null;

  ngOnInit() {
    this.loadUserProfile();
    this.loadHistory();
  }

  getHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`
      })
    };
  }

  loadUserProfile() {
    this.http.get('http://localhost:3000/api/user/profile', this.getHeaders()).subscribe({
      next: (res: any) => {
        this.user = res;
      },
      error: () => {
        this.logout();
      }
    });
  }

  loadHistory() {
    this.http.get('http://localhost:3000/api/transfers/history', this.getHeaders()).subscribe({
      next: (res: any) => {
        this.transfersHistory = res;
      },
      error: (err) => console.error(err)
    });
  }

  // Permite ingresar únicamente números en el input de cuenta
  onlyNumbers(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      event.preventDefault();
    }
  }

  // Buscar destinatario por número de cuenta de 5 dígitos
  searchRecipient() {
    this.searchError = '';
    this.foundRecipient = null;
    this.transferError = '';

    const cleanAcc = this.targetAccount.trim();

    if (!cleanAcc) {
      this.searchError = 'Ingresa el número de cuenta de destino.';
      return;
    }

    if (!/^\d{5}$/.test(cleanAcc)) {
      this.searchError = 'El número de cuenta debe tener exactamente 5 dígitos.';
      return;
    }

    if (this.user && cleanAcc === this.user.accountNumber) {
      this.searchError = 'No puedes realizar transferencias a tu propia cuenta.';
      return;
    }

    this.isSearching = true;
    this.http.get(`http://localhost:3000/api/users/search-account/${cleanAcc}`, this.getHeaders()).subscribe({
      next: (res: any) => {
        this.isSearching = false;
        this.foundRecipient = res;
        this.sound.playClick();
      },
      error: (err) => {
        this.isSearching = false;
        this.searchError = err.error?.error || 'No encontramos una cuenta asociada a ese número.';
        this.sound.playError();
      }
    });
  }

  // Prepara el modal de confirmación antes de enviar dinero
  openConfirmation() {
    this.transferError = '';

    if (!this.foundRecipient) {
      this.transferError = 'Debes buscar y validar una cuenta de destino activa.';
      return;
    }

    if (!this.transferAmount || this.transferAmount <= 0) {
      this.transferError = 'El valor a transferir debe ser mayor a $0 COP.';
      return;
    }

    if (this.user && this.transferAmount > this.user.balance) {
      this.transferError = 'Saldo insuficiente para realizar esta transferencia.';
      return;
    }

    this.showConfirmModal = true;
    this.sound.playClick();
  }

  cancelTransfer() {
    this.showConfirmModal = false;
  }

  // Procesar la transferencia
  confirmAndSend() {
    if (this.isSubmitting) return; // Evita el doble clic accidental

    this.isSubmitting = true;
    const payload = {
      targetAccountNumber: this.foundRecipient.accountNumber,
      amount: this.transferAmount,
      concept: this.transferConcept.trim() || 'Transferencia entre cuentas TecBank'
    };

    this.http.post('http://localhost:3000/api/transfer', payload, this.getHeaders()).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.showConfirmModal = false;
        this.receiptModalData = res.receipt;
        this.sound.playSuccess();

        // Actualizar datos locales
        if (this.user) {
          this.user.balance = res.newBalance;
        }

        // Limpiar formulario
        this.targetAccount = '';
        this.transferAmount = null;
        this.transferConcept = '';
        this.foundRecipient = null;

        // Recargar historial inmediatamente
        this.loadHistory();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.showConfirmModal = false;
        this.transferError = err.error?.error || 'Error al procesar la transferencia.';
        this.sound.playError();
      }
    });
  }

  closeReceipt() {
    this.receiptModalData = null;
  }

  viewTxDetail(tx: any) {
    this.selectedTxDetail = tx;
  }

  closeTxDetail() {
    this.selectedTxDetail = null;
  }

  logout() {
    this.sound.playClick();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
}
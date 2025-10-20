import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  imports: [RouterModule]
})
export class SidebarComponent {
  sair() {
    // Aqui você pode adicionar lógica de logout, limpar token, redirecionar, etc.
    window.location.href = '/login';
  }
}

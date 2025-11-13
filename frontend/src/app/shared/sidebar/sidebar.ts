
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  imports: [RouterModule, CommonModule]
})
export class SidebarComponent {
  constructor(public auth: AuthService) {}
  sair() {
    this.auth.logout();
    window.location.href = '/';
  }
}

import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./funcionarios').then(m => m.Funcionarios)
  }
];

import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: '',
		loadChildren: () => import('./home/home-module').then(m => m.HomeModule)
	},
	{
		path: 'login',
		loadChildren: () => import('./login/login-module').then(m => m.LoginModule)
	},
	{
		path: 'cadastro',
		loadChildren: () => import('./cadastro/cadastro-module').then(m => m.CadastroModule)
	},
	{
		path: 'funcionarios',
		loadChildren: () => import('./funcionarios/funcionarios-module').then(m => m.FuncionariosModule)
	},
	{
		path: 'dispositivos',
		loadChildren: () => import('./dispositivos/dispositivos-module').then(m => m.DispositivosModule)
	},
	
	{
		path: 'dashboard',
		loadChildren: () => import('./dashboard/dashboard-module').then(m => m.DashboardModule)	
	},
	{
		path: 'producao',
		loadComponent: () => import('./producao/producao').then(m => m.ProducaoComponent)
	},
	{
		path: 'sobre',
		loadComponent: () => import('./sobre/sobre').then(m => m.SobreComponent)
	},
	{
		path: 'servicos',
		loadComponent: () => import('./servicos/servicos').then(m => m.ServicosComponent)
	},
	{
		path: 'relatorios',
		loadComponent: () => import('./relatorios/relatorios').then(m => m.RelatoriosComponent)
	},
	{
		path: 'display',
		loadComponent: () => import('./display/display').then(m => m.DisplayComponent)
	}
];

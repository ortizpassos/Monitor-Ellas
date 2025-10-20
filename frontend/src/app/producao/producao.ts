import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../shared/sidebar/sidebar';
import { SocketService } from '../services/socket.service';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { DispositivosService, Dispositivo } from '../services/dispositivos';
import { OperacoesService, Operacao } from '../services/operacoes';

type ProducaoItem = Dispositivo & { progresso: number; funcionario: string; grupo: string; meta: number; };

@Component({
  selector: 'app-producao',
  standalone: true,
  templateUrl: './producao.html',
  styleUrls: ['./producao.css'],
  imports: [CommonModule, FormsModule, SidebarComponent]
})
export class ProducaoComponent implements OnInit {
  producao: ProducaoItem[] = [];
  producaoFiltrada: ProducaoItem[] = [];
  
  // Filtros e ordenação
  filtroStatus: string = 'todos';
  ordenacao: string = 'nome';
  busca: string = '';
  
  // Estatísticas
  totalProducaoHoje: number = 0;
  dispositivosAtivos: number = 0;
  metaTotal: number = 0;
  percentualMeta: number = 0;

  // Operações
  operacoes: Operacao[] = [];

  // Modal Operação
  modalOperacaoAberto: boolean = false;
  operacaoEditando: Operacao | null = null;
  novaOperacao: any = {
    nome: '',
    metaDiaria: '',
    setor: '',
    descricao: ''
  };

  get producaoEmProducao(): ProducaoItem[] {
    return this.producao.filter(item => item.status === 'em_producao');
  }

  constructor(
    private dispositivosService: DispositivosService,
    private socketService: SocketService,
    private authService: AuthService,
    private router: Router,
    private operacoesService: OperacoesService
  ) {}

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.carregarDispositivos();
    this.configurarSocketListeners();
    this.carregarOperacoes();
  }

  carregarOperacoes() {
    this.operacoesService.listarOperacoes().subscribe({
      next: (ops) => {
        console.log('Operações recebidas do backend:', ops);
        this.operacoes = ops;
      },
      error: (err) => { console.error('Erro ao buscar operações', err); this.operacoes = []; }
    });
  }

  abrirModalOperacao() {
    this.modalOperacaoAberto = true;
    this.operacaoEditando = null;
    this.novaOperacao = { nome: '', metaDiaria: '', setor: '', descricao: '' };
  }

  fecharModalOperacao() {
    this.modalOperacaoAberto = false;
    this.operacaoEditando = null;
  }

  editarOperacao(operacao: Operacao) {
    this.operacaoEditando = operacao;
    this.novaOperacao = {
      nome: operacao.nome,
      metaDiaria: operacao.metaDiaria,
      setor: operacao.setor,
      descricao: operacao.descricao || ''
    };
    this.modalOperacaoAberto = true;
  }

  excluirOperacao(operacao: Operacao) {
    if (!confirm(`Deseja realmente excluir a operação "${operacao.nome}"?`)) {
      return;
    }
    this.operacoesService.excluirOperacao(operacao._id!).subscribe({
      next: () => {
        this.carregarOperacoes();
      },
      error: (err) => {
        alert('Erro ao excluir operação!');
        console.error(err);
      }
    });
  }

  cadastrarOperacao() {
    const op = {
      nome: this.novaOperacao.nome,
      metaDiaria: Number(this.novaOperacao.metaDiaria),
      setor: this.novaOperacao.setor,
      descricao: this.novaOperacao.descricao
    };

    if (this.operacaoEditando) {
      // Editar operação existente
      this.operacoesService.atualizarOperacao(this.operacaoEditando._id!, op).subscribe({
        next: () => {
          this.fecharModalOperacao();
          this.carregarOperacoes();
        },
        error: (err) => {
          alert('Erro ao atualizar operação!');
          console.error(err);
        }
      });
    } else {
      // Cadastrar nova operação
      this.operacoesService.cadastrarOperacao(op).subscribe({
        next: () => {
          this.fecharModalOperacao();
          this.carregarOperacoes();
        },
        error: (err) => {
          alert('Erro ao cadastrar operação!');
          console.error(err);
        }
      });
    }
  }

  carregarDispositivos() {
    this.dispositivosService.listarDispositivos().subscribe((data: Dispositivo[]) => {
      this.producao = data.map((d: Dispositivo) => ({
        ...d,
        funcionario: d.funcionarioLogado?.nome || '-',
        progresso: d.producaoAtual || 0,
        grupo: d.setor || '-',
        meta: d.metaDiaria || 0,
      }));
      this.calcularEstatisticas();
      this.aplicarFiltros();
    });
  }

  configurarSocketListeners() {
    this.socketService.onDeviceStatusUpdate().subscribe((updated: any) => {
      if (!updated || !updated._id) return;
      const idx = this.producao.findIndex(p => p._id === updated._id);
      if (idx !== -1) {
        this.producao[idx] = {
          ...this.producao[idx],
          progresso: updated.producaoAtual || 0,
          funcionario: updated.funcionarioLogado?.nome || '-',
          status: updated.status || this.producao[idx].status,
        };
        this.calcularEstatisticas();
        this.aplicarFiltros();
      }
    });
    
    this.socketService.onProductionUpdate?.().subscribe?.((payload: any) => {
      if (!payload?.dispositivo?._id) return;
      const idx = this.producao.findIndex(p => p._id === payload.dispositivo._id);
      if (idx !== -1) {
        this.producao[idx] = {
          ...this.producao[idx],
          progresso: payload.dispositivo.producaoAtual || 0,
          funcionario: payload.dispositivo.funcionarioLogado?.nome || '-',
        };
        this.calcularEstatisticas();
        this.aplicarFiltros();
      }
    });
  }

  calcularEstatisticas() {
    this.totalProducaoHoje = this.producao.reduce((acc, item) => acc + (item.progresso || 0), 0);
    this.dispositivosAtivos = this.producao.filter(item => item.status === 'em_producao').length;
    this.metaTotal = this.producao.reduce((acc, item) => acc + (item.meta || 0), 0);
    this.percentualMeta = this.metaTotal > 0 ? Math.round((this.totalProducaoHoje / this.metaTotal) * 100) : 0;
  }

  aplicarFiltros() {
    let resultado = [...this.producao];
    
    // Filtro por status
    if (this.filtroStatus !== 'todos') {
      resultado = resultado.filter(item => item.status === this.filtroStatus);
    }
    
    // Filtro por busca
    if (this.busca.trim()) {
      const buscaLower = this.busca.toLowerCase();
      resultado = resultado.filter(item => 
        item.nome?.toLowerCase().includes(buscaLower) ||
        item.funcionario?.toLowerCase().includes(buscaLower) ||
        item.grupo?.toLowerCase().includes(buscaLower)
      );
    }
    
    this.producaoFiltrada = resultado;
    this.aplicarOrdenacao();
  }

  aplicarOrdenacao() {
    switch (this.ordenacao) {
      case 'nome':
        this.producaoFiltrada.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        break;
      case 'producao':
        this.producaoFiltrada.sort((a, b) => (b.progresso || 0) - (a.progresso || 0));
        break;
      case 'progresso':
        this.producaoFiltrada.sort((a, b) => {
          const percA = this.calcularPercentual(a.progresso, a.meta);
          const percB = this.calcularPercentual(b.progresso, b.meta);
          return percB - percA;
        });
        break;
      case 'funcionario':
        this.producaoFiltrada.sort((a, b) => (a.funcionario || '').localeCompare(b.funcionario || ''));
        break;
    }
  }

  calcularPercentual(progresso: number, meta: number): number {
    if (!meta || meta === 0) return 0;
    return Math.min(Math.round((progresso / meta) * 100), 100);
  }

  formatarDataHora(data: string | Date | undefined): string {
    if (!data || data === '-') return '-';
    const dt = new Date(data);
    if (isNaN(dt.getTime())) return '-';
    const dia = dt.getDate().toString().padStart(2, '0');
    const mes = (dt.getMonth() + 1).toString().padStart(2, '0');
    const ano = dt.getFullYear().toString().slice(-2);
    const hora = dt.getHours().toString().padStart(2, '0');
    const min = dt.getMinutes().toString().padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  }
}

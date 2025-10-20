import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DispositivosService } from '../services/dispositivos';
import { SocketService } from '../services/socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-display',
  standalone: true,
  templateUrl: './display.html',
  styleUrls: ['./display.css'],
  imports: [CommonModule]
})
export class DisplayComponent implements OnInit, OnDestroy {
  dispositivos: any[] = [];
  dispositivosPaginados: any[] = [];
  dataHoraAtual: string = '';
  private subscriptions: Subscription[] = [];
  private intervalId: any;
  private paginacaoIntervalId: any;
  
  // Configurações de paginação
  itensPorPagina: number = 4;
  paginaAtual: number = 0;
  totalPaginas: number = 0;

  constructor(
    private dispositivosService: DispositivosService,
    private socketService: SocketService
  ) {}

  ngOnInit() {
    // Adicionar classe ao body para ocultar sidebar
    document.body.classList.add('display-page');
    
    this.carregarDispositivos();
    this.conectarSocket();
    this.atualizarDataHora();
    
    // Atualizar data/hora a cada segundo
    this.intervalId = setInterval(() => {
      this.atualizarDataHora();
    }, 1000);

    // Paginação automática a cada 30 segundos
    this.paginacaoIntervalId = setInterval(() => {
      this.proximaPagina();
    }, 30000);

    // Recarregar dispositivos a cada 5 minutos para sincronizar
    setInterval(() => {
      this.carregarDispositivos();
    }, 300000);
  }

  ngOnDestroy() {
    // Remover classe do body ao sair da página
    document.body.classList.remove('display-page');
    
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.paginacaoIntervalId) {
      clearInterval(this.paginacaoIntervalId);
    }
  }

  carregarDispositivos() {
    this.dispositivosService.listarDispositivos().subscribe({
      next: (dados: any) => {
        // Filtrar apenas dispositivos em produção
        const dispositivosEmProducao = dados.filter((d: any) => d.status === 'em_producao');
        
        this.dispositivos = dispositivosEmProducao.map((d: any) => ({
          ...d,
          funcionarioNome: d.funcionarioLogado?.nome || '-',
          operacaoNome: d.operacao?.nome || '-',
          operacaoMeta: d.operacao?.metaDiaria || 0,
          operacaoSetor: d.operacao?.setor || '-',
          statusClass: this.getStatusClass(d.status),
          statusTexto: this.getStatusTexto(d.status)
        }));
        
        console.log('Dispositivos em produção:', this.dispositivos);
        this.atualizarPaginacao();
      },
      error: (err: any) => {
        console.error('Erro ao carregar dispositivos:', err);
      }
    });
  }

  conectarSocket() {
    // Socket service já conecta automaticamente
    
    // Escutar atualizações de produção
    const prodSub = this.socketService.onProductionUpdate().subscribe(data => {
      console.log('Atualização de produção recebida:', data);
      
      // Apenas processar se o dispositivo está em produção
      if (data.dispositivo.status === 'em_producao') {
        const index = this.dispositivos.findIndex(d => d._id === data.dispositivo._id);
        
        if (index !== -1) {
          // Atualizar dispositivo existente
          this.dispositivos[index] = {
            ...this.dispositivos[index],
            producaoAtual: data.dispositivo.producaoAtual,
            funcionarioLogado: data.dispositivo.funcionarioLogado,
            funcionarioNome: data.dispositivo.funcionarioLogado?.nome || '-',
            operacao: data.dispositivo.operacao,
            operacaoNome: data.dispositivo.operacao?.nome || '-',
            operacaoMeta: data.dispositivo.operacao?.metaDiaria || 0,
            operacaoSetor: data.dispositivo.operacao?.setor || '-',
            status: data.dispositivo.status,
            statusClass: this.getStatusClass(data.dispositivo.status),
            statusTexto: this.getStatusTexto(data.dispositivo.status),
            ultimaAtualizacao: data.dispositivo.ultimaAtualizacao
          };
        } else {
          // Adicionar novo dispositivo que entrou em produção
          this.dispositivos.push({
            ...data.dispositivo,
            funcionarioNome: data.dispositivo.funcionarioLogado?.nome || '-',
            operacaoNome: data.dispositivo.operacao?.nome || '-',
            operacaoMeta: data.dispositivo.operacao?.metaDiaria || 0,
            operacaoSetor: data.dispositivo.operacao?.setor || '-',
            statusClass: this.getStatusClass(data.dispositivo.status),
            statusTexto: this.getStatusTexto(data.dispositivo.status)
          });
          this.atualizarPaginacao();
        }
        
        this.atualizarDispositivosPaginados();
      } else {
        // Remover dispositivo que saiu de produção
        const index = this.dispositivos.findIndex(d => d._id === data.dispositivo._id);
        if (index !== -1) {
          this.dispositivos.splice(index, 1);
          this.atualizarPaginacao();
        }
      }
    });
    
    // Escutar atualizações de status
    const statusSub = this.socketService.onDeviceStatusUpdate().subscribe(data => {
      console.log('Atualização de status recebida:', data);
      
      if (data.status === 'em_producao') {
        // Dispositivo entrou ou está em produção
        const index = this.dispositivos.findIndex(d => d._id === data._id);
        if (index !== -1) {
          // Atualizar sempre o nome do funcionário e dados
          this.dispositivos[index] = {
            ...this.dispositivos[index],
            status: data.status,
            statusClass: this.getStatusClass(data.status),
            statusTexto: this.getStatusTexto(data.status),
            funcionarioLogado: data.funcionarioLogado,
            funcionarioNome: data.funcionarioLogado?.nome || '-',
            operacao: data.operacao,
            operacaoNome: data.operacao?.nome || '-',
            operacaoMeta: data.operacao?.metaDiaria || 0,
            operacaoSetor: data.operacao?.setor || '-',
            ultimaAtualizacao: data.ultimaAtualizacao
          };
        } else {
          // Adicionar novo dispositivo que entrou em produção
          this.dispositivos.push({
            ...data,
            funcionarioNome: data.funcionarioLogado?.nome || '-',
            operacaoNome: data.operacao?.nome || '-',
            operacaoMeta: data.operacao?.metaDiaria || 0,
            operacaoSetor: data.operacao?.setor || '-',
            statusClass: this.getStatusClass(data.status),
            statusTexto: this.getStatusTexto(data.status)
          });
          this.atualizarPaginacao();
        }
        this.atualizarDispositivosPaginados();
      } else {
        // Dispositivo saiu de produção - remover da lista
        const index = this.dispositivos.findIndex(d => d._id === data._id);
        if (index !== -1) {
          this.dispositivos.splice(index, 1);
          this.atualizarPaginacao();
        }
      }
    });
    
    this.subscriptions.push(prodSub, statusSub);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'online':
        return 'status-online';
      case 'em_producao':
        return 'status-producao';
      case 'ocioso':
        return 'status-ocioso';
      case 'offline':
      default:
        return 'status-offline';
    }
  }

  getStatusTexto(status: string): string {
    switch (status) {
      case 'online':
        return 'Online';
      case 'em_producao':
        return 'Produzindo';
      case 'ocioso':
        return 'Ocioso';
      case 'offline':
      default:
        return 'Offline';
    }
  }

  atualizarDataHora() {
    const agora = new Date();
    const opcoes: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    this.dataHoraAtual = agora.toLocaleDateString('pt-BR', opcoes);
  }

  getTotalProducao(): number {
    return this.dispositivos.reduce((acc, d) => acc + (d.producaoAtual || 0), 0);
  }

  getDispositivosAtivos(): number {
    return this.dispositivos.filter(d => d.status === 'em_producao' || d.status === 'online').length;
  }

  calcularPorcentagem(producaoAtual: number, meta: number): number {
    if (!meta || meta === 0) return 0;
    return Math.min(Math.round((producaoAtual / meta) * 100), 100);
  }

  getCorBarra(porcentagem: number): string {
    if (porcentagem >= 80) return '#48bb78'; // Verde
    if (porcentagem >= 60) return '#ecc94b'; // Amarelo
    if (porcentagem >= 40) return '#ed8936'; // Laranja
    return '#e53e3e'; // Vermelho
  }

  // Métodos de paginação
  atualizarPaginacao() {
    this.totalPaginas = Math.ceil(this.dispositivos.length / this.itensPorPagina);
    
    // Se a página atual não existe mais, volta para a primeira
    if (this.paginaAtual >= this.totalPaginas && this.totalPaginas > 0) {
      this.paginaAtual = 0;
    }
    
    this.atualizarDispositivosPaginados();
  }

  atualizarDispositivosPaginados() {
    if (this.dispositivos.length === 0) {
      this.dispositivosPaginados = [];
      return;
    }

    const inicio = this.paginaAtual * this.itensPorPagina;
    let fim = inicio + this.itensPorPagina;
    
    // Pegar os itens da página atual
    let itensPagina = this.dispositivos.slice(inicio, fim);
    
    // Se tiver menos de 4 itens, completar com os primeiros da lista (efeito carrossel)
    if (itensPagina.length < this.itensPorPagina && this.dispositivos.length >= this.itensPorPagina) {
      const faltam = this.itensPorPagina - itensPagina.length;
      const complemento = this.dispositivos.slice(0, faltam);
      itensPagina = [...itensPagina, ...complemento];
    }
    
    this.dispositivosPaginados = itensPagina;
  }

  proximaPagina() {
    if (this.totalPaginas <= 1) return;
    
    this.paginaAtual = (this.paginaAtual + 1) % this.totalPaginas;
    this.atualizarDispositivosPaginados();
  }

  paginaAnterior() {
    if (this.totalPaginas <= 1) return;
    
    this.paginaAtual = this.paginaAtual === 0 ? this.totalPaginas - 1 : this.paginaAtual - 1;
    this.atualizarDispositivosPaginados();
  }

  irParaPagina(pagina: number) {
    if (pagina >= 0 && pagina < this.totalPaginas) {
      this.paginaAtual = pagina;
      this.atualizarDispositivosPaginados();
    }
  }
}

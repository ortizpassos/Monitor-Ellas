import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../shared/sidebar/sidebar';
import { RelatoriosService } from '../services/relatorios.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-relatorios',
  standalone: true,
  templateUrl: './relatorios.html',
  styleUrls: ['./relatorios.css'],
  imports: [CommonModule, FormsModule, SidebarComponent]
})
export class RelatoriosComponent implements OnInit {
  filtroDataInicio: string = '';
  filtroDataFim: string = '';
  filtroFuncionario: string = '';
  filtroOperacao: string = '';
  relatorios: any[] = [];
  totalFuncionario: number = 0;

  constructor(private relatoriosService: RelatoriosService) {}

  ngOnInit() {
    this.buscarRelatorios();
  }

  buscarRelatorios() {
    console.log('Buscando relatórios com filtros:', {
      dataInicio: this.filtroDataInicio,
      dataFim: this.filtroDataFim,
      funcionario: this.filtroFuncionario,
      operacao: this.filtroOperacao
    });
    
    this.relatoriosService.buscarRelatorios({
      dataInicio: this.filtroDataInicio,
      dataFim: this.filtroDataFim,
      funcionario: this.filtroFuncionario,
      operacao: this.filtroOperacao
    }).subscribe({
      next: (dados) => {
        console.log('Dados recebidos do backend:', dados);
        this.relatorios = dados.map(r => ({
          data: r.dia, // Data no formato YYYY-MM-DD
          funcionario: r.funcionario || '-',
          operacao: r.operacao || '-',
          producao: r.totalProducao || 0,
          tempo: this.formatarTempo(r.totalTempo || 0)
        }));
        console.log('Relatórios processados:', this.relatorios);
        // Calcula o total produzido no período
        if (this.relatorios.length > 0) {
          this.totalFuncionario = this.relatorios.reduce((acc, r) => acc + (r.producao || 0), 0);
        } else {
          this.totalFuncionario = 0;
        }
      },
      error: (err) => {
        console.error('Erro ao buscar relatórios:', err);
        this.relatorios = [];
        this.totalFuncionario = 0;
      }
    });
  }

  formatarTempo(segundos: number): string {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    return `${horas}h ${minutos}min`;
  }

  exportarPDF() {
    if (this.relatorios.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.setTextColor(13, 110, 253);
    doc.text('Relatório de Produção', 14, 20);
    
    // Informações do período
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    let yPos = 30;
    
    if (this.filtroDataInicio || this.filtroDataFim) {
      const periodo = `Período: ${this.filtroDataInicio ? new Date(this.filtroDataInicio).toLocaleDateString('pt-BR') : 'Início'} até ${this.filtroDataFim ? new Date(this.filtroDataFim).toLocaleDateString('pt-BR') : 'Hoje'}`;
      doc.text(periodo, 14, yPos);
      yPos += 6;
    }
    
    if (this.filtroFuncionario) {
      doc.text(`Funcionário: ${this.filtroFuncionario}`, 14, yPos);
      yPos += 6;
    }
    
    if (this.filtroOperacao) {
      doc.text(`Operação: ${this.filtroOperacao}`, 14, yPos);
      yPos += 6;
    }
    
    // Total produzido
    doc.setFontSize(12);
    doc.setTextColor(13, 110, 253);
    doc.text(`Total Produzido no Período: ${this.totalFuncionario}`, 14, yPos + 6);
    
    // Tabela
    autoTable(doc, {
      startY: yPos + 14,
      head: [['Data', 'Funcionário', 'Operação', 'Produção', 'Tempo']],
      body: this.relatorios.map(r => [
        new Date(r.data).toLocaleDateString('pt-BR'),
        r.funcionario,
        r.operacao,
        r.producao.toString(),
        r.tempo
      ]),
      headStyles: {
        fillColor: [13, 110, 253],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 40 },
        2: { cellWidth: 50 },
        3: { cellWidth: 25, halign: 'center', fontStyle: 'bold', textColor: [13, 110, 253] },
        4: { cellWidth: 30 }
      }
    });
    
    // Rodapé
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
        14,
        doc.internal.pageSize.height - 10
      );
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.width - 30,
        doc.internal.pageSize.height - 10
      );
    }
    
    // Salvar PDF
    const nomeArquivo = `relatorio-producao-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(nomeArquivo);
  }
}

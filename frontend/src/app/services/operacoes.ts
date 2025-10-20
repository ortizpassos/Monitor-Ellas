import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Operacao {
  _id?: string;
  nome: string;
  metaDiaria: number;
  setor: string;
  descricao?: string;
  ativo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class OperacoesService {
  private apiUrl = '/api/operacoes';

  constructor(private http: HttpClient) {}

  listarOperacoes(): Observable<Operacao[]> {
    return this.http.get<Operacao[]>(this.apiUrl);
  }

  cadastrarOperacao(operacao: Operacao): Observable<Operacao> {
    return this.http.post<Operacao>(this.apiUrl, operacao);
  }

  atualizarOperacao(id: string, operacao: Partial<Operacao>): Observable<Operacao> {
    return this.http.patch<Operacao>(`${this.apiUrl}/${id}`, operacao);
  }

  excluirOperacao(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}

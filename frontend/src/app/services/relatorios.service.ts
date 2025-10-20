import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RelatoriosService {
  private apiUrl = 'http://localhost:3001/api/relatorios';

  constructor(private http: HttpClient) {}

  buscarRelatorios(filtros: {
    dataInicio?: string;
    dataFim?: string;
    funcionario?: string;
    dispositivo?: string;
  }): Observable<any[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    let params = new HttpParams();
    if (filtros.dataInicio) params = params.set('dataInicio', filtros.dataInicio);
    if (filtros.dataFim) params = params.set('dataFim', filtros.dataFim);
    if (filtros.funcionario) params = params.set('funcionario', filtros.funcionario);
    if (filtros.dispositivo) params = params.set('dispositivo', filtros.dispositivo);
    return this.http.get<any[]>(this.apiUrl, { headers, params });
  }
}

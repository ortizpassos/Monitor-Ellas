
import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: any;
  private apiUrl = 'http://localhost:3001';

  constructor() {
  this.socket = io.default(this.apiUrl);
  }

  onDeviceStatusUpdate(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('deviceStatusUpdate', (data: any) => {
        observer.next(data);
      });
    });
  }

  onProductionUpdate(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('productionUpdate', (data: any) => {
        observer.next(data);
      });
    });
  }

  disconnect() {
    this.socket.disconnect();
  }
}

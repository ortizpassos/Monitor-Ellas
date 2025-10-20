import { Injectable } from '@angular/core';
import * as ioClient from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: SocketIOClient.Socket;

  constructor() {
    this.socket = ioClient.connect('http://localhost:3001');
  }

  onDeviceStatusUpdate(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('deviceStatusUpdate', (data: any) => {
        observer.next(data);
      });
      return () => this.socket.off('deviceStatusUpdate');
    });
  }

  onProductionUpdate(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('productionUpdate', (payload: any) => {
        observer.next(payload);
      });
      return () => this.socket.off('productionUpdate');
    });
  }
}

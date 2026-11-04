import { io, type Socket } from 'socket.io-client';
import { api } from './env';

export type { Socket };

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(api.socket || '/', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}

export function resetSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
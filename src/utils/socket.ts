import { io, type Socket } from 'socket.io-client';
import { getIdToken } from './api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export async function createSocket(): Promise<Socket> {
  const token = await getIdToken();
  return io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    withCredentials: true,
  });
}

export function disconnectSocket(socket: Socket): void {
  socket.removeAllListeners();
  socket.disconnect();
}

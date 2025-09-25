import { io, type Socket } from 'socket.io-client';
import { auth } from '../firebase';
import { type ClientToServerEvents, type ServerToClientEvents } from '../types/chat';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

function getSocketUrl(): string {
  const url = import.meta.env.VITE_SOCKET_URL as string | undefined;
  if (!url) {
    throw new Error('VITE_SOCKET_URL is not configured');
  }
  return url;
}

export async function ensureSocketConnected(): Promise<Socket<ServerToClientEvents, ClientToServerEvents>> {
  if (socket && socket.connected) return socket;

  const idToken = await auth.currentUser?.getIdToken();
  socket = io(getSocketUrl(), {
    transports: ['websocket'],
    auth: {
      token: idToken ?? null,
    },
    autoConnect: true,
  });

  return socket;
}

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}


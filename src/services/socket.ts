import { io, type Socket } from 'socket.io-client';
import { auth } from '../firebase';

let socketInstance: Socket | null = null;

async function fetchIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

export async function ensureSocketConnected(serverUrl: string): Promise<Socket> {
  if (socketInstance && socketInstance.connected) return socketInstance;

  const token = await fetchIdToken();
  socketInstance = io(serverUrl, {
    transports: ['websocket'],
    autoConnect: false,
    auth: token ? { token } : undefined,
  });

  return new Promise((resolve, reject) => {
    socketInstance!.once('connect', () => resolve(socketInstance!));
    socketInstance!.once('connect_error', (err) => reject(err));
    socketInstance!.connect();
  });
}

export function getSocket(): Socket | null {
  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }
}



import { io, type Socket } from 'socket.io-client';
import { getIdToken } from './api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

/**
 * CREATIONAL PATTERN - Factory Pattern
 * createSocket() function là một factory method tạo ra Socket instances
 * Đóng gói logic phức tạp khởi tạo connection với authentication
 */
export async function createSocket(): Promise<Socket> {
  const token = await getIdToken();
  return io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    withCredentials: true,
  });
}

/**
 * CREATIONAL PATTERN - Builder Pattern (socket configuration)
 * Cấu hình Socket sử dụng fluent interface với các options:
 * - auth: token authentication
 * - transports: protocol selection
 * - withCredentials: CORS settings
 */
export function disconnectSocket(socket: Socket): void {
  socket.removeAllListeners();
  socket.disconnect();
}

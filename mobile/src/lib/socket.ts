import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { BASE_SOCKET_URL } from './api';

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  const token = await SecureStore.getItemAsync('accessToken');
  if (socket?.connected) return socket;

  socket = io(BASE_SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

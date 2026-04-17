import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from '../auth/tokens';

let socket: Socket | null = null;

export const getChatSocket = (): Socket => {
  if (socket?.connected) return socket;
  const token = getAccessToken();
  if (!token) {
    throw new Error('Нет access-токена');
  }
  socket?.disconnect();
  socket = io(import.meta.env.VITE_SOCKET_URL, {
    transports: ['websocket'],
    auth: { token },
    autoConnect: true,
  });
  return socket;
};

export const reconnectChatSocket = (): Socket => {
  socket?.disconnect();
  socket = null;
  return getChatSocket();
};

export const disconnectChatSocket = () => {
  socket?.disconnect();
  socket = null;
};

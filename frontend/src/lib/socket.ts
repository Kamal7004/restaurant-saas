import { io, Socket } from 'socket.io-client';

const SOCKET_URL = '';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}

export function joinRestaurant(restaurantId: string) {
  const s = getSocket();
  s.emit('join_restaurant', restaurantId);
}

export function joinKitchen(restaurantId: string) {
  const s = getSocket();
  s.emit('join_kitchen', restaurantId);
}

export function joinTable(restaurantId: string, tableId: string) {
  const s = getSocket();
  s.emit('join_table', { restaurantId, tableId });
}

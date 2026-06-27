'use client';
import { useEffect } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';

export function useSocket() {
  const { addMessage, setTyping, fetchRooms } = useChatStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    const socket = connectSocket();

    socket.on('new_message', (message) => {
      addMessage(message);
    });

    socket.on('typing_indicator', ({ userId, roomId, isTyping }) => {
      setTyping(roomId, userId, isTyping);
    });

    socket.on('user_online', ({ userId }) => {
      fetchRooms();
    });

    socket.on('user_offline', ({ userId }) => {
      fetchRooms();
    });

    return () => {
      socket.off('new_message');
      socket.off('typing_indicator');
      socket.off('user_online');
      socket.off('user_offline');
      disconnectSocket();
    };
  }, [user]);
}

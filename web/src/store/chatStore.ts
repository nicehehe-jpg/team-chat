import { create } from 'zustand';
import api from '@/lib/api';

interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  type: string;
  created_at: string;
  sender: { id: string; name: string; avatar_url: string | null };
}

interface Room {
  id: string;
  type: string;
  name: string | null;
  last_message: { content: string; created_at: string; type: string } | null;
  unread_count: number;
  members: Array<{ id: string; name: string; avatar_url: string | null; status: string; last_read_at: string | null }>;
}

interface ChatState {
  rooms: Room[];
  activeRoomId: string | null;
  messages: Record<string, Message[]>;
  typingUsers: Record<string, string[]>;
  fetchRooms: () => Promise<void>;
  setActiveRoom: (roomId: string | null) => void;
  fetchMessages: (roomId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  setTyping: (roomId: string, userId: string, isTyping: boolean) => void;
  createDirectRoom: (targetUserId: string) => Promise<string>;
  createGroupRoom: (name: string, memberIds: string[]) => Promise<string>;
  updateReadStatus: (roomId: string, userId: string, readAt: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  rooms: [],
  activeRoomId: null,
  messages: {},
  typingUsers: {},

  fetchRooms: async () => {
    const { data } = await api.get('/rooms');
    set({ rooms: data });
  },

  setActiveRoom: (roomId) => set({ activeRoomId: roomId }),

  fetchMessages: async (roomId) => {
    const { data } = await api.get(`/rooms/${roomId}/messages`);
    set((state) => ({ messages: { ...state.messages, [roomId]: data } }));
  },

  addMessage: (message) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [message.room_id]: [...(state.messages[message.room_id] || []), message],
      },
      rooms: state.rooms.map((r) =>
        r.id === message.room_id
          ? {
              ...r,
              last_message: { content: message.content, created_at: message.created_at, type: message.type },
              unread_count: r.id === state.activeRoomId ? 0 : r.unread_count + 1,
            }
          : r
      ),
    }));
  },

  setTyping: (roomId, userId, isTyping) => {
    set((state) => {
      const current = state.typingUsers[roomId] || [];
      const updated = isTyping
        ? [...new Set([...current, userId])]
        : current.filter((id) => id !== userId);
      return { typingUsers: { ...state.typingUsers, [roomId]: updated } };
    });
  },

  createDirectRoom: async (targetUserId) => {
    const { data } = await api.post('/rooms/direct', { targetUserId });
    if (!data.existing) await get().fetchRooms();
    return data.id;
  },

  createGroupRoom: async (name, memberIds) => {
    const { data } = await api.post('/rooms/group', { name, memberIds });
    await get().fetchRooms();
    return data.id;
  },

  updateReadStatus: (roomId, userId, readAt) => {
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              members: r.members.map((m) =>
                m.id === userId ? { ...m, last_read_at: readAt } : m
              ),
            }
          : r
      ),
    }));
  },
}));

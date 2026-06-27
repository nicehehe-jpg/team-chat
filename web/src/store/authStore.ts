import { create } from 'zustand';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  status: string;
  status_message?: string | null;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  updateAvatar: (avatarUrl: string) => Promise<void>;
  updateStatusMessage: (message: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ user: data.user });
  },

  register: async (email, password, name) => {
    const { data } = await api.post('/auth/register', { email, password, name });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ user: data.user });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null });
  },

  updateAvatar: async (avatarUrl: string) => {
    const { data } = await api.put('/users/me', { avatar_url: avatarUrl });
    set({ user: data });
  },

  updateStatusMessage: async (message: string) => {
    const { data } = await api.put('/users/me', { status_message: message });
    set({ user: data });
  },

  fetchMe: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/users/me');
      set({ user: data });
    } catch {
      set({ user: null });
    } finally {
      set({ isLoading: false });
    }
  },
}));

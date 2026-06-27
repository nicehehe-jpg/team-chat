'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { useSocket } from '@/hooks/useSocket';
import RoomList from '@/components/chat/RoomList';
import ChatWindow from '@/components/chat/ChatWindow';

export default function HomePage() {
  const { user, fetchMe, isLoading } = useAuthStore();
  const { fetchRooms } = useChatStore();
  const router = useRouter();

  useSocket();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login'); return; }
    fetchMe().then(() => {
      if (!useAuthStore.getState().user) router.push('/login');
    });
  }, []);

  useEffect(() => {
    if (user) fetchRooms();
  }, [user]);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '16px',
            background: 'var(--blue)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', margin: '0 auto 14px', animation: 'pulse 1.5s ease-in-out infinite',
          }}>💬</div>
          <p style={{ fontSize: '14px', color: 'var(--t3)', fontWeight: 600 }}>로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <RoomList />
      <ChatWindow />
    </div>
  );
}

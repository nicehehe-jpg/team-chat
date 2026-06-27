'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { useSocket } from '@/hooks/useSocket';
import { useIsMobile } from '@/hooks/useIsMobile';
import RoomList from '@/components/chat/RoomList';
import ChatWindow from '@/components/chat/ChatWindow';

export default function HomePage() {
  const { user, fetchMe, isLoading } = useAuthStore();
  const { fetchRooms, activeRoomId } = useChatStore();
  const router = useRouter();
  const isMobile = useIsMobile();

  useSocket();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login'); return; }
    fetchMe().then(() => {
      if (!useAuthStore.getState().user) router.push('/login');
    });
  }, []);

  // 로그아웃 등으로 인증이 사라지면 로그인 페이지로 이동
  useEffect(() => {
    if (!isLoading && !user && !localStorage.getItem('accessToken')) {
      router.replace('/login');
    }
  }, [user, isLoading]);

  useEffect(() => {
    if (user) fetchRooms();
  }, [user]);

  if (isLoading || !user) {
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

  // 모바일: 한 번에 한 화면만 (목록 또는 대화창)
  if (isMobile) {
    return (
      <div style={{ height: '100dvh', overflow: 'hidden' }}>
        {activeRoomId ? <ChatWindow /> : <RoomList />}
      </div>
    );
  }

  // 데스크탑: 2단 레이아웃
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <RoomList />
      <ChatWindow />
    </div>
  );
}

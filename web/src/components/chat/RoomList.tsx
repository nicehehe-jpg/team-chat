'use client';
import { useState, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

type ModalType = 'none' | 'direct' | 'group';

function Avatar({ name, size = 44, color = 'var(--blue-bg)', textColor = 'var(--blue)', emoji, src }: {
  name?: string; size?: number; color?: string; textColor?: string; emoji?: string; src?: string | null;
}) {
  if (src) {
    return (
      <div style={{
        width: size, height: size, borderRadius: size * 0.32,
        overflow: 'hidden', flexShrink: 0,
      }}>
        <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.32,
      background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.38, color: textColor, flexShrink: 0,
    }}>
      {emoji || name?.[0] || '?'}
    </div>
  );
}

export default function RoomList() {
  const { rooms, activeRoomId, setActiveRoom, fetchMessages, createDirectRoom, createGroupRoom } = useChatStore();
  const { user, logout, updateAvatar } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [modal, setModal] = useState<ModalType>('none');
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      await updateAvatar(data.url);
    } catch {
      alert('사진 업로드에 실패했습니다');
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleRoomClick = async (roomId: string) => {
    setActiveRoom(roomId);
    await fetchMessages(roomId);
  };

  const openModal = async (type: ModalType) => {
    const { data } = await api.get('/users');
    setUsers(data);
    setSelectedUsers([]);
    setGroupName('');
    setSearch('');
    setModal(type);
  };

  const closeModal = () => setModal('none');

  const handleStartDirect = async (targetUserId: string) => {
    const roomId = await createDirectRoom(targetUserId);
    closeModal();
    handleRoomClick(roomId);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    const roomId = await createGroupRoom(groupName, selectedUsers);
    closeModal();
    handleRoomClick(roomId);
  };

  const toggleUser = (id: string) => {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]);
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside style={{
      width: '300px', flexShrink: 0, background: 'var(--card)',
      borderRight: '1px solid var(--line)', display: 'flex',
      flexDirection: 'column', height: '100vh',
    }}>
      {/* 상단 헤더 */}
      <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
            }}>💬</div>
            <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--t1)' }}>채팅</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => openModal('direct')} title="1:1 채팅" style={iconBtnStyle}>💬</button>
            <button onClick={() => openModal('group')} title="그룹 채팅" style={iconBtnStyle}>👥</button>
            <button onClick={logout} title="로그아웃" style={iconBtnStyle}>↩</button>
          </div>
        </div>

        {/* 내 프로필 */}
        <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
        <div
          onClick={() => avatarInputRef.current?.click()}
          title="클릭해서 프로필 사진 변경"
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 12px', background: 'var(--bg)', borderRadius: '12px',
            cursor: 'pointer', transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-bg)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg)')}
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Avatar name={user?.name} size={36} src={user?.avatar_url} />
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 36 * 0.32,
              background: avatarUploading ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', transition: 'background 0.15s',
            }}>
              {avatarUploading && '⏳'}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--t1)' }}>{user?.name}</p>
            <p style={{ fontSize: '11.5px', color: 'var(--green)', fontWeight: 600 }}>● 온라인 · 사진 변경</p>
          </div>
          <span style={{ fontSize: '13px', color: 'var(--t3)' }}>📷</span>
        </div>
      </div>

      {/* 채팅방 목록 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {rooms.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>💬</div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t2)', marginBottom: '4px' }}>채팅방이 없습니다</p>
            <p style={{ fontSize: '12.5px', color: 'var(--t3)' }}>위 버튼으로 대화를 시작해보세요</p>
          </div>
        ) : (
          rooms.map((room) => {
            const other = room.members?.[0];
            const displayName = room.type === 'direct' ? other?.name : room.name;
            const isActive = activeRoomId === room.id;
            const lastContent = room.last_message?.type === 'image' ? '📷 사진' :
              room.last_message?.type === 'file' ? '📎 파일' :
              room.last_message?.content || '';

            return (
              <button
                key={room.id}
                onClick={() => handleRoomClick(room.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 20px', background: isActive ? 'var(--blue-bg)' : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.12s', position: 'relative',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar
                    name={displayName || ''}
                    size={46}
                    color={room.type === 'group' ? '#EDE9FF' : 'var(--blue-bg)'}
                    textColor={room.type === 'group' ? '#6C5CE7' : 'var(--blue)'}
                    emoji={room.type === 'group' ? '👥' : undefined}
                    src={room.type === 'direct' ? other?.avatar_url : undefined}
                  />
                  {room.type === 'direct' && other?.status === 'online' && (
                    <span style={{
                      position: 'absolute', bottom: 1, right: 1,
                      width: '11px', height: '11px', borderRadius: '50%',
                      background: 'var(--green)', border: '2px solid var(--card)',
                    }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {displayName}
                    </span>
                    {room.last_message && (
                      <span style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 500, flexShrink: 0, marginLeft: '4px' }}>
                        {formatDistanceToNow(new Date(room.last_message.created_at), { locale: ko, addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12.5px', color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {lastContent || '메시지를 보내보세요'}
                    </span>
                    {room.unread_count > 0 && (
                      <span style={{
                        background: 'var(--blue)', color: '#fff',
                        fontSize: '11px', fontWeight: 700,
                        borderRadius: '20px', padding: '2px 7px',
                        minWidth: '20px', textAlign: 'center', marginLeft: '6px', flexShrink: 0,
                      }}>
                        {room.unread_count > 99 ? '99+' : room.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* 모달 */}
      {modal !== 'none' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.25)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }} onClick={closeModal}>
          <div style={{
            background: 'var(--card)', borderRadius: '20px',
            width: '360px', maxHeight: '80vh', display: 'flex',
            flexDirection: 'column', boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
          }} onClick={e => e.stopPropagation()}>
            {/* 모달 헤더 */}
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: modal === 'group' ? '14px' : '0' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)' }}>
                  {modal === 'direct' ? '1:1 채팅 시작' : '그룹 채팅 만들기'}
                </h3>
                <button onClick={closeModal} style={{ ...iconBtnStyle, fontSize: '16px' }}>✕</button>
              </div>
              {modal === 'group' && (
                <input
                  type="text"
                  placeholder="그룹 이름 입력"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  style={inputStyle}
                  autoFocus
                />
              )}
              <input
                type="text"
                placeholder="이름으로 검색"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ ...inputStyle, marginTop: modal === 'group' ? '8px' : '0' }}
              />
              {modal === 'group' && selectedUsers.length > 0 && (
                <p style={{ fontSize: '12px', color: 'var(--blue)', fontWeight: 600, marginTop: '8px' }}>
                  {selectedUsers.length}명 선택됨
                </p>
              )}
            </div>

            {/* 유저 목록 */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => modal === 'direct' ? handleStartDirect(u.id) : toggleUser(u.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 20px', border: 'none', background: selectedUsers.includes(u.id) ? 'var(--blue-bg)' : 'transparent',
                    cursor: 'pointer', transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (!selectedUsers.includes(u.id)) (e.currentTarget as HTMLElement).style.background = 'var(--bg)'; }}
                  onMouseLeave={e => { if (!selectedUsers.includes(u.id)) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {modal === 'group' && (
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                      border: `2px solid ${selectedUsers.includes(u.id) ? 'var(--blue)' : 'var(--line)'}`,
                      background: selectedUsers.includes(u.id) ? 'var(--blue)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {selectedUsers.includes(u.id) && <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>✓</span>}
                    </div>
                  )}
                  <div style={{ position: 'relative' }}>
                    <Avatar name={u.name} size={38} />
                    <span style={{
                      position: 'absolute', bottom: 0, right: 0,
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: u.status === 'online' ? 'var(--green)' : 'var(--line)',
                      border: '2px solid var(--card)',
                    }} />
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)' }}>{u.name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--t3)' }}>{u.email}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* 그룹 생성 버튼 */}
            {modal === 'group' && (
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)', flexShrink: 0 }}>
                <button
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim() || selectedUsers.length === 0}
                  style={{
                    width: '100%', padding: '13px', borderRadius: '12px',
                    background: (!groupName.trim() || selectedUsers.length === 0) ? 'var(--line)' : 'var(--blue)',
                    color: (!groupName.trim() || selectedUsers.length === 0) ? 'var(--t3)' : '#fff',
                    fontWeight: 700, fontSize: '14px', border: 'none',
                    cursor: (!groupName.trim() || selectedUsers.length === 0) ? 'not-allowed' : 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  그룹 채팅 만들기
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: '32px', height: '32px', borderRadius: '8px', border: 'none',
  background: 'transparent', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', fontSize: '15px',
  color: 'var(--t2)', transition: 'background 0.12s',
};

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1.5px solid var(--line)', borderRadius: '10px',
  padding: '10px 13px', fontSize: '13.5px', outline: 'none',
  color: 'var(--t1)', background: 'var(--bg)',
};

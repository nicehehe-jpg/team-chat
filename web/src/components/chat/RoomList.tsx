'use client';
import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { useIsMobile } from '@/hooks/useIsMobile';
import AdminPanel from './AdminPanel';
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

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      background: 'var(--bg)', borderRadius: '12px', padding: '9px 12px',
    }}>
      <span style={{ fontSize: '14px', color: 'var(--t3)', flexShrink: 0 }}>🔍</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1, border: 'none', outline: 'none', background: 'transparent',
          fontSize: '13.5px', color: 'var(--t1)', minWidth: 0,
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: 'var(--t3)', fontSize: '14px', flexShrink: 0, padding: 0, lineHeight: 1,
          }}
        >✕</button>
      )}
    </div>
  );
}

export default function RoomList() {
  const { rooms, activeRoomId, setActiveRoom, fetchMessages, createDirectRoom, createSelfRoom, createGroupRoom } = useChatStore();
  const { user, logout, updateAvatar, updateStatusMessage, updateProfile } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [modal, setModal] = useState<ModalType>('none');
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'chat'>('friends');
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; user: any } | null>(null);
  const [profileUser, setProfileUser] = useState<any | null>(null);
  const [renameUser, setRenameUser] = useState<any | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [editingStatus, setEditingStatus] = useState(false);
  const [statusValue, setStatusValue] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [showMyMenu, setShowMyMenu] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [nicknames, setNicknames] = useState<Record<string, string>>({});
  const isMobile = useIsMobile();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // 별명 로드 (본인에게만 보이는 친구 이름)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('friend_nicknames');
      if (saved) setNicknames(JSON.parse(saved));
    } catch {}
  }, []);

  const displayNameOf = (u: any) => nicknames[u.id] || u.name;

  const saveNickname = (userId: string, nickname: string) => {
    setNicknames((prev) => {
      const next = { ...prev };
      if (nickname.trim()) next[userId] = nickname.trim();
      else delete next[userId];
      localStorage.setItem('friend_nicknames', JSON.stringify(next));
      return next;
    });
  };

  const openChatWith = async (userId: string) => {
    const roomId = await createDirectRoom(userId);
    await fetchMessages(roomId);
    setActiveRoom(roomId);
    setActiveTab('chat');
  };

  const openSelfChat = async () => {
    const roomId = await createSelfRoom();
    await fetchMessages(roomId);
    setActiveRoom(roomId);
    setActiveTab('chat');
  };

  // 컨텍스트 메뉴 바깥 클릭 시 닫기
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [ctxMenu]);

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

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch {}
  };

  // 마운트 시 팀원 목록 로드 (친구 탭 표시용)
  useEffect(() => {
    fetchUsers();
  }, []);

  const openModal = async (type: ModalType) => {
    await fetchUsers();
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
      width: isMobile ? '100%' : '300px', flexShrink: 0, background: 'var(--card)',
      borderRight: isMobile ? 'none' : '1px solid var(--line)', display: 'flex',
      flexDirection: 'column', height: isMobile ? '100dvh' : '100vh',
      paddingTop: isMobile ? 'env(safe-area-inset-top)' : 0,
    }}>
      {/* 상단 헤더 */}
      <div style={{ padding: '20px 20px 0', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
            }}>{activeTab === 'friends' ? '👤' : '💬'}</div>
            <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--t1)' }}>{activeTab === 'friends' ? '친구' : '채팅'}</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {activeTab === 'chat' && <>
              <button onClick={() => openModal('direct')} title="1:1 채팅" style={iconBtnStyle}>💬</button>
              <button onClick={() => openModal('group')} title="그룹 채팅" style={iconBtnStyle}>👥</button>
            </>}
            {user?.role === 'admin' && (
              <button onClick={() => setShowAdmin(true)} title="관리자 — 계정 관리" style={iconBtnStyle}>⚙️</button>
            )}
            <button onClick={() => window.open('https://nicehehe-jpg.github.io/general-affiairs-for-soosan/', '_blank')} title="총무 관리 시스템" style={iconBtnStyle}>📋</button>
            <button onClick={logout} title="로그아웃" style={iconBtnStyle}>↩</button>
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: '0' }}>
          {(['friends', 'chat'] as const).map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); setListSearch(''); }} style={{
              flex: 1, padding: '10px 0', border: 'none', background: 'transparent',
              fontSize: '13.5px', fontWeight: 700, cursor: 'pointer',
              color: activeTab === tab ? 'var(--blue)' : 'var(--t3)',
              borderBottom: activeTab === tab ? '2px solid var(--blue)' : '2px solid transparent',
              transition: 'all 0.15s',
            }}>
              {tab === 'friends' ? '👤 친구' : '💬 채팅'}
            </button>
          ))}
        </div>
      </div>

      {/* 친구 목록 */}
      {activeTab === 'friends' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* 내 프로필 */}
          <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
            <div
              onClick={() => avatarInputRef.current?.click()}
              title="클릭해서 프로필 사진 변경"
              style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
            >
              <Avatar name={user?.name} size={46} src={user?.avatar_url} />
              {avatarUploading && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>⏳</div>}
              <span style={{ position: 'absolute', bottom: 1, right: 1, width: '11px', height: '11px', borderRadius: '50%', background: 'var(--green)', border: '2px solid var(--card)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
              <p
                onClick={() => setShowMyMenu(v => !v)}
                title="내 프로필 메뉴"
                style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', marginBottom: '2px', cursor: 'pointer', display: 'inline-block' }}
              >{user?.name} ▾</p>

              {/* 내 프로필 메뉴 */}
              {showMyMenu && (
                <>
                  <div onClick={() => setShowMyMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 250 }} />
                  <div style={{
                    position: 'absolute', top: '24px', left: 0, zIndex: 260,
                    background: 'var(--card)', borderRadius: '12px', padding: '6px',
                    boxShadow: 'var(--shadow-lg)', border: '1px solid var(--line)', width: '150px',
                  }}>
                    {[
                      { label: '💬  나와의 채팅', action: () => openSelfChat() },
                      { label: '👤  프로필 보기', action: () => setProfileUser(user) },
                      { label: '✏️  프로필 편집', action: () => { setEditName(user?.name || ''); setEditStatus(user?.status_message || ''); setEditProfile(true); } },
                    ].map(item => (
                      <button key={item.label}
                        onClick={() => { item.action(); setShowMyMenu(false); }}
                        style={{
                          width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none',
                          background: 'transparent', borderRadius: '8px', cursor: 'pointer',
                          fontSize: '13.5px', fontWeight: 600, color: 'var(--t1)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >{item.label}</button>
                    ))}
                  </div>
                </>
              )}

              {editingStatus ? (
                <input
                  autoFocus
                  value={statusValue}
                  maxLength={60}
                  onChange={e => setStatusValue(e.target.value)}
                  onBlur={async () => { await updateStatusMessage(statusValue); setEditingStatus(false); }}
                  onKeyDown={async e => {
                    if (e.key === 'Enter') { await updateStatusMessage(statusValue); setEditingStatus(false); }
                    if (e.key === 'Escape') setEditingStatus(false);
                  }}
                  placeholder="상태메시지 입력"
                  style={{
                    width: '100%', border: 'none', borderBottom: '1px solid var(--blue)',
                    outline: 'none', fontSize: '12px', color: 'var(--t2)', padding: '1px 0',
                    background: 'transparent',
                  }}
                />
              ) : (
                <p
                  onClick={() => { setStatusValue(user?.status_message || ''); setEditingStatus(true); }}
                  title="클릭해서 상태메시지 변경"
                  style={{
                    fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                    color: user?.status_message ? 'var(--t2)' : 'var(--t3)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {user?.status_message || '✏️ 상태메시지 입력'}
                </p>
              )}
            </div>
            <span
              onClick={() => avatarInputRef.current?.click()}
              title="프로필 사진 변경"
              style={{ fontSize: '13px', color: 'var(--t3)', cursor: 'pointer' }}
            >📷</span>
          </div>

          {/* 친구 검색 */}
          <div style={{ padding: '10px 16px' }}>
            <SearchBar value={listSearch} onChange={setListSearch} placeholder="이름 검색" />
          </div>

          {/* 팀원 목록 */}
          {(() => {
            const q = listSearch.trim().toLowerCase();
            const filtered = q
              ? users.filter(u => displayNameOf(u).toLowerCase().includes(q) || (u.status_message || '').toLowerCase().includes(q))
              : users;
            return filtered.length > 0 ? (
            <>
              <div style={{ padding: '10px 20px 6px', fontSize: '11.5px', fontWeight: 700, color: 'var(--t3)', background: 'var(--bg)' }}>
                팀원 {filtered.length}명
              </div>
              {filtered.map((u) => (
                <button key={u.id}
                  onClick={() => openChatWith(u.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    const menuH = 150;
                    const y = e.clientY + menuH > window.innerHeight ? e.clientY - menuH : e.clientY;
                    setCtxMenu({ x: Math.min(e.clientX, window.innerWidth - 170), y, user: u });
                  }}
                  style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 20px', background: 'transparent', border: 'none',
                  cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar name={displayNameOf(u)} size={44} src={u.avatar_url} />
                    <span style={{
                      position: 'absolute', bottom: 1, right: 1,
                      width: '11px', height: '11px', borderRadius: '50%',
                      background: u.status === 'online' ? 'var(--green)' : 'var(--t3)',
                      border: '2px solid var(--card)',
                    }} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', marginBottom: '2px' }}>{displayNameOf(u)}</p>
                    <p style={{
                      fontSize: '12px', fontWeight: 500,
                      color: u.status_message ? 'var(--t3)' : (u.status === 'online' ? 'var(--green)' : 'var(--t3)'),
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {u.status_message
                        ? u.status_message
                        : (u.status === 'online' ? '● 온라인' : '○ 오프라인')}
                    </p>
                  </div>
                </button>
              ))}
            </>
            ) : (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>{q ? '🔍' : '👤'}</div>
                <p style={{ fontSize: '14px', color: 'var(--t3)' }}>
                  {q ? '검색 결과가 없습니다' : '등록된 팀원이 없습니다'}
                </p>
              </div>
            );
          })()}
        </div>
      )}

      {/* 채팅방 목록 */}
      {activeTab === 'chat' && (<div style={{ flex: 1, overflowY: 'auto' }}>
        {/* 채팅방 검색 */}
        <div style={{ padding: '10px 16px' }}>
          <SearchBar value={listSearch} onChange={setListSearch} placeholder="채팅방, 참여자 검색" />
        </div>
        {(() => {
          const q = listSearch.trim().toLowerCase();
          const roomName = (room: any) => {
            const other = room.members?.[0];
            const isSelf = room.type === 'direct' && (!room.members || room.members.length === 0);
            return isSelf ? `${user?.name} (나)` : (room.type === 'direct' ? (other?.name || '') : (room.name || ''));
          };
          const filteredRooms = q
            ? rooms.filter(r =>
                roomName(r).toLowerCase().includes(q) ||
                (r.members || []).some((m: any) => (m.name || '').toLowerCase().includes(q)) ||
                (r.last_message?.content || '').toLowerCase().includes(q))
            : rooms;
          return rooms.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>💬</div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t2)', marginBottom: '4px' }}>채팅방이 없습니다</p>
            <p style={{ fontSize: '12.5px', color: 'var(--t3)' }}>위 버튼으로 대화를 시작해보세요</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
            <p style={{ fontSize: '14px', color: 'var(--t3)' }}>검색 결과가 없습니다</p>
          </div>
        ) : (
          filteredRooms.map((room) => {
            const other = room.members?.[0];
            const isSelfRoom = room.type === 'direct' && (!room.members || room.members.length === 0);
            const displayName = isSelfRoom ? `${user?.name} (나)` : (room.type === 'direct' ? other?.name : room.name);
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
                    src={isSelfRoom ? user?.avatar_url : (room.type === 'direct' ? other?.avatar_url : undefined)}
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
        );
        })()}
      </div>)}

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

      {/* 친구 우클릭 컨텍스트 메뉴 */}
      {ctxMenu && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, zIndex: 300,
            background: 'var(--card)', borderRadius: '12px', overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)', border: '1px solid var(--line)',
            width: '160px', padding: '6px',
          }}
        >
          {[
            { label: '💬  채팅하기', action: () => openChatWith(ctxMenu.user.id) },
            { label: '👤  프로필 보기', action: () => setProfileUser(ctxMenu.user) },
            { label: '✏️  이름 설정 변경', action: () => { setRenameUser(ctxMenu.user); setRenameValue(displayNameOf(ctxMenu.user)); } },
          ].map((item) => (
            <button key={item.label}
              onClick={() => { item.action(); setCtxMenu(null); }}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none',
                background: 'transparent', borderRadius: '8px', cursor: 'pointer',
                fontSize: '13.5px', fontWeight: 600, color: 'var(--t1)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >{item.label}</button>
          ))}
        </div>
      )}

      {/* 프로필 보기 모달 */}
      {profileUser && (
        <div onClick={() => setProfileUser(null)} style={{
          position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--card)', borderRadius: '20px', width: '100%', maxWidth: '300px',
            overflow: 'hidden', boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ padding: '32px 24px 24px', textAlign: 'center', background: 'var(--blue-bg)' }}>
              <div style={{ display: 'inline-block', marginBottom: '14px' }}>
                <Avatar name={displayNameOf(profileUser)} size={96} src={profileUser.avatar_url} />
              </div>
              <p style={{ fontSize: '19px', fontWeight: 800, color: 'var(--t1)', marginBottom: '4px' }}>
                {displayNameOf(profileUser)}
              </p>
              <p style={{ fontSize: '13px', color: profileUser.status === 'online' ? 'var(--green)' : 'var(--t3)', fontWeight: 600 }}>
                {profileUser.status === 'online' ? '● 온라인' : '○ 오프라인'}
              </p>
              {profileUser.status_message && (
                <p style={{ fontSize: '13.5px', color: 'var(--t1)', marginTop: '10px', fontWeight: 500 }}>
                  “{profileUser.status_message}”
                </p>
              )}
              {profileUser.email && (
                <p style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '6px' }}>{profileUser.email}</p>
              )}
            </div>
            <div style={{ padding: '14px', display: 'flex', gap: '8px' }}>
              {profileUser.id === user?.id ? (
                <>
                  <button
                    onClick={() => { setProfileUser(null); avatarInputRef.current?.click(); }}
                    style={{
                      flex: 1, padding: '13px', borderRadius: '12px', border: '1px solid var(--line)',
                      background: 'transparent', color: 'var(--t2)', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer',
                    }}
                  >📷 사진 변경</button>
                  <button
                    onClick={() => { setStatusValue(user?.status_message || ''); setEditingStatus(true); setProfileUser(null); }}
                    style={{
                      flex: 1, padding: '13px', borderRadius: '12px', border: 'none',
                      background: 'var(--blue)', color: '#fff', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer',
                    }}
                  >✏️ 상태메시지</button>
                </>
              ) : (
                <button
                  onClick={() => { openChatWith(profileUser.id); setProfileUser(null); }}
                  style={{
                    flex: 1, padding: '13px', borderRadius: '12px', border: 'none',
                    background: 'var(--blue)', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                  }}
                >💬 채팅하기</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 관리자 패널 */}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} myId={user?.id} />}

      {/* 내 프로필 편집 모달 */}
      {editProfile && (
        <div onClick={() => setEditProfile(false)} style={{
          position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--card)', borderRadius: '20px', width: '100%', maxWidth: '320px',
            padding: '24px', boxShadow: 'var(--shadow-lg)',
          }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--t1)', marginBottom: '18px', textAlign: 'center' }}>프로필 편집</h3>

            {/* 사진 */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
              <div onClick={() => avatarInputRef.current?.click()} style={{ position: 'relative', cursor: 'pointer' }}>
                <Avatar name={user?.name} size={84} src={user?.avatar_url} />
                <span style={{
                  position: 'absolute', bottom: 0, right: 0, width: '28px', height: '28px',
                  borderRadius: '50%', background: 'var(--blue)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px',
                  border: '2px solid var(--card)',
                }}>📷</span>
              </div>
            </div>

            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t3)' }}>이름</label>
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              maxLength={20}
              placeholder="이름"
              style={{ ...inputStyle, marginTop: '4px', marginBottom: '12px' }}
            />
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t3)' }}>상태메시지</label>
            <input
              value={editStatus}
              onChange={e => setEditStatus(e.target.value)}
              maxLength={60}
              placeholder="상태메시지 입력"
              style={{ ...inputStyle, marginTop: '4px' }}
            />

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button
                onClick={() => setEditProfile(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--line)',
                  background: 'transparent', color: 'var(--t2)', fontWeight: 600, fontSize: '13.5px', cursor: 'pointer',
                }}
              >취소</button>
              <button
                onClick={async () => {
                  await updateProfile({ name: editName.trim() || undefined, status_message: editStatus });
                  setEditProfile(false);
                }}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                  background: 'var(--blue)', color: '#fff', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer',
                }}
              >저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 이름 설정 변경 모달 */}
      {renameUser && (
        <div onClick={() => setRenameUser(null)} style={{
          position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--card)', borderRadius: '20px', width: '100%', maxWidth: '320px',
            padding: '24px', boxShadow: 'var(--shadow-lg)',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)', marginBottom: '6px' }}>이름 설정 변경</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--t3)', marginBottom: '16px' }}>
              나에게만 보이는 이름입니다 (원래 이름: {renameUser.name})
            </p>
            <input
              type="text"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              placeholder={renameUser.name}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') { saveNickname(renameUser.id, renameValue); setRenameUser(null); } }}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={() => { saveNickname(renameUser.id, ''); setRenameUser(null); }}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--line)',
                  background: 'transparent', color: 'var(--t2)', fontWeight: 600, fontSize: '13.5px', cursor: 'pointer',
                }}
              >원래대로</button>
              <button
                onClick={() => { saveNickname(renameUser.id, renameValue); setRenameUser(null); }}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                  background: 'var(--blue)', color: '#fff', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer',
                }}
              >저장</button>
            </div>
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

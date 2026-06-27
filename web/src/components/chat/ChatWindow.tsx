'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { getSocket } from '@/lib/socket';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import api from '@/lib/api';

// SSR 비활성화 (이모지 피커는 브라우저 전용)
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export default function ChatWindow() {
  const { activeRoomId, messages, rooms, typingUsers } = useChatStore();
  const { user } = useAuthStore();
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const roomMessages = activeRoomId ? (messages[activeRoomId] || []) : [];
  const activeRoom = rooms.find(r => r.id === activeRoomId);
  const displayName = activeRoom?.type === 'direct' ? activeRoom.members?.[0]?.name : activeRoom?.name;
  const memberCount = (activeRoom?.members?.length || 0) + 1;
  const typingList = activeRoomId ? (typingUsers[activeRoomId] || []) : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages]);

  useEffect(() => {
    if (activeRoomId) getSocket().emit('mark_read', activeRoomId);
  }, [activeRoomId, roomMessages.length]);

  // 이모지 피커 외부 클릭 시 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    if (showEmoji) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showEmoji]);

  const handleSend = useCallback(() => {
    if (!input.trim() || !activeRoomId) return;
    getSocket().emit('send_message', { roomId: activeRoomId, content: input.trim(), type: 'text' });
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [input, activeRoomId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    if (!activeRoomId) return;
    const socket = getSocket();
    socket.emit('typing', { roomId: activeRoomId, isTyping: true });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing', { roomId: activeRoomId, isTyping: false });
    }, 1500);
  };

  const handleEmojiClick = (emojiData: any) => {
    const emoji = emojiData.emoji;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = input.slice(0, start) + emoji + input.slice(end);
      setInput(newValue);
      // 커서 위치 이모지 뒤로 이동
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
      }, 0);
    } else {
      setInput(prev => prev + emoji);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoomId) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      getSocket().emit('send_message', { roomId: activeRoomId, content: data.url, type: data.type });
    } catch {
      alert('파일 업로드에 실패했습니다');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!activeRoomId) {
    return (
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '20px',
            background: 'var(--blue-bg)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', margin: '0 auto 16px',
          }}>💬</div>
          <p style={{ fontSize: '17px', fontWeight: 700, color: 'var(--t1)', marginBottom: '6px' }}>채팅방을 선택하세요</p>
          <p style={{ fontSize: '13.5px', color: 'var(--t3)' }}>왼쪽에서 대화를 선택하거나 새 채팅을 시작하세요</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* 헤더 */}
      <div style={{
        padding: '14px 24px', background: 'var(--card)',
        borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', gap: '12px',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
          background: activeRoom?.type === 'group' ? '#EDE9FF' : 'var(--blue-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', color: activeRoom?.type === 'group' ? '#6C5CE7' : 'var(--blue)',
          fontWeight: 700,
        }}>
          {activeRoom?.type === 'group' ? '👥' : displayName?.[0]}
        </div>
        <div>
          <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)' }}>{displayName}</p>
          <p style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 500 }}>
            {typingList.length > 0 ? '입력 중...' :
              activeRoom?.type === 'group' ? `멤버 ${memberCount}명` : '온라인'}
          </p>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '20px 24px',
        display: 'flex', flexDirection: 'column', gap: '4px',
      }}>
        {roomMessages.map((msg, i) => {
          const isMine = msg.sender_id === user?.id;
          const isImage = msg.type === 'image';
          const isFile = msg.type === 'file';
          const prevMsg = roomMessages[i - 1];
          const showAvatar = !isMine && (!prevMsg || prevMsg.sender_id !== msg.sender_id);
          const showName = !isMine && showAvatar;
          const imageUrl = msg.content.startsWith('http') ? msg.content : `${API_URL}${msg.content}`;

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row',
                alignItems: 'flex-end', gap: '8px',
                marginTop: showAvatar && i > 0 ? '12px' : '2px',
              }}
            >
              {!isMine && (
                <div style={{ width: '34px', flexShrink: 0, alignSelf: 'flex-end' }}>
                  {showAvatar && (
                    msg.sender?.avatar_url ? (
                      <div style={{ width: '34px', height: '34px', borderRadius: '10px', overflow: 'hidden' }}>
                        <img
                          src={msg.sender.avatar_url.startsWith('http') ? msg.sender.avatar_url : `${API_URL}${msg.sender.avatar_url}`}
                          alt={msg.sender.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    ) : (
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '10px',
                        background: 'var(--blue-bg)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '13px', color: 'var(--blue)',
                      }}>
                        {msg.sender?.name?.[0]}
                      </div>
                    )
                  )}
                </div>
              )}

              <div style={{
                maxWidth: '65%', display: 'flex', flexDirection: 'column',
                alignItems: isMine ? 'flex-end' : 'flex-start', gap: '2px',
              }}>
                {showName && (
                  <span style={{ fontSize: '12px', color: 'var(--t3)', fontWeight: 600, marginBottom: '2px', paddingLeft: '2px' }}>
                    {msg.sender?.name}
                  </span>
                )}

                {isImage ? (
                  <a href={imageUrl} target="_blank" rel="noreferrer">
                    <img src={imageUrl} alt="이미지"
                      style={{ maxWidth: '240px', borderRadius: '14px', display: 'block', cursor: 'pointer' }} />
                  </a>
                ) : isFile ? (
                  <a href={imageUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '12px 14px', borderRadius: '14px',
                      background: isMine ? 'var(--blue)' : 'var(--card)',
                      boxShadow: 'var(--shadow-sm)', color: isMine ? '#fff' : 'var(--blue)',
                    }}>
                      <span style={{ fontSize: '18px' }}>📎</span>
                      <span style={{ fontSize: '13.5px', fontWeight: 600 }}>파일 다운로드</span>
                    </div>
                  </a>
                ) : (
                  <div style={{
                    padding: '10px 14px', borderRadius: isMine ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                    background: isMine ? 'var(--blue)' : 'var(--card)',
                    boxShadow: 'var(--shadow-sm)',
                    color: isMine ? '#fff' : 'var(--t1)',
                    fontSize: '14px', lineHeight: '1.55', fontWeight: 500,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {msg.content}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 2px' }}>
                  {isMine && (() => {
                    const readers = (activeRoom?.members || []).filter(
                      (m) => m.last_read_at && new Date(m.last_read_at) >= new Date(msg.created_at)
                    );
                    return readers.length > 0 ? (
                      <span style={{ fontSize: '11px', color: 'var(--blue)', fontWeight: 600 }}>
                        읽음 {readers.length}
                      </span>
                    ) : null;
                  })()}
                  <span style={{ fontSize: '11px', color: 'var(--t3)' }}>
                    {format(new Date(msg.created_at), 'a h:mm', { locale: ko })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div style={{ background: 'var(--card)', borderTop: '1px solid var(--line)', position: 'relative' }}>

        {/* 이모지 피커 팝업 */}
        {showEmoji && (
          <div
            ref={emojiPickerRef}
            style={{
              position: 'absolute', bottom: '100%', left: '24px',
              zIndex: 50, marginBottom: '8px',
              borderRadius: '16px', overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              skinTonesDisabled
              searchPlaceHolder="이모티콘 검색..."
              width={340}
              height={420}
              previewConfig={{ showPreview: false }}
              lazyLoadEmojis
            />
          </div>
        )}

        <div style={{
          padding: '12px 20px', display: 'flex', alignItems: 'flex-end', gap: '8px',
        }}>
          {/* 파일 첨부 */}
          <input ref={fileInputRef} type="file" accept="image/*,.pdf,.zip,.mp4,.mov" style={{ display: 'none' }} onChange={handleFileChange} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="파일 첨부"
            style={toolBtnStyle}
          >
            {uploading ? '⏳' : '📎'}
          </button>

          {/* 이모티콘 버튼 */}
          <button
            onClick={() => setShowEmoji(v => !v)}
            title="이모티콘"
            style={{
              ...toolBtnStyle,
              background: showEmoji ? 'var(--blue-bg)' : 'var(--bg)',
              color: showEmoji ? 'var(--blue)' : undefined,
            }}
          >
            😊
          </button>

          {/* 텍스트 입력 */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요"
            rows={1}
            style={{
              flex: 1, resize: 'none', outline: 'none',
              border: '1.5px solid var(--line)', borderRadius: '12px',
              padding: '10px 14px', fontSize: '14px', lineHeight: '1.5',
              color: 'var(--t1)', background: 'var(--bg)',
              maxHeight: '120px', overflow: 'auto',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--blue)'}
            onBlur={e => e.target.style.borderColor = 'var(--line)'}
          />

          {/* 전송 버튼 */}
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            style={{
              width: '38px', height: '38px', borderRadius: '10px', border: 'none',
              background: input.trim() ? 'var(--blue)' : 'var(--line)',
              cursor: input.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.15s', fontSize: '16px',
              color: input.trim() ? '#fff' : 'var(--t3)',
            }}
          >
            ▶
          </button>
        </div>
      </div>
    </main>
  );
}

const toolBtnStyle: React.CSSProperties = {
  width: '38px', height: '38px', borderRadius: '10px', border: 'none',
  background: 'var(--bg)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', fontSize: '20px',
  flexShrink: 0, transition: 'background 0.15s',
};

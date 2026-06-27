import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useChatStore } from '../src/store/chatStore';
import { useAuthStore } from '../src/store/authStore';
import { connectSocket, disconnectSocket, getSocket } from '../src/lib/socket';
import api from '../src/lib/api';

type ModalType = 'none' | 'direct' | 'group';

export default function RoomsScreen() {
  const { rooms, fetchRooms, addMessage, setTyping, createDirectRoom, createGroupRoom, setActiveRoom } = useChatStore();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const [modal, setModal] = useState<ModalType>('none');
  const [users, setUsers] = useState<any[]>([]);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    fetchRooms();
    (async () => {
      const socket = await connectSocket();
      socket.on('new_message', (msg) => { addMessage(msg); });
      socket.on('typing_indicator', ({ userId, roomId, isTyping }) => { setTyping(roomId, userId, isTyping); });
      socket.on('user_online', () => fetchRooms());
      socket.on('user_offline', () => fetchRooms());
    })();

    return () => {
      const socket = getSocket();
      socket?.off('new_message');
      socket?.off('typing_indicator');
      socket?.off('user_online');
      socket?.off('user_offline');
      disconnectSocket();
    };
  }, []);

  const openModal = async (type: ModalType) => {
    const { data } = await api.get('/users');
    setUsers(data);
    setGroupName('');
    setSelectedUsers([]);
    setModal(type);
  };

  const handleRoomPress = (roomId: string) => {
    setActiveRoom(roomId);
    router.push(`/chat/${roomId}`);
  };

  const handleDirectChat = async (targetUserId: string) => {
    const roomId = await createDirectRoom(targetUserId);
    setModal('none');
    handleRoomPress(roomId);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      return Alert.alert('그룹명과 멤버를 선택하세요');
    }
    const roomId = await createGroupRoom(groupName, selectedUsers);
    setModal('none');
    handleRoomPress(roomId);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const renderRoom = ({ item: room }: { item: any }) => {
    const other = room.members?.[0];
    const displayName = room.type === 'direct' ? other?.name : room.name;
    const lastContent = room.last_message?.type === 'image' ? '📷 사진' :
      room.last_message?.type === 'file' ? '📎 파일' :
      room.last_message?.content || '메시지 없음';

    return (
      <TouchableOpacity style={styles.roomItem} onPress={() => handleRoomPress(room.id)}>
        <View style={[styles.avatar, room.type === 'group' && { backgroundColor: '#60A5FA' }]}>
          <Text style={styles.avatarText}>{room.type === 'group' ? '👥' : displayName?.[0]}</Text>
        </View>
        <View style={styles.roomInfo}>
          <View style={styles.roomHeader}>
            <Text style={styles.roomName} numberOfLines={1}>{displayName}</Text>
            {room.last_message && (
              <Text style={styles.timeText}>
                {formatDistanceToNow(new Date(room.last_message.created_at), { locale: ko, addSuffix: false })}
              </Text>
            )}
          </View>
          <View style={styles.roomFooter}>
            <Text style={styles.lastMessage} numberOfLines={1}>{lastContent}</Text>
            {room.unread_count > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{room.unread_count > 99 ? '99+' : room.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>채팅</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => openModal('direct')} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>💬</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openModal('group')} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>👥</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>↩</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 내 정보 */}
      <View style={styles.myInfo}>
        <View style={styles.myAvatar}>
          <Text style={styles.myAvatarText}>{user?.name?.[0]}</Text>
        </View>
        <View>
          <Text style={styles.myName}>{user?.name}</Text>
          <Text style={styles.onlineText}>● 온라인</Text>
        </View>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={(r) => r.id}
        renderItem={renderRoom}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>채팅방이 없습니다{'\n'}💬 또는 👥 버튼으로 시작하세요</Text>
          </View>
        }
      />

      {/* 모달 */}
      <Modal visible={modal !== 'none'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modal === 'direct' ? '1:1 채팅 시작' : '그룹 채팅 만들기'}</Text>
              <TouchableOpacity onPress={() => setModal('none')}>
                <Text style={{ fontSize: 18, color: '#999' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {modal === 'group' && (
              <TextInput
                style={styles.groupInput}
                placeholder="그룹 이름"
                value={groupName}
                onChangeText={setGroupName}
              />
            )}

            <FlatList
              data={users}
              keyExtractor={(u) => u.id}
              style={{ maxHeight: 300 }}
              renderItem={({ item: u }) => (
                <TouchableOpacity
                  style={[styles.userItem, modal === 'group' && selectedUsers.includes(u.id) && { backgroundColor: '#FFF9C4' }]}
                  onPress={() => {
                    if (modal === 'direct') handleDirectChat(u.id);
                    else setSelectedUsers((prev) => prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]);
                  }}
                >
                  {modal === 'group' && (
                    <View style={[styles.checkbox, selectedUsers.includes(u.id) && { backgroundColor: '#FEE500', borderColor: '#FEE500' }]}>
                      {selectedUsers.includes(u.id) && <Text style={{ fontSize: 10, color: '#3C1E1E', fontWeight: 'bold' }}>✓</Text>}
                    </View>
                  )}
                  <View style={styles.userAvatar}>
                    <Text style={{ fontWeight: 'bold', fontSize: 13 }}>{u.name[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', fontSize: 14 }}>{u.name}</Text>
                    <Text style={{ fontSize: 12, color: '#999' }}>{u.email}</Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: u.status === 'online' ? '#4ade80' : '#d1d5db' }]} />
                </TouchableOpacity>
              )}
            />

            {modal === 'group' && (
              <TouchableOpacity
                style={[styles.createBtn, (!groupName.trim() || selectedUsers.length === 0) && { opacity: 0.4 }]}
                onPress={handleCreateGroup}
                disabled={!groupName.trim() || selectedUsers.length === 0}
              >
                <Text style={styles.createBtnText}>그룹 채팅 만들기 ({selectedUsers.length}명)</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#3C1E1E' },
  headerButtons: { flexDirection: 'row', gap: 4 },
  headerBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' },
  headerBtnText: { fontSize: 18 },
  myInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  myAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE500', alignItems: 'center', justifyContent: 'center' },
  myAvatarText: { fontWeight: 'bold', color: '#3C1E1E' },
  myName: { fontWeight: '600', fontSize: 14 },
  onlineText: { fontSize: 12, color: '#4ade80' },
  roomItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e5e5e5', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: 'bold', fontSize: 16 },
  roomInfo: { flex: 1 },
  roomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roomName: { fontWeight: '600', fontSize: 14, flex: 1 },
  timeText: { fontSize: 11, color: '#999', marginLeft: 4 },
  roomFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  lastMessage: { fontSize: 12, color: '#999', flex: 1 },
  badge: { backgroundColor: '#ef4444', borderRadius: 10, minWidth: 20, height: 20, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { color: '#999', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  modalTitle: { fontSize: 16, fontWeight: '600' },
  groupInput: { margin: 16, borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  userItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  userAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e5e5e5', alignItems: 'center', justifyContent: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  createBtn: { margin: 16, backgroundColor: '#FEE500', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  createBtnText: { color: '#3C1E1E', fontWeight: 'bold', fontSize: 15 },
});

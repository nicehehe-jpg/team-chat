'use client';
import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, Image, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useChatStore } from '../../src/store/chatStore';
import api from '../../src/lib/api';

export default function FriendsScreen() {
  const { user, logout } = useAuthStore();
  const { createDirectRoom, setActiveRoom } = useChatStore();
  const router = useRouter();
  const [friends, setFriends] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFriends = async () => {
    try {
      const { data } = await api.get('/users');
      setFriends(data);
    } catch {}
  };

  useEffect(() => { fetchFriends(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFriends();
    setRefreshing(false);
  };

  const handleChat = async (userId: string) => {
    const roomId = await createDirectRoom(userId);
    setActiveRoom(roomId);
    router.push(`/chat/${roomId}`);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const onlineCount = friends.filter(f => f.status === 'online').length;

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>친구</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>↩</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={friends}
        keyExtractor={(f) => f.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            {/* 내 프로필 */}
            <View style={styles.myProfile}>
              <View style={styles.myAvatarWrap}>
                {user?.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.myAvatarImg} />
                ) : (
                  <View style={[styles.myAvatarImg, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitial}>{user?.name?.[0]}</Text>
                  </View>
                )}
                <View style={styles.onlineDot} />
              </View>
              <View style={styles.myInfo}>
                <Text style={styles.myName}>{user?.name}</Text>
                <Text style={styles.myStatus}>온라인</Text>
              </View>
            </View>

            {/* 온라인 친구 수 */}
            {onlineCount > 0 && (
              <Text style={styles.sectionLabel}>온라인 친구 {onlineCount}</Text>
            )}
          </>
        }
        renderItem={({ item: friend }) => (
          <TouchableOpacity style={styles.friendItem} onPress={() => handleChat(friend.id)}>
            <View style={styles.avatarWrap}>
              {friend.avatar_url ? (
                <Image source={{ uri: friend.avatar_url }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarImg, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>{friend.name?.[0]}</Text>
                </View>
              )}
              <View style={[styles.statusDot, { backgroundColor: friend.status === 'online' ? '#4ade80' : '#d1d5db' }]} />
            </View>
            <View style={styles.friendInfo}>
              <Text style={styles.friendName}>{friend.name}</Text>
              <Text style={styles.friendStatus}>{friend.status === 'online' ? '온라인' : '오프라인'}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>등록된 팀원이 없습니다</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#191f28' },
  headerBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' },
  headerBtnText: { fontSize: 18 },

  myProfile: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 14 },
  myAvatarWrap: { position: 'relative' },
  myAvatarImg: { width: 52, height: 52, borderRadius: 16 },
  myInfo: { flex: 1 },
  myName: { fontSize: 15, fontWeight: '700', color: '#191f28', marginBottom: 2 },
  myStatus: { fontSize: 12, color: '#4ade80', fontWeight: '500' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 13, height: 13, borderRadius: 7, backgroundColor: '#4ade80', borderWidth: 2, borderColor: '#fff' },

  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#888', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fafafa' },

  friendItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 46, height: 46, borderRadius: 14 },
  avatarPlaceholder: { backgroundColor: '#e8f0fe', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 18, fontWeight: '700', color: '#3182F6' },
  statusDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#fff' },

  friendInfo: { flex: 1 },
  friendName: { fontSize: 14, fontWeight: '600', color: '#191f28', marginBottom: 2 },
  friendStatus: { fontSize: 12, color: '#999' },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#999', fontSize: 14 },
});

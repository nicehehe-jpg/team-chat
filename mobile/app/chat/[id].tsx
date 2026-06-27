import { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Image,
  Alert, SafeAreaView, ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useChatStore, Message } from '../../src/store/chatStore';
import { useAuthStore } from '../../src/store/authStore';
import { getSocket } from '../../src/lib/socket';
import api, { BASE_SOCKET_URL } from '../../src/lib/api';

export default function ChatScreen() {
  const { id: roomId } = useLocalSearchParams<{ id: string }>();
  const { messages, rooms, typingUsers, fetchMessages, addMessage, setTyping } = useChatStore();
  const { user } = useAuthStore();
  const router = useRouter();

  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeout = useRef<NodeJS.Timeout>();

  const roomMessages: Message[] = messages[roomId] || [];
  const activeRoom = rooms.find((r) => r.id === roomId);
  const displayName = activeRoom?.type === 'direct' ? activeRoom.members?.[0]?.name : activeRoom?.name;
  const memberCount = (activeRoom?.members?.length || 0) + 1;
  const typingList = typingUsers[roomId] || [];

  useEffect(() => {
    fetchMessages(roomId);
    getSocket()?.emit('mark_read', roomId);

    const socket = getSocket();
    socket?.on('new_message', (msg: Message) => {
      if (msg.room_id === roomId) {
        addMessage(msg);
        socket.emit('mark_read', roomId);
      }
    });
    socket?.on('typing_indicator', ({ userId, roomId: rId, isTyping }) => {
      if (rId === roomId) setTyping(rId, userId, isTyping);
    });

    return () => {
      socket?.off('new_message');
      socket?.off('typing_indicator');
    };
  }, [roomId]);

  const handleSend = () => {
    if (!input.trim()) return;
    getSocket()?.emit('send_message', { roomId, content: input.trim(), type: 'text' });
    setInput('');
  };

  const handleInputChange = (text: string) => {
    setInput(text);
    const socket = getSocket();
    socket?.emit('typing', { roomId, isTyping: true });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket?.emit('typing', { roomId, isTyping: false });
    }, 1500);
  };

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', {
        uri: asset.uri,
        name: asset.fileName || 'photo.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as any);
      const { data } = await api.post('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      getSocket()?.emit('send_message', { roomId, content: data.url, type: 'image' });
    } catch {
      Alert.alert('오류', '이미지 업로드에 실패했습니다');
    } finally {
      setUploading(false);
    }
  };

  const renderMessage = ({ item: msg }: { item: Message }) => {
    const isMine = msg.sender_id === user?.id;
    const imageUrl = msg.content.startsWith('http') ? msg.content : `${BASE_SOCKET_URL}${msg.content}`;

    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowOther]}>
        {!isMine && (
          <View style={styles.msgAvatar}>
            <Text style={styles.msgAvatarText}>{msg.sender?.name?.[0]}</Text>
          </View>
        )}
        <View style={[styles.msgContent, isMine ? styles.msgContentMine : styles.msgContentOther]}>
          {!isMine && activeRoom?.type === 'group' && (
            <Text style={styles.senderName}>{msg.sender?.name}</Text>
          )}
          {msg.type === 'image' ? (
            <Image source={{ uri: imageUrl }} style={styles.msgImage} resizeMode="cover" />
          ) : (
            <View style={[styles.bubble, { backgroundColor: isMine ? '#FEE500' : '#fff' }]}>
              <Text style={[styles.bubbleText, { color: isMine ? '#3C1E1E' : '#1a1a1a' }]}>{msg.content}</Text>
            </View>
          )}
          <Text style={styles.msgTime}>{format(new Date(msg.created_at), 'a h:mm', { locale: ko })}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{displayName}</Text>
          {activeRoom?.type === 'group' && (
            <Text style={styles.headerSub}>{memberCount}명</Text>
          )}
          {typingList.length > 0 && <Text style={styles.headerSub}>입력 중...</Text>}
        </View>
      </View>

      {/* 메시지 목록 */}
      <FlatList
        ref={flatListRef}
        data={roomMessages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        style={styles.messageList}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* 입력 영역 */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputBar}>
          <TouchableOpacity onPress={handleImagePick} style={styles.attachBtn} disabled={uploading}>
            {uploading ? <ActivityIndicator size="small" color="#999" /> : <Text style={{ fontSize: 20 }}>📎</Text>}
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={handleInputChange}
            placeholder="메시지를 입력하세요"
            multiline
            maxLength={2000}
          />
          <TouchableOpacity onPress={handleSend} style={[styles.sendBtn, !input.trim() && { opacity: 0.3 }]} disabled={!input.trim()}>
            <Text style={styles.sendText}>▶</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e5e5e5', backgroundColor: '#fff' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  backText: { fontSize: 22, color: '#3C1E1E' },
  headerInfo: { flex: 1 },
  headerName: { fontWeight: '700', fontSize: 16 },
  headerSub: { fontSize: 12, color: '#999' },
  messageList: { flex: 1, backgroundColor: '#B2C7D9' },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowMine: { flexDirection: 'row-reverse' },
  msgRowOther: {},
  msgAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  msgAvatarText: { fontSize: 12, fontWeight: 'bold' },
  msgContent: { maxWidth: '75%', gap: 2 },
  msgContentMine: { alignItems: 'flex-end' },
  msgContentOther: { alignItems: 'flex-start' },
  senderName: { fontSize: 11, color: '#fff', fontWeight: '600', marginLeft: 4 },
  bubble: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, maxWidth: '100%' },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  msgImage: { width: 200, height: 160, borderRadius: 14 },
  msgTime: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginHorizontal: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 8, borderTopWidth: 1, borderTopColor: '#e5e5e5', backgroundColor: '#fff' },
  attachBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  textInput: { flex: 1, borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE500', alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#3C1E1E', fontWeight: 'bold', fontSize: 16 },
});

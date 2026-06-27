import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { borderTopWidth: 1, borderTopColor: '#e5e5e5', backgroundColor: '#fff' },
        tabBarActiveTintColor: '#3182F6',
        tabBarInactiveTintColor: '#999',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
      }}
    >
      <Tabs.Screen
        name="friends"
        options={{ title: '친구', tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} /> }}
      />
      <Tabs.Screen
        name="rooms"
        options={{ title: '채팅', tabBarIcon: ({ color, focused }) => <TabIconWithBadge color={color} /> }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}

function TabIconWithBadge({ color }: { color: string }) {
  const { Text, View } = require('react-native');
  const { useChatStore } = require('../../src/store/chatStore');
  const totalUnread = useChatStore((s: any) => s.rooms.reduce((acc: number, r: any) => acc + (r.unread_count || 0), 0));
  return (
    <View>
      <Text style={{ fontSize: 22 }}>💬</Text>
      {totalUnread > 0 && (
        <View style={{
          position: 'absolute', top: -4, right: -8,
          backgroundColor: '#ef4444', borderRadius: 10,
          minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
        }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{totalUnread > 99 ? '99+' : totalUnread}</Text>
        </View>
      )}
    </View>
  );
}

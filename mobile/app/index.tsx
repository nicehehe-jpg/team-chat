import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../src/store/authStore';

export default function Index() {
  const { fetchMe } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        router.replace('/login');
        return;
      }
      await fetchMe();
      const user = useAuthStore.getState().user;
      router.replace(user ? '/(tabs)/friends' : '/login');
    })();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEE500' }}>
      <ActivityIndicator size="large" color="#3C1E1E" />
    </View>
  );
}

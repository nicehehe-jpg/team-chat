import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';

export default function LoginScreen() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const { login, register } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async () => {
    try {
      if (isRegister) {
        if (!form.name.trim()) return Alert.alert('이름을 입력하세요');
        await register(form.email, form.password, form.name);
      } else {
        await login(form.email, form.password);
      }
      router.replace('/(tabs)/friends');
    } catch (err: any) {
      Alert.alert('오류', err.response?.data?.message || '오류가 발생했습니다');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Team Chat</Text>

        {isRegister && (
          <TextInput
            style={styles.input}
            placeholder="이름"
            value={form.name}
            onChangeText={(v) => setForm({ ...form, name: v })}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="이메일"
          value={form.email}
          onChangeText={(v) => setForm({ ...form, email: v })}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          value={form.password}
          onChangeText={(v) => setForm({ ...form, password: v })}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>{isRegister ? '회원가입' : '로그인'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
          <Text style={styles.toggleText}>
            {isRegister ? '이미 계정이 있나요? 로그인' : '계정이 없나요? 회원가입'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEE500' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#3C1E1E', textAlign: 'center', marginBottom: 32 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#e5e5e5',
  },
  button: { backgroundColor: '#3C1E1E', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#FEE500', fontSize: 16, fontWeight: 'bold' },
  toggleText: { textAlign: 'center', color: '#3C1E1E', marginTop: 16, fontSize: 14, textDecorationLine: 'underline' },
});

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Modal, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ENV } from '../config/env';
import Footer from '../components/Footer';

const glass: any = Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } : {};

export default function AdminLoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [popup, setPopup] = useState({ visible: false, title: '', msg: '' });
  const popupScale = useRef(new Animated.Value(0)).current;
  const showPopup = (t: string, m: string) => { setPopup({ visible: true, title: t, msg: m }); Animated.spring(popupScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start(); };
  const hidePopup = () => { Animated.timing(popupScale, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setPopup(p => ({ ...p, visible: false }))); };

  const handleLogin = async () => {
    const e: Record<string, string> = {};
    if (!username.trim()) e.username = 'Required';
    if (!password) e.password = 'Required';
    setErrors(e); if (Object.keys(e).length > 0) return;
    setLoading(true);
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/auth/admin-login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.trim(), password }) });
      const data = await res.json();
      if (!res.ok) { showPopup('Authentication Failed', data.error || 'Invalid credentials.'); return; }
      login(data.token, data.user); router.replace('/admin-dashboard');
    } catch { showPopup('Connection Error', 'Unable to reach the server.'); } finally { setLoading(false); }
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(); }, []);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        <Animated.View style={[s.card, glass, { opacity: fadeAnim }]}>
          <View style={s.header}>
            <View style={[s.dot, { backgroundColor: '#c9a227' }]} />
            <Text style={s.title}>Admin Console</Text>
            <Text style={s.subtitle}>Authorized administrative access only</Text>
          </View>
          <Text style={s.label}>Username</Text>
          <TextInput style={[s.input, errors.username && s.inputErr]} placeholder="Admin username" placeholderTextColor="#b0a898" autoCapitalize="none" value={username} onChangeText={v => { setUsername(v); setErrors(p => ({ ...p, username: '' })); }} />
          <Text style={s.label}>Password</Text>
          <TextInput style={[s.input, errors.password && s.inputErr]} placeholder="Enter your password" placeholderTextColor="#b0a898" secureTextEntry value={password} onChangeText={v => { setPassword(v); setErrors(p => ({ ...p, password: '' })); }} />
          <TouchableOpacity style={[s.button, { backgroundColor: '#c9a227' }, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
            <Text style={[s.buttonText, { color: '#1e1e2e' }]}>{loading ? 'Authenticating...' : 'Sign In'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.backBtn} onPress={() => router.replace('/login')}><Text style={s.backText}>&#8592; Back to role selection</Text></TouchableOpacity>
        </Animated.View>
        <Footer />
      </ScrollView>
      <Modal visible={popup.visible} transparent animationType="none" onRequestClose={hidePopup}>
        <View style={s.modalOv}><Animated.View style={[s.modalC, glass, { transform: [{ scale: popupScale }] }]}>
          <Text style={s.modalT}>{popup.title}</Text><Text style={s.modalM}>{popup.msg}</Text>
          <TouchableOpacity style={[s.modalBtn, { backgroundColor: '#c9a227' }]} onPress={hidePopup}><Text style={[s.modalBtnT, { color: '#1e1e2e' }]}>Dismiss</Text></TouchableOpacity>
        </Animated.View></View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  page: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 24, padding: 36, width: '100%', maxWidth: 440, borderWidth: 1, borderColor: 'rgba(200,180,140,0.25)', marginBottom: 40 },
  header: { alignItems: 'center', marginBottom: 28 },
  dot: { width: 10, height: 10, borderRadius: 5, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#1e1e2e' },
  subtitle: { fontSize: 13, color: '#8b7e6a', marginTop: 4 },
  label: { fontSize: 11, fontWeight: '700', color: '#1e1e2e', marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: { height: 48, borderWidth: 1, borderColor: 'rgba(200,180,140,0.3)', borderRadius: 12, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.6)', fontSize: 14, color: '#1e1e2e' },
  inputErr: { borderColor: '#c9a227' },
  button: { paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  buttonText: { fontSize: 14, fontWeight: '700' },
  backBtn: { marginTop: 16, alignItems: 'center' },
  backText: { color: '#b0a898', fontSize: 12 },
  modalOv: { flex: 1, backgroundColor: 'rgba(30,30,46,0.3)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  modalC: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 380, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(200,180,140,0.25)' },
  modalT: { fontSize: 18, fontWeight: '800', color: '#1e1e2e', marginBottom: 10 },
  modalM: { fontSize: 14, color: '#6b6352', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalBtn: { paddingVertical: 12, paddingHorizontal: 36, borderRadius: 12 },
  modalBtnT: { fontSize: 14, fontWeight: '700' },
});

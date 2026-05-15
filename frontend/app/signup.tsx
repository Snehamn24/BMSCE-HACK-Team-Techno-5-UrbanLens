import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Modal, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { ENV } from '../config/env';
import Footer from '../components/Footer';

const glass: any = Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } : {};

export default function SignUpScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [popup, setPopup] = useState({ visible: false, title: '', msg: '', success: false });
  const popupScale = useRef(new Animated.Value(0)).current;
  const showPopup = (t: string, m: string, ok = false) => { setPopup({ visible: true, title: t, msg: m, success: ok }); Animated.spring(popupScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start(); };
  const hidePopup = () => { Animated.timing(popupScale, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => { setPopup(p => ({ ...p, visible: false })); if (popup.success) router.replace('/citizen-login'); }); };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 2) e.fullName = 'Min 2 characters';
    if (!username.trim() || username.length < 3) e.username = 'Min 3 characters';
    if (!phone.trim() || !/^[6-9]\d{9}$/.test(phone)) e.phone = 'Valid 10-digit number';
    if (!address.trim()) e.address = 'Required';
    if (!password || password.length < 6) e.password = 'Min 6 characters';
    if (password !== confirmPassword) e.confirmPassword = 'Passwords must match';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/auth/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: fullName.trim(), username: username.trim(), phone, address: address.trim(), password }) });
      const data = await res.json();
      if (!res.ok) { showPopup('Registration Failed', data.error || 'Error'); return; }
      showPopup('Account Created', 'Your citizen account has been registered. Please sign in.', true);
    } catch { showPopup('Connection Error', 'Unable to reach the server.'); } finally { setLoading(false); }
  };

  const Field = ({ label, value, setter, k, placeholder, secure, keyboard, autoCapitalize }: any) => (
    <View style={{ marginBottom: 10 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={[s.input, errors[k] && s.inputErr]} placeholder={placeholder} placeholderTextColor="#b0a898" secureTextEntry={secure} keyboardType={keyboard || 'default'} autoCapitalize={autoCapitalize || 'none'} value={value} onChangeText={(v: string) => { setter(v); setErrors(p => ({ ...p, [k]: '' })); }} />
      {errors[k] ? <Text style={s.err}>{errors[k]}</Text> : null}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        <View style={[s.card, glass]}>
          <View style={s.header}>
            <View style={s.dot} />
            <Text style={s.title}>Create Account</Text>
            <Text style={s.subtitle}>Join UrbanLens as a citizen reporter</Text>
          </View>
          <Field label="Full Name" value={fullName} setter={setFullName} k="fullName" placeholder="Your full name" autoCapitalize="words" />
          <Field label="Username" value={username} setter={setUsername} k="username" placeholder="Choose a username" />
          <Field label="Phone Number" value={phone} setter={setPhone} k="phone" placeholder="10-digit mobile" keyboard="phone-pad" />
          <Field label="Address" value={address} setter={setAddress} k="address" placeholder="Your address" autoCapitalize="words" />
          <Field label="Password" value={password} setter={setPassword} k="password" placeholder="Min 6 characters" secure />
          <Field label="Confirm Password" value={confirmPassword} setter={setConfirmPassword} k="confirmPassword" placeholder="Re-enter password" secure />
          <TouchableOpacity style={[s.button, loading && { opacity: 0.6 }]} onPress={handleSignUp} disabled={loading}>
            <Text style={s.buttonText}>{loading ? 'Creating Account...' : 'Create Account'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.switchBtn} onPress={() => router.replace('/login')}>
            <Text style={s.switchText}>Already have an account? <Text style={s.switchLink}>Sign In</Text></Text>
          </TouchableOpacity>
        </View>
        <Footer />
      </ScrollView>
      <Modal visible={popup.visible} transparent animationType="none" onRequestClose={hidePopup}>
        <View style={s.modalOv}><Animated.View style={[s.modalC, glass, { transform: [{ scale: popupScale }] }]}>
          <Text style={s.modalT}>{popup.title}</Text><Text style={s.modalM}>{popup.msg}</Text>
          <TouchableOpacity style={[s.modalBtn, popup.success && { backgroundColor: '#4a7c59' }]} onPress={hidePopup}>
            <Text style={s.modalBtnT}>{popup.success ? 'Go to Login' : 'Dismiss'}</Text>
          </TouchableOpacity>
        </Animated.View></View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  page: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 24, padding: 32, width: '100%', maxWidth: 480, borderWidth: 1, borderColor: 'rgba(200,180,140,0.25)', marginBottom: 40 },
  header: { alignItems: 'center', marginBottom: 20 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#c9a227', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#1e1e2e' },
  subtitle: { fontSize: 13, color: '#8b7e6a', marginTop: 4 },
  label: { fontSize: 11, fontWeight: '700', color: '#1e1e2e', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: { height: 46, borderWidth: 1, borderColor: 'rgba(200,180,140,0.3)', borderRadius: 12, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.6)', fontSize: 14, color: '#1e1e2e' },
  inputErr: { borderColor: '#c9a227' },
  err: { color: '#c9a227', fontSize: 10, marginTop: 2 },
  button: { backgroundColor: '#1e1e2e', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  switchBtn: { marginTop: 16, alignItems: 'center' },
  switchText: { color: '#8b7e6a', fontSize: 13 },
  switchLink: { color: '#1e1e2e', fontWeight: '700' },
  modalOv: { flex: 1, backgroundColor: 'rgba(30,30,46,0.3)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  modalC: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 380, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(200,180,140,0.25)' },
  modalT: { fontSize: 18, fontWeight: '800', color: '#1e1e2e', marginBottom: 10 },
  modalM: { fontSize: 14, color: '#6b6352', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalBtn: { backgroundColor: '#1e1e2e', paddingVertical: 12, paddingHorizontal: 36, borderRadius: 12 },
  modalBtnT: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ENV } from '../config/env';

export default function OfficerLoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!email.trim().toLowerCase().endsWith('.gov.in')) e.email = 'Must be a valid .gov.in email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/auth/officer-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(prev => ({ ...prev, email: data.error || 'Invalid credentials' }));
        return;
      }
      login(data.token, data.user);
      if (Platform.OS === 'web') {
        window.alert('🎉 Login Successful! Welcome Officer!');
        router.replace('/officer-dashboard');
      } else {
        router.replace('/officer-dashboard');
      }
    } catch (err) {
      setErrors(prev => ({ ...prev, email: 'Cannot connect to server. Please try again later.' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Text style={styles.icon}>👷</Text>
          </View>
          <Text style={styles.title}>Officer Login</Text>
          <Text style={styles.subtitle}>Enter your official .gov.in email to continue</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Official Email</Text>
          <TextInput style={[styles.input, errors.email ? { borderColor: '#e53935' } : null]} placeholder="name@dept.gov.in"
            placeholderTextColor="#aaa" autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
            value={email} onChangeText={(t) => { setEmail(t); setErrors(prev => ({ ...prev, email: '' })); }} />
          {errors.email ? <Text style={{ color: '#e53935', fontSize: 12, marginTop: 4, marginLeft: 4 }}>{errors.email}</Text> : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput style={[styles.input, errors.password ? { borderColor: '#e53935' } : null]} placeholder="Enter your password"
            placeholderTextColor="#aaa" secureTextEntry
            value={password} onChangeText={(t) => { setPassword(t); setErrors(prev => ({ ...prev, password: '' })); }} />
          {errors.password ? <Text style={{ color: '#e53935', fontSize: 12, marginTop: 4, marginLeft: 4 }}>{errors.password}</Text> : null}
        </View>

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/login')}>
          <Text style={styles.backText}>← Back to role selection</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 28, backgroundColor: '#f0f7f0' },
  header: { alignItems: 'center', marginBottom: 32 },
  iconBox: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: '#e8f5e9',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  icon: { fontSize: 36 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1b5e20' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4, textAlign: 'center', paddingHorizontal: 20 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6, marginLeft: 2 },
  input: {
    height: 52, borderWidth: 1.5, borderColor: '#c8e6c9', borderRadius: 12,
    paddingHorizontal: 16, backgroundColor: '#fff', fontSize: 16, color: '#333',
  },
  button: {
    backgroundColor: '#2e7d32', paddingVertical: 15, borderRadius: 12,
    alignItems: 'center', marginTop: 8,
    shadowColor: '#2e7d32', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 5,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  backButton: { marginTop: 16, alignItems: 'center' },
  backText: { color: '#999', fontSize: 13 },
});

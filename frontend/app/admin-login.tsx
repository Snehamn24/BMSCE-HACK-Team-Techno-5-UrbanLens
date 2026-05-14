import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ENV } from '../config/env';

export default function AdminLoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!username.trim()) e.username = 'Admin Username is required';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) {
      Alert.alert('Missing Fields', 'Please fill out all required fields.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Login Failed', data.error || 'Invalid admin credentials');
        return;
      }
      login(data.token, data.user);
      if (Platform.OS === 'web') {
        window.alert('🎉 Login Successful! Welcome Admin!');
        router.replace('/admin-dashboard');
      } else {
        router.replace('/admin-dashboard');
      }
    } catch (err) {
      Alert.alert('Network Error', 'Cannot connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.iconBox}><Text style={styles.icon}>🛡️</Text></View>
          <Text style={styles.title}>Admin Portal</Text>
          <Text style={styles.subtitle}>Authorized personnel only</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Admin Username</Text>
          <TextInput style={[styles.input, errors.username ? { borderColor: '#e53935' } : null]} placeholder="Enter admin username"
            placeholderTextColor="#777" autoCapitalize="none" autoCorrect={false}
            value={username} onChangeText={(t) => { setUsername(t); setErrors(prev => ({ ...prev, username: '' })); }} />
          {errors.username ? <Text style={{ color: '#e53935', fontSize: 12, marginTop: 4, marginLeft: 4 }}>{errors.username}</Text> : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput style={[styles.input, errors.password ? { borderColor: '#e53935' } : null]} placeholder="Enter admin password"
            placeholderTextColor="#777" secureTextEntry
            value={password} onChangeText={(t) => { setPassword(t); setErrors(prev => ({ ...prev, password: '' })); }} />
          {errors.password ? <Text style={{ color: '#e53935', fontSize: 12, marginTop: 4, marginLeft: 4 }}>{errors.password}</Text> : null}
        </View>

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Authenticating...' : 'Access Dashboard'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/login')}>
          <Text style={styles.backText}>← Back to role selection</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 28, backgroundColor: '#1a1a2e' },
  header: { alignItems: 'center', marginBottom: 36 },
  iconBox: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: '#2d2d50',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    borderWidth: 2, borderColor: '#6a1b9a',
  },
  icon: { fontSize: 40 },
  title: { fontSize: 30, fontWeight: 'bold', color: '#e0e0e0' },
  subtitle: { fontSize: 14, color: '#888', marginTop: 4 },
  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#aaa', marginBottom: 6, marginLeft: 2 },
  input: {
    height: 52, borderWidth: 1.5, borderColor: '#3d3d60', borderRadius: 12,
    paddingHorizontal: 16, backgroundColor: '#2d2d50', fontSize: 16, color: '#e0e0e0',
  },
  button: {
    backgroundColor: '#6a1b9a', paddingVertical: 15, borderRadius: 12,
    alignItems: 'center', marginTop: 8,
    shadowColor: '#6a1b9a', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: 'bold', letterSpacing: 0.5 },
  backButton: { marginTop: 24, alignItems: 'center' },
  backText: { color: '#666', fontSize: 13 },
});

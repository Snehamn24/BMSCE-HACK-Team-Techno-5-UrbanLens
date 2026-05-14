import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ENV } from '../config/env';

export default function CitizenLoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!username.trim()) e.username = 'Username is required';
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
      const res = await fetch(`${ENV.API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Login Failed', data.error || 'Invalid credentials');
        return;
      }
      login(data.token, data.user);
      if (Platform.OS === 'web') {
        window.alert('🎉 Login Successful! Welcome back to Urban Lens!');
        router.replace('/citizen-dashboard');
      } else {
        Alert.alert('🎉 Login Successful', 'Welcome back to Urban Lens!');
        router.replace('/citizen-dashboard');
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
          <View style={styles.iconBox}>
            <Text style={styles.icon}>🏠</Text>
          </View>
          <Text style={styles.title}>Citizen Login</Text>
          <Text style={styles.subtitle}>Report issues & earn civic points</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput style={[styles.input, errors.username ? { borderColor: '#e53935' } : null]} placeholder="Enter your username"
            placeholderTextColor="#aaa" autoCapitalize="none" autoCorrect={false}
            value={username} onChangeText={(t) => { setUsername(t); setErrors(prev => ({ ...prev, username: '' })); }} />
          {errors.username ? <Text style={{ color: '#e53935', fontSize: 12, marginTop: 4, marginLeft: 4 }}>{errors.username}</Text> : null}
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

        <TouchableOpacity style={styles.switchButton} onPress={() => router.replace('/signup')}>
          <Text style={styles.switchText}>
            Don't have an account? <Text style={styles.switchLink}>Sign Up</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/login')}>
          <Text style={styles.backText}>← Back to role selection</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 28, backgroundColor: '#f4f6fb' },
  header: { alignItems: 'center', marginBottom: 32 },
  iconBox: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: '#e3f2fd',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  icon: { fontSize: 36 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a2e' },
  subtitle: { fontSize: 14, color: '#888', marginTop: 4 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6, marginLeft: 2 },
  input: {
    height: 52, borderWidth: 1.5, borderColor: '#dde1ea', borderRadius: 12,
    paddingHorizontal: 16, backgroundColor: '#fff', fontSize: 16, color: '#333',
  },
  button: {
    backgroundColor: '#1e90ff', paddingVertical: 15, borderRadius: 12,
    alignItems: 'center', marginTop: 8,
    shadowColor: '#1e90ff', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 5,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  switchButton: { marginTop: 20, alignItems: 'center' },
  switchText: { color: '#666', fontSize: 14 },
  switchLink: { color: '#1e90ff', fontWeight: 'bold' },
  backButton: { marginTop: 16, alignItems: 'center' },
  backText: { color: '#999', fontSize: 13 },
});

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ENV } from '../config/env';

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

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Full name is required';
    else if (fullName.trim().length < 2) e.fullName = 'Name must be at least 2 characters';

    if (!username.trim()) e.username = 'Username is required';
    else if (username.length < 3) e.username = 'Username must be at least 3 characters';
    else if (!/^[a-zA-Z0-9_]+$/.test(username)) e.username = 'Only letters, numbers, and underscores';

    if (!phone.trim()) e.phone = 'Phone number is required';
    else if (!/^[6-9]\d{9}$/.test(phone)) e.phone = 'Enter valid 10-digit Indian mobile number';

    if (!address.trim()) e.address = 'Address is required';

    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Minimum 6 characters';
    else if (!/[A-Z]/.test(password)) e.password = 'Must contain an uppercase letter';
    else if (!/[0-9]/.test(password)) e.password = 'Must contain a digit';

    if (!confirmPassword) e.confirmPassword = 'Confirm your password';
    else if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), username: username.trim(), phone, address: address.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Signup Failed', data.error || 'Something went wrong');
        return;
      }
      if (Platform.OS === 'web') {
        window.alert('🎉 Success! Account created! Please login.');
        router.replace('/citizen-login');
      } else {
        Alert.alert('🎉 Success!', 'Account created! Please login.');
        router.replace('/citizen-login');
      }
    } catch (err) {
      Alert.alert('Network Error', 'Cannot connect to server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (
    label: string, value: string, setter: (v: string) => void,
    key: string, opts: { placeholder?: string; secure?: boolean; keyboard?: any; autoCapitalize?: any } = {}
  ) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, errors[key] ? styles.inputError : null]}
        placeholder={opts.placeholder || label}
        placeholderTextColor="#aaa"
        secureTextEntry={opts.secure}
        keyboardType={opts.keyboard || 'default'}
        autoCapitalize={opts.autoCapitalize || 'none'}
        value={value}
        onChangeText={(t) => { setter(t); setErrors(prev => ({ ...prev, [key]: '' })); }}
      />
      {errors[key] ? <Text style={styles.errorText}>{errors[key]}</Text> : null}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.emoji}>🌆</Text>
          <Text style={styles.title}>Join Urban Lens</Text>
          <Text style={styles.subtitle}>Help us build a safer, cleaner city</Text>
        </View>

        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>🏠 Citizen Account</Text>
        </View>

        {renderField('Full Name', fullName, setFullName, 'fullName', { placeholder: 'Enter your full name', autoCapitalize: 'words' })}
        {renderField('Username', username, setUsername, 'username', { placeholder: 'Choose a username' })}
        {renderField('Phone Number', phone, setPhone, 'phone', { placeholder: '10-digit mobile number', keyboard: 'phone-pad' })}
        {renderField('Full Address', address, setAddress, 'address', { placeholder: 'Enter your complete address', autoCapitalize: 'words' })}
        {renderField('Password', password, setPassword, 'password', { placeholder: 'Min 6 chars, 1 uppercase, 1 digit', secure: true })}
        {renderField('Confirm Password', confirmPassword, setConfirmPassword, 'confirmPassword', { placeholder: 'Re-enter password', secure: true })}

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignUp} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Creating Account...' : 'Create Account'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.switchButton} onPress={() => router.replace('/login')}>
          <Text style={styles.switchText}>
            Already have an account? <Text style={styles.switchLink}>Login</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#f4f6fb' },
  header: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
  emoji: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a2e' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  roleBadge: {
    alignSelf: 'center', backgroundColor: '#e3f2fd', paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, marginBottom: 20,
  },
  roleBadgeText: { color: '#1565c0', fontWeight: '600', fontSize: 13 },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6, marginLeft: 2 },
  input: {
    height: 50, borderWidth: 1.5, borderColor: '#dde1ea', borderRadius: 12,
    paddingHorizontal: 16, backgroundColor: '#fff', fontSize: 15, color: '#333',
  },
  inputError: { borderColor: '#e53935' },
  errorText: { color: '#e53935', fontSize: 12, marginTop: 4, marginLeft: 4 },
  button: {
    backgroundColor: '#1e90ff', paddingVertical: 15, borderRadius: 12,
    alignItems: 'center', marginTop: 10,
    shadowColor: '#1e90ff', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 5,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  switchButton: { marginTop: 20, alignItems: 'center', paddingVertical: 8 },
  switchText: { color: '#666', fontSize: 14 },
  switchLink: { color: '#1e90ff', fontWeight: 'bold' },
});
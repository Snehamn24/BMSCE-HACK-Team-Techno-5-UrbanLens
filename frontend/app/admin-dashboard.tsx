import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ENV } from '../config/env';

type Officer = {
  id: number;
  fullName: string;
  phone: string;
  email: string;
  municipalArea: string;
  issuesResolved: number;
  createdAt: string;
};

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [municipalArea, setMunicipalArea] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchOfficers = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/officers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOfficers(data.officers);
      }
    } catch (err) {
      console.error('Failed to fetch officers', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOfficers();
  }, [token]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Required';
    if (!phone.trim() || !/^[6-9]\d{9}$/.test(phone)) e.phone = 'Valid 10-digit phone required';
    if (!municipalArea.trim()) e.municipalArea = 'Required';
    if (!email.trim() || !email.trim().toLowerCase().endsWith('.gov.in')) e.email = 'Must end with .gov.in';
    if (!password || password.length < 6) e.password = 'Min 6 chars required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreateOfficer = async () => {
    if (!validate()) return;
    setCreating(true);
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/officers/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ fullName, phone, email, municipalArea, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        Alert.alert('Success', 'Municipal officer account created successfully!');
        setFullName(''); setPhone(''); setEmail(''); setMunicipalArea(''); setPassword('');
        fetchOfficers();
      } else {
        Alert.alert('Creation Failed', data.error || 'Something went wrong');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error while creating officer.');
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  if (!user || user.role !== 'admin') {
    return (
      <View style={styles.centerContainer}>
        <Text>Unauthorized access.</Text>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.replace('/admin-login')}>
          <Text style={styles.actionButtonText}>Go to Admin Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOfficers(); }} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Admin Portal</Text>
          <Text style={styles.name}>System Administrator</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Create Municipal Officer</Text>
        
        <View style={styles.inputRow}>
          <View style={styles.flex1}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} value={fullName} onChangeText={(t) => { setFullName(t); setErrors(p => ({...p, fullName: ''})) }} placeholder="John Doe" />
            {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
          </View>
          <View style={{ width: 10 }} />
          <View style={styles.flex1}>
            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} value={phone} onChangeText={(t) => { setPhone(t); setErrors(p => ({...p, phone: ''})) }} placeholder="9876543210" keyboardType="numeric" />
            {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
          </View>
        </View>

        <View style={styles.inputRow}>
          <View style={styles.flex1}>
            <Text style={styles.label}>Gov Email (.gov.in)</Text>
            <TextInput style={styles.input} value={email} onChangeText={(t) => { setEmail(t); setErrors(p => ({...p, email: ''})) }} placeholder="officer@bbmp.gov.in" autoCapitalize="none" />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>
        </View>

        <View style={styles.inputRow}>
          <View style={styles.flex1}>
            <Text style={styles.label}>Municipal Area</Text>
            <TextInput style={styles.input} value={municipalArea} onChangeText={(t) => { setMunicipalArea(t); setErrors(p => ({...p, municipalArea: ''})) }} placeholder="e.g. Koramangala Ward 151" />
            {errors.municipalArea ? <Text style={styles.errorText}>{errors.municipalArea}</Text> : null}
          </View>
          <View style={{ width: 10 }} />
          <View style={styles.flex1}>
            <Text style={styles.label}>Set Password</Text>
            <TextInput style={styles.input} value={password} onChangeText={(t) => { setPassword(t); setErrors(p => ({...p, password: ''})) }} placeholder="Temp password" secureTextEntry />
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>
        </View>

        <TouchableOpacity style={[styles.createBtn, creating && { opacity: 0.7 }]} onPress={handleCreateOfficer} disabled={creating}>
          <Text style={styles.createBtnText}>{creating ? 'Creating...' : 'Create Officer Account'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Registered Municipal Officers</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#1e90ff" style={{ marginTop: 20 }} />
      ) : officers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No municipal officers registered yet.</Text>
        </View>
      ) : (
        officers.map(off => (
          <View key={off.id} style={styles.officerCard}>
            <View style={styles.offHeader}>
              <Text style={styles.offName}>{off.fullName}</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>{off.issuesResolved} Resolved</Text></View>
            </View>
            <Text style={styles.offDetail}>📍 Area: {off.municipalArea}</Text>
            <Text style={styles.offDetail}>✉️ Email: {off.email}</Text>
            <Text style={styles.offDetail}>📞 Phone: {off.phone}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  container: { flexGrow: 1, backgroundColor: '#f4f6fb', padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 10, marginBottom: 20 },
  greeting: { fontSize: 16, color: '#666' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#1a1a2e', marginTop: 4 },
  logoutBtn: { backgroundColor: '#ffebee', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: '#c62828', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 24, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 } },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 12 },
  inputRow: { flexDirection: 'row', marginBottom: 12 },
  flex1: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 4 },
  input: { height: 44, borderWidth: 1, borderColor: '#eee', borderRadius: 8, paddingHorizontal: 12, backgroundColor: '#fafafa' },
  errorText: { color: '#e53935', fontSize: 11, marginTop: 2 },
  createBtn: { backgroundColor: '#1a1a2e', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  createBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  emptyState: { backgroundColor: '#fff', padding: 20, borderRadius: 8, alignItems: 'center' },
  emptyStateText: { color: '#888' },
  officerCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#2e7d32' },
  offHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  offName: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e' },
  badge: { backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#2e7d32', fontSize: 12, fontWeight: 'bold' },
  offDetail: { fontSize: 13, color: '#666', marginBottom: 4 },
  actionButton: { marginTop: 16, backgroundColor: '#1e90ff', padding: 12, borderRadius: 8 },
  actionButtonText: { color: '#fff', fontWeight: 'bold' }
});

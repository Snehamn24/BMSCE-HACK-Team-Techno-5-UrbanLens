import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, Image, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ENV } from '../config/env';

type Issue = {
  id: number;
  type: string;
  status: string;
  severity: string;
  description: string;
  image_url: string;
  latitude: number;
  longitude: number;
  reported_at: string;
  upvotes: number;
};

export default function CitizenDashboardScreen() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyIssues = async () => {
    if (!user || !token) return;
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/issues?reportedBy=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIssues(data.issues);
      }
    } catch (err) {
      console.error('Failed to fetch issues', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyIssues();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyIssues();
  };

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text>Please log in to view your dashboard.</Text>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.replace('/citizen-login')}>
          <Text style={styles.actionButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{user.fullName}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{user.points}</Text>
          <Text style={styles.statLabel}>Civic Points</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{user.badge === 'gold' ? '🏆' : user.badge === 'silver' ? '🥈' : '🥉'}</Text>
          <Text style={styles.statLabel}>{user.badge ? user.badge.charAt(0).toUpperCase() + user.badge.slice(1) : 'Bronze'} Badge</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.reportButton} onPress={() => router.push('/issues')}>
        <Text style={styles.reportButtonText}>+ Report New Civic Issue</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>My Reports</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#1e90ff" style={{ marginTop: 20 }} />
      ) : issues.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>You haven't reported any issues yet.</Text>
          <Text style={styles.emptyStateSubtext}>Help your community by reporting potholes, garbage, and more.</Text>
        </View>
      ) : (
        issues.map((issue) => (
          <View key={issue.id} style={styles.issueCard}>
            <View style={styles.issueHeader}>
              <Text style={styles.issueType}>{issue.type.toUpperCase()}</Text>
              <View style={[styles.statusBadge, issue.status === 'resolved' ? styles.statusResolved : issue.status === 'in_progress' ? styles.statusProgress : styles.statusPending]}>
                <Text style={[styles.statusText, issue.status === 'resolved' ? styles.statusTextResolved : issue.status === 'in_progress' ? styles.statusTextProgress : styles.statusTextPending]}>
                  {issue.status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            {issue.image_url && (
              <Image source={{ uri: `${ENV.API_BASE_URL}${issue.image_url}` }} style={styles.issueImage} />
            )}

            <Text style={styles.issueDesc}>{issue.description || 'No description provided.'}</Text>
            
            {issue.latitude && issue.longitude && Platform.OS === 'web' && (
              <View style={styles.mapContainer}>
                {/* @ts-ignore */}
                <iframe 
                  width="100%" 
                  height="120" 
                  style={{ border: 0, borderRadius: 8 }} 
                  loading="lazy"
                  src={`https://maps.google.com/maps?q=${issue.latitude},${issue.longitude}&z=15&output=embed`}
                />
              </View>
            )}

            <View style={styles.issueFooter}>
              <Text style={styles.issueDate}>{new Date(issue.reported_at).toLocaleDateString()}</Text>
              <Text style={styles.issueUpvotes}>⬆ {issue.upvotes} Upvotes</Text>
            </View>
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
  logoutBtn: { backgroundColor: '#eef2f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: '#666', fontWeight: '600' },
  statsCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#1e90ff', marginBottom: 4 },
  statLabel: { fontSize: 13, color: '#888', fontWeight: '500' },
  divider: { width: 1, backgroundColor: '#eee', marginHorizontal: 10 },
  reportButton: { backgroundColor: '#1e90ff', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 24, shadowColor: '#1e90ff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  reportButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 12 },
  emptyState: { backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#eee', borderStyle: 'dashed' },
  emptyStateText: { fontSize: 15, fontWeight: '600', color: '#444', marginBottom: 8 },
  emptyStateSubtext: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 },
  issueCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  issueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  issueType: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusPending: { backgroundColor: '#fff3e0' },
  statusProgress: { backgroundColor: '#e3f2fd' },
  statusResolved: { backgroundColor: '#e8f5e9' },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  statusTextPending: { color: '#f57c00' },
  statusTextProgress: { color: '#1976d2' },
  statusTextResolved: { color: '#388e3c' },
  issueImage: { width: '100%', height: 180, borderRadius: 8, marginBottom: 12 },
  issueDesc: { fontSize: 15, color: '#333', marginBottom: 12, lineHeight: 22 },
  mapContainer: { width: '100%', height: 120, marginBottom: 12, borderRadius: 8, overflow: 'hidden' },
  issueFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  issueDate: { fontSize: 13, color: '#888' },
  issueUpvotes: { fontSize: 13, color: '#1e90ff', fontWeight: '600' },
  actionButton: { marginTop: 16, backgroundColor: '#1e90ff', padding: 12, borderRadius: 8 },
  actionButtonText: { color: '#fff', fontWeight: 'bold' }
});

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, RefreshControl, Image, Modal, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { ENV } from '../config/env';

type Issue = {
  id: number;
  type: string;
  description: string;
  status: string;
  image_url: string;
  after_image_url: string;
  reported_at: string;
  resolved_at: string;
  upvotes: number;
  reporter_name: string;
  latitude: number;
  longitude: number;
};

export default function OfficerDashboardScreen() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, in_progress, resolved

  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [afterImageUri, setAfterImageUri] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const fetchIssues = async () => {
    if (!token) return;
    try {
      // For demo, we just fetch all issues and filter locally or we could pass ?assignedTo=...
      // The requirement: "all issues to be displayed and filter according to the city"
      const res = await fetch(`${ENV.API_BASE_URL}/issues`, {
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
    fetchIssues();
  }, [token]);

  const updateStatus = async (id: number, status: string) => {
    if (status === 'resolved') {
      const issue = issues.find(i => i.id === id);
      setActiveIssue(issue || null);
      setAfterImageUri(null);
      setModalVisible(true);
      return;
    }

    try {
      const res = await fetch(`${ENV.API_BASE_URL}/issues/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchIssues();
      else Alert.alert('Error', 'Failed to update status');
    } catch (e) {
      Alert.alert('Error', 'Network error.');
    }
  };

  const pickAfterImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
    });
    if (!result.canceled) setAfterImageUri(result.assets[0].uri);
  };

  const submitResolution = async () => {
    if (!afterImageUri || !activeIssue) {
      Alert.alert('Image Required', 'Please upload an After image showing the resolved issue.');
      return;
    }

    setResolving(true);
    try {
      // 1. Upload After Image
      const formData = new FormData();
      const filename = afterImageUri.split('/').pop() || 'after.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;
      
      // @ts-ignore
      formData.append('afterImage', { uri: afterImageUri, name: filename, type });

      const imgRes = await fetch(`${ENV.API_BASE_URL}/issues/${activeIssue.id}/after-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!imgRes.ok) throw new Error('Failed to upload image');

      // 2. Mark as resolved
      const statusRes = await fetch(`${ENV.API_BASE_URL}/issues/${activeIssue.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'resolved' })
      });

      if (!statusRes.ok) throw new Error('Failed to update status');

      Alert.alert('Success', 'Issue marked as resolved!');
      setModalVisible(false);
      fetchIssues();
    } catch (err) {
      Alert.alert('Error', 'Failed to resolve issue.');
    } finally {
      setResolving(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  const filteredIssues = issues.filter(i => {
    if (filter !== 'all' && i.status !== filter) return false;
    return true; // You can add city filtering here if needed based on `i.latitude/longitude`
  });

  const getDaysTaken = (reported: string, resolved: string) => {
    const diffTime = Math.abs(new Date(resolved).getTime() - new Date(reported).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays;
  };

  if (!user || user.role !== 'officer') {
    return (
      <View style={styles.centerContainer}>
        <Text>Unauthorized access.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f4f6fb' }}>
      <ScrollView 
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchIssues(); }} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Officer Portal</Text>
            <Text style={styles.name}>{user.fullName}</Text>
            <Text style={styles.area}>📍 Area: {user.municipalArea}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterTabs}>
          {['all', 'pending', 'in_progress', 'resolved'].map(f => (
            <TouchableOpacity 
              key={f} 
              style={[styles.tab, filter === f && styles.activeTab]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.tabText, filter === f && styles.activeTabText]}>
                {f === 'in_progress' ? 'Working' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#1e90ff" style={{ marginTop: 20 }} />
        ) : filteredIssues.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No issues found for this filter.</Text>
          </View>
        ) : (
          filteredIssues.map(issue => (
            <View key={issue.id} style={styles.issueCard}>
              <View style={styles.issueHeader}>
                <View style={styles.issueTypeBadge}>
                  <Text style={styles.issueType}>{issue.type.toUpperCase()}</Text>
                </View>
                <Text style={styles.issueStatus}>{issue.status}</Text>
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
                    height="160" 
                    style={{ border: 0, borderRadius: 8 }} 
                    loading="lazy"
                    src={`https://maps.google.com/maps?q=${issue.latitude},${issue.longitude}&z=15&output=embed`}
                  />
                </View>
              )}

              <Text style={styles.metaText}>📅 Reported: {new Date(issue.reported_at).toLocaleDateString()}</Text>
              <Text style={styles.metaText}>👤 By: {issue.reporter_name || 'Citizen'}</Text>
              <Text style={styles.metaText}>👍 Upvotes: {issue.upvotes}</Text>

              {issue.status === 'resolved' && issue.resolved_at && (
                <View style={styles.resolvedBox}>
                  <Text style={styles.resolvedText}>✅ Resolved in {getDaysTaken(issue.reported_at, issue.resolved_at)} days</Text>
                  {issue.after_image_url && (
                    <Image source={{ uri: `${ENV.API_BASE_URL}${issue.after_image_url}` }} style={styles.afterImage} />
                  )}
                </View>
              )}

              {issue.status !== 'resolved' && (
                <View style={styles.actionRow}>
                  {issue.status === 'pending' && (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ff9800' }]} onPress={() => updateStatus(issue.id, 'in_progress')}>
                      <Text style={styles.actionBtnText}>Accept & Work</Text>
                    </TouchableOpacity>
                  )}
                  {(issue.status === 'pending' || issue.status === 'in_progress') && (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4caf50' }]} onPress={() => updateStatus(issue.id, 'resolved')}>
                      <Text style={styles.actionBtnText}>Mark Resolved</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Resolution Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Resolve Issue #{activeIssue?.id}</Text>
            <Text style={styles.modalDesc}>Please upload a photo of the completed work.</Text>
            
            <TouchableOpacity style={styles.uploadBtn} onPress={pickAfterImage}>
              {afterImageUri ? (
                <Image source={{ uri: afterImageUri }} style={styles.uploadPreview} />
              ) : (
                <Text style={styles.uploadBtnText}>📷 Upload After Image</Text>
              )}
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={resolving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitModalBtn} onPress={submitResolution} disabled={resolving || !afterImageUri}>
                <Text style={styles.submitModalBtnText}>{resolving ? 'Saving...' : 'Submit Resolution'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 10, marginBottom: 20 },
  greeting: { fontSize: 16, color: '#666' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#1a1a2e', marginTop: 4 },
  area: { fontSize: 14, color: '#2e7d32', marginTop: 4, fontWeight: '500' },
  logoutBtn: { backgroundColor: '#ffebee', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: '#c62828', fontWeight: '600' },
  
  filterTabs: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: '#eef2f6' },
  tabText: { color: '#666', fontSize: 13, fontWeight: '600' },
  activeTabText: { color: '#1e90ff' },

  emptyState: { backgroundColor: '#fff', padding: 20, borderRadius: 8, alignItems: 'center' },
  emptyStateText: { color: '#888' },

  issueCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  issueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  issueTypeBadge: { backgroundColor: '#eef2f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  issueType: { color: '#1a1a2e', fontSize: 12, fontWeight: 'bold' },
  issueStatus: { color: '#888', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  issueImage: { width: '100%', height: 180, borderRadius: 8, marginBottom: 12 },
  issueDesc: { fontSize: 15, color: '#333', marginBottom: 12, lineHeight: 22 },
  metaText: { fontSize: 12, color: '#888', marginBottom: 4 },

  resolvedBox: { marginTop: 12, backgroundColor: '#e8f5e9', padding: 12, borderRadius: 8 },
  resolvedText: { color: '#2e7d32', fontWeight: 'bold', marginBottom: 8 },
  afterImage: { width: '100%', height: 150, borderRadius: 8 },

  actionRow: { flexDirection: 'row', marginTop: 16, gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 },
  modalContent: { backgroundColor: '#fff', width: '100%', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: '#1a1a2e' },
  modalDesc: { fontSize: 14, color: '#666', marginBottom: 20 },
  uploadBtn: { width: '100%', height: 160, backgroundColor: '#f4f6fb', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', marginBottom: 20 },
  uploadBtnText: { color: '#888', fontWeight: 'bold' },
  uploadPreview: { width: '100%', height: '100%', borderRadius: 12 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: '#eee', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  cancelBtnText: { color: '#444', fontWeight: 'bold' },
  submitModalBtn: { flex: 1, backgroundColor: '#4caf50', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  submitModalBtnText: { color: '#fff', fontWeight: 'bold' }
});

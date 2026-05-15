import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl, Image, Modal, Platform, TextInput, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { ENV } from '../config/env';

type Issue = { id: number; type: string; severity: string; description: string; status: string; image_url: string; after_image_url: string; reported_at: string; resolved_at: string; upvotes: number; reporter_name: string; latitude: number; longitude: number; ward_id: number; ward_office_name: string; ward_number: string; ward_area: string; ai_confidence?: number; };

const typeFilters = [
  { id: 'all', label: 'All', emoji: '📋' }, { id: 'pothole', label: 'Pothole', emoji: '🕳️' },
  { id: 'garbage', label: 'Garbage', emoji: '🗑️' }, { id: 'streetlight', label: 'Light', emoji: '💡' },
  { id: 'drainage', label: 'Drain', emoji: '💧' }, { id: 'tree', label: 'Tree', emoji: '🌳' },
];

const sevColors: Record<string, string> = { low: '#059669', medium: '#d97706', high: '#ef4444' };

export default function OfficerDashboardScreen() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [afterImageUri, setAfterImageUri] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxUri, setLightboxUri] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(); }, []);

  const fetchIssues = async () => {
    if (!token) return;
    try {
      const wardParam = user?.wardId ? `?wardId=${user.wardId}` : '';
      const res = await fetch(`${ENV.API_BASE_URL}/issues${wardParam}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setIssues(d.issues); }
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchIssues(); }, [token]);

  const updateStatus = async (id: number, status: string) => {
    if (status === 'resolved') { setActiveIssue(issues.find(i => i.id === id) || null); setAfterImageUri(null); setModalVisible(true); return; }
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/issues/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) });
      if (res.ok) fetchIssues();
    } catch {}
  };

  const pickAfterImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.5 });
    if (!result.canceled) setAfterImageUri(result.assets[0].uri);
  };

  const submitResolution = async () => {
    if (!afterImageUri || !activeIssue) return;
    setResolving(true);
    try {
      const formData = new FormData();
      const filename = afterImageUri.split('/').pop() || 'after.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;
      // @ts-ignore
      formData.append('afterImage', { uri: afterImageUri, name: filename, type });
      await fetch(`${ENV.API_BASE_URL}/issues/${activeIssue.id}/after-image`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
      await fetch(`${ENV.API_BASE_URL}/issues/${activeIssue.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status: 'resolved' }) });
      setModalVisible(false); fetchIssues();
    } catch {} finally { setResolving(false); }
  };

  const filtered = issues.filter(i => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (typeFilter !== 'all' && i.type !== typeFilter) return false;
    if (search.trim()) { const s = search.trim().toLowerCase(); if (!(i.description || '').toLowerCase().includes(s) && !(i.reporter_name || '').toLowerCase().includes(s)) return false; }
    return true;
  });

  const total = issues.length;
  const pendingC = issues.filter(i => i.status === 'pending').length;
  const progressC = issues.filter(i => i.status === 'in_progress').length;
  const resolvedC = issues.filter(i => i.status === 'resolved').length;

  if (!user || user.role !== 'officer') return (<View style={s.center}><Text style={{ color: '#64748b' }}>Unauthorized access.</Text></View>);

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4f8' }}>
      <ScrollView contentContainerStyle={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchIssues(); }} tintColor="#059669" />}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={s.header}>
            <View><Text style={s.greeting}>Officer Portal</Text><Text style={s.name}>{user.fullName}</Text><Text style={s.area}>📍 {user.municipalArea}</Text></View>
            <TouchableOpacity style={s.logoutBtn} onPress={() => { logout(); router.replace('/'); }}><Text style={s.logoutText}>Logout</Text></TouchableOpacity>
          </View>

          <View style={s.statsRow}>
            {[{ emoji: '📊', val: total, label: 'Total', color: '#0891b2' }, { emoji: '⏳', val: pendingC, label: 'Pending', color: '#d97706' },
              { emoji: '🔧', val: progressC, label: 'Working', color: '#3b82f6' }, { emoji: '✅', val: resolvedC, label: 'Done', color: '#059669' }].map((st2, i) => (
              <View key={i} style={[s.statCard, { borderTopColor: st2.color }]}>
                <Text style={{ fontSize: 20, marginBottom: 4 }}>{st2.emoji}</Text>
                <Text style={[s.statVal, { color: st2.color }]}>{st2.val}</Text>
                <Text style={s.statLbl}>{st2.label}</Text>
              </View>
            ))}
          </View>

          <View style={s.searchBar}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
            <TextInput style={s.searchInput} placeholder="Search..." placeholderTextColor="#94a3b8" value={search} onChangeText={setSearch} />
            {search ? <TouchableOpacity onPress={() => setSearch('')}><Text style={{ color: '#94a3b8' }}>✕</Text></TouchableOpacity> : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, maxHeight: 44 }}>
            {typeFilters.map(tf => (
              <TouchableOpacity key={tf.id} style={[s.typeChip, typeFilter === tf.id && s.typeChipActive]} onPress={() => setTypeFilter(tf.id)}>
                <Text style={{ fontSize: 14, marginRight: 4 }}>{tf.emoji}</Text>
                <Text style={[s.typeChipText, typeFilter === tf.id && { color: '#fff' }]}>{tf.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={s.filterTabs}>
            {['all', 'pending', 'in_progress', 'resolved'].map(f => (
              <TouchableOpacity key={f} style={[s.tab, statusFilter === f && s.activeTab]} onPress={() => setStatusFilter(f)}>
                <Text style={[s.tabText, statusFilter === f && s.activeTabText]}>{f === 'in_progress' ? 'Working' : f.charAt(0).toUpperCase() + f.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? <ActivityIndicator size="large" color="#059669" style={{ marginTop: 20 }} /> :
           filtered.length === 0 ? <View style={s.empty}><Text style={{ fontSize: 40, marginBottom: 10 }}>📭</Text><Text style={{ color: '#94a3b8', fontSize: 15 }}>No issues found.</Text></View> :
           filtered.map(issue => (
            <View key={issue.id} style={s.issueCard}>
              <View style={s.issueHeader}>
                <View style={s.typeBadge}><Text style={s.typeText}>{typeFilters.find(t => t.id === issue.type)?.emoji || '📋'} {issue.type.toUpperCase()}</Text></View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[s.sevDot, { backgroundColor: sevColors[issue.severity] || '#94a3b8' }]} />
                  <Text style={[s.issueStatus, { color: issue.status === 'resolved' ? '#059669' : issue.status === 'in_progress' ? '#3b82f6' : '#d97706' }]}>{issue.status.replace('_', ' ').toUpperCase()}</Text>
                </View>
              </View>
              {issue.ai_confidence != null && <View style={s.aiBadge}><Text style={s.aiBadgeText}>🤖 AI {Math.round((issue.ai_confidence as number) * 100)}%</Text></View>}
              {issue.image_url && (
                <TouchableOpacity onPress={() => { setLightboxUri(`${ENV.API_BASE_URL.replace('/api', '')}${issue.image_url}`); setLightboxVisible(true); }}>
                  <Image source={{ uri: `${ENV.API_BASE_URL.replace('/api', '')}${issue.image_url}` }} style={s.thumb} />
                </TouchableOpacity>
              )}
              <Text style={s.desc}>{issue.description || 'No description.'}</Text>
              {issue.ward_office_name && <View style={s.wardBadge}><Text style={s.wardText}>🏛️ {issue.ward_office_name} - Ward {issue.ward_number}</Text></View>}
              {issue.latitude && issue.longitude && Platform.OS === 'web' && (
                <View style={s.mapWrap}>{/* @ts-ignore */}<iframe width="100%" height="140" style={{ border: 0, borderRadius: 8 }} loading="lazy" src={`https://maps.google.com/maps?q=${issue.latitude},${issue.longitude}&z=15&output=embed`} /></View>
              )}
              <View style={s.metaRow}>
                <Text style={s.meta}>📅 {new Date(issue.reported_at).toLocaleDateString()}</Text>
                <Text style={s.meta}>👤 {issue.reporter_name || 'Citizen'}</Text>
                <Text style={s.meta}>👍 {issue.upvotes}</Text>
              </View>
              {issue.status === 'resolved' && issue.after_image_url && (
                <View style={s.resolvedBox}>
                  <Text style={s.resolvedText}>✅ Resolved</Text>
                  <TouchableOpacity onPress={() => { setLightboxUri(`${ENV.API_BASE_URL.replace('/api', '')}${issue.after_image_url}`); setLightboxVisible(true); }}>
                    <Image source={{ uri: `${ENV.API_BASE_URL.replace('/api', '')}${issue.after_image_url}` }} style={s.afterThumb} />
                  </TouchableOpacity>
                </View>
              )}
              {issue.status !== 'resolved' && (
                <View style={s.actionRow}>
                  {issue.status === 'pending' && <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#d97706' }]} onPress={() => updateStatus(issue.id, 'in_progress')}><Text style={s.actionBtnText}>🔧 Accept</Text></TouchableOpacity>}
                  {(issue.status === 'pending' || issue.status === 'in_progress') && <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#059669' }]} onPress={() => updateStatus(issue.id, 'resolved')}><Text style={s.actionBtnText}>✅ Resolve</Text></TouchableOpacity>}
                </View>
              )}
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.modalOv}><View style={s.modalC}>
          <Text style={s.modalTitle}>📸 Resolve Issue #{activeIssue?.id}</Text>
          <Text style={s.modalDesc}>Upload a photo showing the completed repair.</Text>
          <TouchableOpacity style={s.uploadBtn} onPress={pickAfterImage}>
            {afterImageUri ? <Image source={{ uri: afterImageUri }} style={s.uploadPreview} /> :
             <View style={{ alignItems: 'center' }}><Text style={{ fontSize: 40, marginBottom: 8 }}>📷</Text><Text style={{ color: '#64748b', fontWeight: '700' }}>Upload After Image</Text></View>}
          </TouchableOpacity>
          <View style={s.modalActions}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setModalVisible(false)} disabled={resolving}><Text style={{ color: '#475569', fontWeight: '700' }}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[s.submitBtn, (!afterImageUri || resolving) && { opacity: 0.5 }]} onPress={submitResolution} disabled={resolving || !afterImageUri}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{resolving ? 'Saving...' : '✅ Submit'}</Text>
            </TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      <Modal visible={lightboxVisible} transparent animationType="fade">
        <View style={s.lightboxOv}>
          <TouchableOpacity style={s.lightboxClose} onPress={() => setLightboxVisible(false)}><Text style={{ color: '#fff', fontWeight: '700' }}>✕ Close</Text></TouchableOpacity>
          {lightboxUri ? <Image source={{ uri: lightboxUri }} style={s.lightboxImg} resizeMode="contain" /> : null}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8' },
  container: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 10, marginBottom: 16 },
  greeting: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  name: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  area: { fontSize: 13, color: '#059669', marginTop: 4, fontWeight: '700' },
  logoutBtn: { backgroundColor: '#fef2f2', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', borderTopWidth: 3, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  statVal: { fontSize: 22, fontWeight: '800' },
  statLbl: { fontSize: 10, color: '#94a3b8', fontWeight: '700', marginTop: 2 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a' },
  typeChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1.5, borderColor: '#e2e8f0' },
  typeChipActive: { backgroundColor: '#059669', borderColor: '#059669' },
  typeChipText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  filterTabs: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#059669' },
  tabText: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  activeTabText: { color: '#fff' },
  empty: { backgroundColor: '#fff', padding: 30, borderRadius: 16, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  issueCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  issueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeBadge: { backgroundColor: '#f0f4f8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  typeText: { color: '#0f172a', fontSize: 12, fontWeight: '800' },
  sevDot: { width: 8, height: 8, borderRadius: 4 },
  issueStatus: { fontSize: 11, fontWeight: '800' },
  aiBadge: { backgroundColor: '#ede9fe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  aiBadgeText: { fontSize: 10, fontWeight: '800', color: '#7c3aed' },
  thumb: { width: '100%', height: 120, borderRadius: 12, marginBottom: 8 },
  desc: { fontSize: 14, color: '#475569', marginBottom: 8, lineHeight: 20 },
  wardBadge: { backgroundColor: '#f0f9ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  wardText: { fontSize: 11, color: '#0891b2', fontWeight: '700' },
  mapWrap: { width: '100%', height: 140, marginBottom: 10, borderRadius: 8, overflow: 'hidden' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 4 },
  meta: { fontSize: 11, color: '#94a3b8', marginBottom: 4 },
  resolvedBox: { marginTop: 10, backgroundColor: '#d1fae5', padding: 12, borderRadius: 12 },
  resolvedText: { color: '#059669', fontWeight: '700', fontSize: 13, marginBottom: 8 },
  afterThumb: { width: '100%', height: 80, borderRadius: 8 },
  actionRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modalOv: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.4)', padding: 20 },
  modalC: { backgroundColor: '#fff', width: '100%', maxWidth: 440, borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8, color: '#0f172a' },
  modalDesc: { fontSize: 13, color: '#64748b', marginBottom: 20 },
  uploadBtn: { width: '100%', height: 180, backgroundColor: '#f8fafc', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', marginBottom: 20 },
  uploadPreview: { width: '100%', height: '100%', borderRadius: 16 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitBtn: { flex: 1, backgroundColor: '#059669', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  lightboxOv: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  lightboxClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  lightboxImg: { width: '90%', height: '70%', borderRadius: 8 },
});

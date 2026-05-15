import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Image, Platform, Modal, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ENV } from '../config/env';
import Footer from '../components/Footer';
import * as ImagePicker from 'expo-image-picker';

type Issue = { id: number; type: string; status: string; severity: string; description: string; image_url: string; after_image_url: string; latitude: number; longitude: number; reported_at: string; resolved_at: string; upvotes: number; ai_confidence?: number; ward_office_name?: string; ward_number?: string; };

const glass: any = Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } : {};
const sevColors: Record<string, string> = { low: '#4a7c59', medium: '#c9a227', high: '#b8393b' };

export default function OfficerDashboardScreen() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [popup, setPopup] = useState({ visible: false, title: '', msg: '' });
  const popupScale = useRef(new Animated.Value(0)).current;
  const showPopup = (t: string, m: string) => { setPopup({ visible: true, title: t, msg: m }); Animated.spring(popupScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start(); };
  const hidePopup = () => { Animated.timing(popupScale, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setPopup(p => ({ ...p, visible: false }))); };

  const fetchIssues = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/issues/officer`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setIssues(d.issues || []); }
    } catch (err) { console.error('Fetch error', err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchIssues(); }, [user]);

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/issues/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) });
      if (res.ok) { showPopup('Updated', `Issue #${id} marked as ${status.replace('_', ' ')}.`); fetchIssues(); }
    } catch { showPopup('Error', 'Failed to update status.'); }
  };

  const uploadAfterImage = async (id: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    const form = new FormData();
    form.append('afterImage', { uri, name: 'after.jpg', type: 'image/jpeg' } as any);
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/issues/${id}/after-image`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: form });
      if (res.ok) { showPopup('Uploaded', 'After-repair image uploaded.'); fetchIssues(); }
    } catch { showPopup('Error', 'Failed to upload.'); }
  };

  const filtered = filter === 'all' ? issues : issues.filter(i => i.status === filter);
  const pendingCount = issues.filter(i => i.status === 'pending').length;
  const progressCount = issues.filter(i => i.status === 'in_progress').length;
  const resolvedCount = issues.filter(i => i.status === 'resolved').length;

  if (!user || user.role !== 'officer') {
    return (<View style={s.center}><Text style={s.centerText}>Officer authentication required.</Text>
      <TouchableOpacity style={s.ctaBtn} onPress={() => router.replace('/officer-login')}><Text style={s.ctaBtnText}>Sign In</Text></TouchableOpacity></View>);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchIssues(); }} tintColor="#c9a227" />}>
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Officer Dashboard</Text>
            <Text style={s.name}>{user.fullName}</Text>
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={() => { logout(); router.replace('/'); }}><Text style={s.logoutText}>Sign Out</Text></TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { val: issues.length, label: 'Total', color: '#1e1e2e' },
            { val: pendingCount, label: 'Pending', color: '#c9a227' },
            { val: progressCount, label: 'In Progress', color: '#8b6914' },
            { val: resolvedCount, label: 'Resolved', color: '#4a7c59' },
          ].map((st, i) => (
            <View key={i} style={[s.statCard, glass]}>
              <Text style={[s.statValue, { color: st.color }]}>{st.val}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Filters */}
        <View style={s.filterRow}>
          {['all', 'pending', 'in_progress', 'resolved'].map(f => (
            <TouchableOpacity key={f} style={[s.filterBtn, filter === f && s.filterActive]} onPress={() => setFilter(f)}>
              <Text style={[s.filterText, filter === f && s.filterTextActive]}>{f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? <ActivityIndicator size="large" color="#c9a227" style={{ marginTop: 20 }} /> :
         filtered.length === 0 ? (
          <View style={[s.emptyState, glass]}><Text style={s.emptyTitle}>No issues found</Text><Text style={s.emptySub}>No issues match the selected filter.</Text></View>
        ) : filtered.map(issue => (
          <View key={issue.id} style={[s.issueCard, glass]}>
            <View style={s.issueHeader}>
              <Text style={s.issueId}>#{issue.id}</Text>
              <View style={s.typeBadge}><Text style={s.typeText}>{issue.type.toUpperCase()}</Text></View>
              <View style={[s.sevBadge, { backgroundColor: (sevColors[issue.severity] || '#8b7e6a') + '15' }]}>
                <View style={[s.sevDot, { backgroundColor: sevColors[issue.severity] }]} />
                <Text style={[s.sevText, { color: sevColors[issue.severity] }]}>{issue.severity?.toUpperCase()}</Text>
              </View>
            </View>
            {issue.image_url && <Image source={{ uri: `${ENV.API_BASE_URL.replace('/api', '')}${issue.image_url}` }} style={s.issueThumb} />}
            <Text style={s.issueDesc}>{issue.description || 'No description.'}</Text>

            {issue.latitude && issue.longitude && Platform.OS === 'web' && (
              <View style={s.mapContainer}>
                {/* @ts-ignore */}
                <iframe width="100%" height="80" style={{ border: 0, borderRadius: 8 }} loading="lazy"
                  src={`https://maps.google.com/maps?q=${issue.latitude},${issue.longitude}&z=15&output=embed`} />
              </View>
            )}

            {issue.ai_confidence != null && (
              <View style={s.aiBadge}><Text style={s.aiBadgeText}>AI Confidence: {Math.round((issue.ai_confidence as number) * 100)}%</Text></View>
            )}

            <View style={s.issueFooter}>
              <Text style={s.issueDate}>{new Date(issue.reported_at).toLocaleDateString()}</Text>
              <Text style={s.issueUpvotes}>{issue.upvotes} upvotes</Text>
            </View>

            {/* Actions */}
            <View style={s.actionRow}>
              {issue.status === 'pending' && (
                <TouchableOpacity style={s.actionBtn} onPress={() => updateStatus(issue.id, 'in_progress')}>
                  <Text style={s.actionText}>Mark In Progress</Text>
                </TouchableOpacity>
              )}
              {issue.status === 'in_progress' && (
                <>
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#4a7c59' }]} onPress={() => updateStatus(issue.id, 'resolved')}>
                    <Text style={s.actionText}>Mark Resolved</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#c9a227' }]} onPress={() => uploadAfterImage(issue.id)}>
                    <Text style={[s.actionText, { color: '#1e1e2e' }]}>Upload After Photo</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ))}
        <Footer />
      </ScrollView>

      <Modal visible={popup.visible} transparent animationType="none" onRequestClose={hidePopup}>
        <View style={s.modalOv}><Animated.View style={[s.modalC, glass, { transform: [{ scale: popupScale }] }]}>
          <Text style={s.modalT}>{popup.title}</Text><Text style={s.modalM}>{popup.msg}</Text>
          <TouchableOpacity style={s.modalBtn} onPress={hidePopup}><Text style={s.modalBtnT}>Dismiss</Text></TouchableOpacity>
        </Animated.View></View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  centerText: { fontSize: 15, color: '#6b6352' },
  ctaBtn: { marginTop: 16, backgroundColor: '#8b6914', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  ctaBtnText: { color: '#fff', fontWeight: '700' },
  container: { flexGrow: 1, padding: 24, paddingBottom: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 12, color: '#8b7e6a', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  name: { fontSize: 24, fontWeight: '800', color: '#1e1e2e', marginTop: 4 },
  logoutBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(200,180,140,0.3)' },
  logoutText: { color: '#8b7e6a', fontWeight: '600', fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, color: '#8b7e6a', fontWeight: '600', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.4)', borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)' },
  filterActive: { backgroundColor: '#1e1e2e', borderColor: '#1e1e2e' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#8b7e6a' },
  filterTextActive: { color: '#fff' },
  emptyState: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 18, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1e1e2e', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#8b7e6a' },
  issueCard: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 18, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)' },
  issueHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  issueId: { fontSize: 13, fontWeight: '800', color: '#1e1e2e' },
  typeBadge: { backgroundColor: 'rgba(30,30,46,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeText: { fontSize: 10, fontWeight: '700', color: '#1e1e2e', letterSpacing: 0.5 },
  sevBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, gap: 4 },
  sevDot: { width: 6, height: 6, borderRadius: 3 },
  sevText: { fontSize: 10, fontWeight: '700' },
  issueThumb: { width: '100%', height: 120, borderRadius: 12, marginBottom: 8 },
  issueDesc: { fontSize: 13, color: '#6b6352', lineHeight: 20, marginBottom: 8 },
  mapContainer: { width: '100%', maxWidth: 280, height: 80, marginBottom: 10, borderRadius: 8, overflow: 'hidden' },
  aiBadge: { backgroundColor: 'rgba(201,162,39,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  aiBadgeText: { fontSize: 10, fontWeight: '700', color: '#8b6914' },
  issueFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  issueDate: { fontSize: 12, color: '#b0a898' },
  issueUpvotes: { fontSize: 12, color: '#c9a227', fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, backgroundColor: '#1e1e2e', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  modalOv: { flex: 1, backgroundColor: 'rgba(30,30,46,0.3)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  modalC: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 380, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(200,180,140,0.25)' },
  modalT: { fontSize: 18, fontWeight: '800', color: '#1e1e2e', marginBottom: 10 },
  modalM: { fontSize: 14, color: '#6b6352', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  modalBtn: { backgroundColor: '#1e1e2e', paddingVertical: 12, paddingHorizontal: 36, borderRadius: 12 },
  modalBtnT: { color: '#fff', fontWeight: '700' },
});

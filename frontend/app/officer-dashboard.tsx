import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Image, Platform, Modal, Animated, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ENV } from '../config/env';
import Footer from '../components/Footer';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

type Issue = { id: number; type: string; status: string; severity: string; description: string; image_url: string; after_image_url: string; latitude: number; longitude: number; reported_at: string; resolved_at: string; upvotes: number; ai_confidence?: number; ward_office_name?: string; ward_number?: string; assigned_contractor?: string; reporter_name?: string; };

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

  // Contractor assignment
  const [assignModal, setAssignModal] = useState({ visible: false, issueId: 0 });
  const [contractors, setContractors] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  // Lightbox
  const [lightbox, setLightbox] = useState({ visible: false, uri: '' });

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
      if (res.ok) { showPopup('Updated', `Issue #${id} → ${status.replace('_', ' ')}`); fetchIssues(); }
    } catch { showPopup('Error', 'Failed to update status.'); }
  };

  const uploadAfterImage = async (id: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled) return;
    const uri = result.assets[0].uri;

    // Get current location for 100m validation
    let lat: number | null = null, lng: number | null = null;
    try {
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }
    } catch {}

    const form = new FormData();
    form.append('afterImage', { uri, name: 'after.jpg', type: 'image/jpeg' } as any);
    if (lat && lng) { form.append('latitude', String(lat)); form.append('longitude', String(lng)); }

    try {
      const res = await fetch(`${ENV.API_BASE_URL}/issues/${id}/after-image`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      const d = await res.json();
      if (res.ok) { showPopup('Uploaded', 'After-repair image uploaded.'); fetchIssues(); }
      else { showPopup('Location Mismatch', d.error || 'Upload failed.'); }
    } catch { showPopup('Error', 'Failed to upload.'); }
  };

  const openAssignModal = async (issueId: number) => {
    setAssignModal({ visible: true, issueId });
    setAssignLoading(true);
    try {
      const wardId = (user as any)?.wardId;
      const [cRes, bRes] = await Promise.all([
        wardId ? fetch(`${ENV.API_BASE_URL}/contractors/by-ward/${wardId}`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
        fetch(`${ENV.API_BASE_URL}/contractors/bids/${issueId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (cRes?.ok) { const d = await cRes.json(); setContractors(d.contractors || []); }
      if (bRes.ok) { const d = await bRes.json(); setBids(d.bids || []); }
    } catch {} finally { setAssignLoading(false); }
  };

  const assignContractor = async (contractorId: string, amount: number) => {
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/contractors/assign/${assignModal.issueId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contractorId, amount })
      });
      if (res.ok) { showPopup('Assigned', `Contractor ${contractorId} assigned.`); setAssignModal({ visible: false, issueId: 0 }); fetchIssues(); }
    } catch { showPopup('Error', 'Assignment failed.'); }
  };

  const filtered = filter === 'all' ? issues : issues.filter(i => i.status === filter);
  const pendingCount = issues.filter(i => i.status === 'pending').length;
  const progressCount = issues.filter(i => i.status === 'in_progress').length;
  const resolvedCount = issues.filter(i => i.status === 'resolved').length;
  const imgBase = ENV.API_BASE_URL.replace('/api', '');

  if (!user || user.role !== 'officer') {
    return (<View style={s.center}><Text style={s.centerText}>Officer authentication required.</Text>
      <TouchableOpacity style={s.ctaBtn} onPress={() => router.replace('/officer-login')}><Text style={s.ctaBtnText}>Sign In</Text></TouchableOpacity></View>);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchIssues(); }} tintColor="#c9a227" />}>
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>OFFICER DASHBOARD</Text>
            <Text style={s.name}>{user.fullName}</Text>
            {(user as any).wardId && <Text style={{ fontSize: 11, color: '#8b7e6a', marginTop: 2 }}>Ward ID: {(user as any).wardId}</Text>}
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={() => { logout(); router.replace('/'); }}><Text style={s.logoutText}>Sign Out</Text></TouchableOpacity>
        </View>

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
              {issue.upvotes > 1 && (
                <View style={[s.priorityBadge, issue.upvotes >= 5 ? { backgroundColor: 'rgba(184,57,59,0.12)' } : issue.upvotes >= 3 ? { backgroundColor: 'rgba(201,162,39,0.12)' } : {}]}>
                  <Text style={[s.priorityText, issue.upvotes >= 5 ? { color: '#b8393b' } : issue.upvotes >= 3 ? { color: '#c9a227' } : {}]}>🔥 {issue.upvotes} reports</Text>
                </View>
              )}
            </View>

            {issue.reporter_name && <Text style={{ fontSize: 11, color: '#8b7e6a', marginBottom: 6 }}>Reported by: {issue.reporter_name}</Text>}

            {/* Issue Image */}
            {issue.image_url && (
              <TouchableOpacity onPress={() => setLightbox({ visible: true, uri: `${imgBase}${issue.image_url}` })}>
                <Image source={{ uri: `${imgBase}${issue.image_url}` }} style={s.issueImg} resizeMode="cover" />
              </TouchableOpacity>
            )}

            <Text style={s.issueDesc}>{issue.description || 'No description.'}</Text>

            {issue.ward_office_name && <Text style={s.wardLabel}>{issue.ward_office_name} — Ward {issue.ward_number}</Text>}

            {issue.latitude && issue.longitude && Platform.OS === 'web' && (
              <View style={s.mapContainer}>
                {/* @ts-ignore */}
                <iframe width="100%" height="80" style={{ border: 0, borderRadius: 8 }} loading="lazy"
                  src={`https://maps.google.com/maps?q=${issue.latitude},${issue.longitude}&z=15&output=embed`} />
              </View>
            )}

            {issue.ai_confidence != null && (
              <View style={s.aiBadge}><Text style={s.aiBadgeText}>🤖 AI Confidence: {Math.round((issue.ai_confidence as number) * 100)}%</Text></View>
            )}

            {/* After image */}
            {issue.after_image_url && (
              <View style={s.afterBox}>
                <Text style={s.afterLabel}>✅ AFTER FIX</Text>
                <TouchableOpacity onPress={() => setLightbox({ visible: true, uri: `${imgBase}${issue.after_image_url}` })}>
                  <Image source={{ uri: `${imgBase}${issue.after_image_url}` }} style={s.afterImg} resizeMode="cover" />
                </TouchableOpacity>
              </View>
            )}

            <View style={s.issueFooter}>
              <Text style={s.issueDate}>{new Date(issue.reported_at).toLocaleDateString()}</Text>
              {issue.assigned_contractor && <Text style={{ fontSize: 11, color: '#4a7c59', fontWeight: '700' }}>Contractor: {issue.assigned_contractor}</Text>}
            </View>

            {/* Actions */}
            <View style={s.actionRow}>
              {issue.status === 'pending' && (
                <>
                  <TouchableOpacity style={s.actionBtn} onPress={() => updateStatus(issue.id, 'in_progress')}>
                    <Text style={s.actionText}>Mark In Progress</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#4a7c59' }]} onPress={() => openAssignModal(issue.id)}>
                    <Text style={s.actionText}>Assign Contractor</Text>
                  </TouchableOpacity>
                </>
              )}
              {issue.status === 'in_progress' && (
                <>
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#4a7c59' }]} onPress={() => updateStatus(issue.id, 'resolved')}>
                    <Text style={s.actionText}>Mark Resolved</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#c9a227' }]} onPress={() => uploadAfterImage(issue.id)}>
                    <Text style={[s.actionText, { color: '#1e1e2e' }]}>Upload After Photo</Text>
                  </TouchableOpacity>
                  {!issue.assigned_contractor && (
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#8b6914' }]} onPress={() => openAssignModal(issue.id)}>
                      <Text style={s.actionText}>Assign Contractor</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        ))}
        <Footer />
      </ScrollView>

      {/* Assign Contractor Modal */}
      <Modal visible={assignModal.visible} transparent animationType="slide">
        <View style={s.modalOv}><View style={[s.modalC, glass]}>
          <Text style={s.modalT}>Assign Contractor — Issue #{assignModal.issueId}</Text>
          {assignLoading ? <ActivityIndicator color="#c9a227" style={{ marginVertical: 20 }} /> : (
            <>
              {bids.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#1e1e2e', marginBottom: 8 }}>Bids Received</Text>
                  {bids.map((b: any) => (
                    <View key={b.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(200,180,140,0.15)' }}>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e1e2e' }}>{b.contractor_name}</Text>
                        <Text style={{ fontSize: 11, color: '#8b7e6a' }}>₹{parseFloat(b.amount).toLocaleString()} · Rating: {parseFloat(b.rating).toFixed(1)}/5 · Jobs: {b.jobs_completed}</Text>
                      </View>
                      <TouchableOpacity style={{ backgroundColor: '#4a7c59', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                        onPress={() => assignContractor(b.contractor_id, parseFloat(b.amount))}>
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>Accept</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              {contractors.length > 0 && (
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#1e1e2e', marginBottom: 8 }}>Ward Contractors</Text>
                  {contractors.map((c: any) => (
                    <View key={c.contractor_id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(200,180,140,0.15)' }}>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e1e2e' }}>{c.name}</Text>
                        <Text style={{ fontSize: 11, color: '#8b7e6a' }}>Rating: {parseFloat(c.rating).toFixed(1)}/5 · Jobs: {c.jobs_completed}</Text>
                      </View>
                      <TouchableOpacity style={{ backgroundColor: '#1e1e2e', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                        onPress={() => assignContractor(c.contractor_id, 0)}>
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>Assign</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              {contractors.length === 0 && bids.length === 0 && <Text style={{ color: '#8b7e6a', textAlign: 'center', marginVertical: 16 }}>No contractors or bids available for this ward.</Text>}
            </>
          )}
          <TouchableOpacity style={[s.modalBtn, { marginTop: 16 }]} onPress={() => setAssignModal({ visible: false, issueId: 0 })}><Text style={s.modalBtnT}>Close</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* Popup */}
      <Modal visible={popup.visible} transparent animationType="none" onRequestClose={hidePopup}>
        <View style={s.modalOv}><Animated.View style={[s.popupC, glass, { transform: [{ scale: popupScale }] }]}>
          <Text style={s.modalT}>{popup.title}</Text><Text style={s.modalM}>{popup.msg}</Text>
          <TouchableOpacity style={s.modalBtn} onPress={hidePopup}><Text style={s.modalBtnT}>Dismiss</Text></TouchableOpacity>
        </Animated.View></View>
      </Modal>

      {/* Lightbox */}
      <Modal visible={lightbox.visible} transparent animationType="fade">
        <View style={s.lightboxOv}>
          <TouchableOpacity style={s.lightboxClose} onPress={() => setLightbox({ visible: false, uri: '' })}><Text style={{ color: '#fff', fontWeight: '700' }}>Close</Text></TouchableOpacity>
          {lightbox.uri ? <Image source={{ uri: lightbox.uri }} style={s.lightboxImg} resizeMode="contain" /> : null}
        </View>
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
  greeting: { fontSize: 11, color: '#c9a227', fontWeight: '700', letterSpacing: 1.5 },
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
  issueHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  issueId: { fontSize: 13, fontWeight: '800', color: '#1e1e2e' },
  typeBadge: { backgroundColor: 'rgba(30,30,46,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeText: { fontSize: 10, fontWeight: '700', color: '#1e1e2e', letterSpacing: 0.5 },
  sevBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, gap: 4 },
  sevDot: { width: 6, height: 6, borderRadius: 3 },
  sevText: { fontSize: 10, fontWeight: '700' },
  priorityBadge: { backgroundColor: 'rgba(30,30,46,0.06)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priorityText: { fontSize: 10, fontWeight: '800', color: '#1e1e2e' },
  issueImg: { width: '100%', height: 180, borderRadius: 14, marginBottom: 10, backgroundColor: '#e8e2d8' },
  issueDesc: { fontSize: 13, color: '#6b6352', lineHeight: 20, marginBottom: 8 },
  wardLabel: { fontSize: 11, color: '#8b7e6a', marginBottom: 8, fontWeight: '600' },
  mapContainer: { width: '100%', maxWidth: 280, height: 80, marginBottom: 10, borderRadius: 8, overflow: 'hidden' },
  aiBadge: { backgroundColor: 'rgba(201,162,39,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  aiBadgeText: { fontSize: 10, fontWeight: '700', color: '#8b6914' },
  afterBox: { backgroundColor: 'rgba(74,124,89,0.08)', borderRadius: 14, padding: 12, marginBottom: 10 },
  afterLabel: { fontSize: 11, fontWeight: '800', color: '#4a7c59', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  afterImg: { width: '100%', height: 140, borderRadius: 10, backgroundColor: '#e8e2d8' },
  issueFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  issueDate: { fontSize: 12, color: '#b0a898' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  actionBtn: { flex: 1, minWidth: 120, backgroundColor: '#1e1e2e', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  modalOv: { flex: 1, backgroundColor: 'rgba(30,30,46,0.3)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalC: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 440, borderWidth: 1, borderColor: 'rgba(200,180,140,0.25)' },
  popupC: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 380, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(200,180,140,0.25)' },
  modalT: { fontSize: 18, fontWeight: '800', color: '#1e1e2e', marginBottom: 10 },
  modalM: { fontSize: 14, color: '#6b6352', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  modalBtn: { backgroundColor: '#1e1e2e', paddingVertical: 12, paddingHorizontal: 36, borderRadius: 12, alignItems: 'center' },
  modalBtnT: { color: '#fff', fontWeight: '700' },
  lightboxOv: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  lightboxClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  lightboxImg: { width: '90%', height: '70%', borderRadius: 8 },
});

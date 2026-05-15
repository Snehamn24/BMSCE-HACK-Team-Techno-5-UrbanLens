import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, RefreshControl, Modal, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ENV } from '../config/env';

type Ward = { id: number; office_name: string; ward_no: string; area_name: string; };
type Officer = { id: number; full_name: string; email: string; municipal_office: string; ward_id: number; issues_resolved: number; };
type Analytics = { total: number; pending: number; inProgress: number; resolved: number; byType: { type: string; count: number; }[]; };

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [tab, setTab] = useState<'overview' | 'wards' | 'officers'>('overview');
  const [wards, setWards] = useState<Ward[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Ward form
  const [wardName, setWardName] = useState('');
  const [wardNo, setWardNo] = useState('');
  const [wardArea, setWardArea] = useState('');
  const [addingWard, setAddingWard] = useState(false);
  // Officer form
  const [offModalVisible, setOffModalVisible] = useState(false);
  const [offName, setOffName] = useState('');
  const [offEmail, setOffEmail] = useState('');
  const [offPassword, setOffPassword] = useState('');
  const [offOffice, setOffOffice] = useState('');
  const [offWardId, setOffWardId] = useState<number | null>(null);
  const [addingOfficer, setAddingOfficer] = useState(false);
  const [wardPickerVis, setWardPickerVis] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [popup, setPopup] = useState({ visible: false, title: '', msg: '', success: false });
  const popupScale = useRef(new Animated.Value(0)).current;

  const showPopup = (title: string, msg: string, success = false) => {
    setPopup({ visible: true, title, msg, success });
    Animated.spring(popupScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
  };
  const hidePopup = () => {
    Animated.timing(popupScale, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setPopup(p => ({ ...p, visible: false })));
  };

  useEffect(() => { Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(); }, []);

  const fetchData = async () => {
    if (!token) return;
    try {
      const [wRes, oRes, aRes] = await Promise.all([
        fetch(`${ENV.API_BASE_URL}/wards`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${ENV.API_BASE_URL}/officers`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${ENV.API_BASE_URL}/analytics/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (wRes.ok) { const d = await wRes.json(); setWards(d.wards || []); }
      if (oRes.ok) { const d = await oRes.json(); setOfficers(d.officers || []); }
      if (aRes.ok) { const d = await aRes.json(); setAnalytics(d); }
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, [token]);

  const addWard = async () => {
    if (!wardName.trim() || !wardNo.trim() || !wardArea.trim()) return showPopup('Missing Fields', 'Fill out all ward details.');
    setAddingWard(true);
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/wards`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ officeName: wardName.trim(), wardNo: wardNo.trim(), areaName: wardArea.trim() }) });
      const d = await res.json();
      if (res.ok) { showPopup('Ward Created ✅', `${wardName} added!`, true); setWardName(''); setWardNo(''); setWardArea(''); fetchData(); }
      else showPopup('Error', d.error || 'Failed to create ward.');
    } catch { showPopup('Error', 'Network error.'); } finally { setAddingWard(false); }
  };

  const addOfficer = async () => {
    if (!offName.trim() || !offEmail.trim() || !offPassword || !offOffice.trim()) return showPopup('Missing Fields', 'Fill out all fields.');
    if (!offEmail.includes('@') || !offEmail.endsWith('.gov.in')) return showPopup('Invalid Email', 'Must use a .gov.in email.');
    setAddingOfficer(true);
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/officers`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ fullName: offName.trim(), email: offEmail.trim(), password: offPassword, municipalOffice: offOffice.trim(), wardId: offWardId }) });
      const d = await res.json();
      if (res.ok) { showPopup('Officer Created ✅', `${offName} registered!`, true); setOffModalVisible(false); setOffName(''); setOffEmail(''); setOffPassword(''); setOffOffice(''); setOffWardId(null); fetchData(); }
      else showPopup('Error', d.error || 'Failed to create officer.');
    } catch { showPopup('Error', 'Network error.'); } finally { setAddingOfficer(false); }
  };

  if (!user || user.role !== 'admin') return (<View style={st.center}><Text style={{ color: '#64748b' }}>Unauthorized.</Text></View>);

  const typeEmojis: Record<string, string> = { pothole: '🕳️', garbage: '🗑️', streetlight: '💡', drainage: '💧', tree: '🌳' };

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4f8' }}>
      <ScrollView contentContainerStyle={st.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#7c3aed" />}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={st.header}>
            <View><Text style={st.greeting}>Admin Dashboard</Text><Text style={st.name}>{user.fullName || 'Admin'}</Text></View>
            <TouchableOpacity style={st.logoutBtn} onPress={() => { logout(); router.replace('/'); }}><Text style={st.logoutText}>Logout</Text></TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={st.tabRow}>
            {[{ id: 'overview' as const, emoji: '📊', label: 'Overview' }, { id: 'wards' as const, emoji: '🏛️', label: 'Wards' }, { id: 'officers' as const, emoji: '👷', label: 'Officers' }].map(t => (
              <TouchableOpacity key={t.id} style={[st.tab, tab === t.id && st.tabActive]} onPress={() => setTab(t.id)}>
                <Text style={[st.tabText, tab === t.id && st.tabTextActive]}>{t.emoji} {t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 30 }} /> : (
            <>
              {tab === 'overview' && analytics && (
                <>
                  <View style={st.statsRow}>
                    {[{ v: analytics.total, l: 'Total', c: '#0891b2', e: '📊' }, { v: analytics.pending, l: 'Pending', c: '#d97706', e: '⏳' },
                      { v: analytics.inProgress, l: 'Working', c: '#3b82f6', e: '🔧' }, { v: analytics.resolved, l: 'Resolved', c: '#059669', e: '✅' }].map((x, i) => (
                      <View key={i} style={[st.statCard, { borderTopColor: x.c }]}>
                        <Text style={{ fontSize: 20, marginBottom: 4 }}>{x.e}</Text>
                        <Text style={[st.statVal, { color: x.c }]}>{x.v}</Text>
                        <Text style={st.statLbl}>{x.l}</Text>
                      </View>
                    ))}
                  </View>
                  {analytics.byType && analytics.byType.length > 0 && (
                    <View style={st.chartCard}>
                      <Text style={st.chartTitle}>Issues by Type</Text>
                      {analytics.byType.map((t, i) => (
                        <View key={i} style={st.barRow}>
                          <Text style={st.barLabel}>{typeEmojis[t.type] || '📋'} {t.type}</Text>
                          <View style={st.barBg}>
                            <View style={[st.barFill, { width: `${Math.min(100, (t.count / Math.max(...analytics.byType.map(x => x.count))) * 100)}%` }]} />
                          </View>
                          <Text style={st.barVal}>{t.count}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={st.summaryRow}>
                    <View style={st.summaryCard}><Text style={{ fontSize: 28 }}>🏛️</Text><Text style={st.summaryVal}>{wards.length}</Text><Text style={st.summaryLbl}>Wards</Text></View>
                    <View style={st.summaryCard}><Text style={{ fontSize: 28 }}>👷</Text><Text style={st.summaryVal}>{officers.length}</Text><Text style={st.summaryLbl}>Officers</Text></View>
                  </View>
                </>
              )}

              {tab === 'wards' && (
                <>
                  <View style={st.formCard}>
                    <Text style={st.formTitle}>➕ Add New Ward</Text>
                    <TextInput style={st.input} placeholder="Ward Office Name" placeholderTextColor="#94a3b8" value={wardName} onChangeText={setWardName} />
                    <TextInput style={st.input} placeholder="Ward Number" placeholderTextColor="#94a3b8" value={wardNo} onChangeText={setWardNo} />
                    <TextInput style={st.input} placeholder="Area / Locality" placeholderTextColor="#94a3b8" value={wardArea} onChangeText={setWardArea} />
                    <TouchableOpacity style={[st.primaryBtn, addingWard && { opacity: 0.6 }]} onPress={addWard} disabled={addingWard}>
                      <Text style={st.primaryBtnText}>{addingWard ? 'Creating...' : '🏛️ Create Ward'}</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={st.listTitle}>Existing Wards ({wards.length})</Text>
                  {wards.map(w => (
                    <View key={w.id} style={st.listCard}>
                      <View style={st.listIcon}><Text style={{ fontSize: 22 }}>🏛️</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={st.listName}>{w.office_name}</Text>
                        <Text style={st.listMeta}>Ward {w.ward_no} · {w.area_name}</Text>
                      </View>
                    </View>
                  ))}
                  {wards.length === 0 && <View style={st.empty}><Text style={{ color: '#94a3b8' }}>No wards yet.</Text></View>}
                </>
              )}

              {tab === 'officers' && (
                <>
                  <TouchableOpacity style={st.primaryBtn} onPress={() => setOffModalVisible(true)}>
                    <Text style={st.primaryBtnText}>➕ Add New Officer</Text>
                  </TouchableOpacity>
                  <Text style={[st.listTitle, { marginTop: 16 }]}>Registered Officers ({officers.length})</Text>
                  {officers.map(o => (
                    <View key={o.id} style={st.listCard}>
                      <View style={[st.listIcon, { backgroundColor: '#d1fae5' }]}><Text style={{ fontSize: 22 }}>👷</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={st.listName}>{o.full_name}</Text>
                        <Text style={st.listMeta}>{o.email}</Text>
                        <Text style={st.listMeta}>🏛️ {o.municipal_office} · ✅ {o.issues_resolved} resolved</Text>
                      </View>
                    </View>
                  ))}
                  {officers.length === 0 && <View style={st.empty}><Text style={{ color: '#94a3b8' }}>No officers yet.</Text></View>}
                </>
              )}
            </>
          )}
        </Animated.View>
      </ScrollView>

      {/* Officer creation modal */}
      <Modal visible={offModalVisible} transparent animationType="slide">
        <View style={st.modalOv}><View style={st.modalC}>
          <Text style={st.formTitle}>👷 Create Officer</Text>
          <TextInput style={st.input} placeholder="Full Name" placeholderTextColor="#94a3b8" value={offName} onChangeText={setOffName} />
          <TextInput style={st.input} placeholder="email@dept.gov.in" placeholderTextColor="#94a3b8" value={offEmail} onChangeText={setOffEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={st.input} placeholder="Password" placeholderTextColor="#94a3b8" value={offPassword} onChangeText={setOffPassword} secureTextEntry />
          <TextInput style={st.input} placeholder="Municipal Office Name" placeholderTextColor="#94a3b8" value={offOffice} onChangeText={setOffOffice} />
          <TouchableOpacity style={st.pickerBtn} onPress={() => setWardPickerVis(true)}>
            <Text style={{ color: offWardId ? '#0f172a' : '#94a3b8', flex: 1 }}>{offWardId ? wards.find(w => w.id === offWardId)?.office_name || 'Ward' : 'Assign to ward...'}</Text>
            <Text style={{ color: '#94a3b8' }}>▼</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <TouchableOpacity style={st.cancelBtn} onPress={() => setOffModalVisible(false)}><Text style={{ color: '#475569', fontWeight: '700' }}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[st.primaryBtn, { flex: 1 }, addingOfficer && { opacity: 0.6 }]} onPress={addOfficer} disabled={addingOfficer}>
              <Text style={st.primaryBtnText}>{addingOfficer ? 'Creating...' : 'Create'}</Text>
            </TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      {/* Ward picker for officer */}
      <Modal visible={wardPickerVis} transparent animationType="slide">
        <View style={st.modalOv}><View style={st.modalC}>
          <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 16, color: '#0f172a' }}>🏛️ Select Ward</Text>
          <ScrollView style={{ maxHeight: 300 }}>
            {wards.map(w => (
              <TouchableOpacity key={w.id} style={[st.pickerItem, offWardId === w.id && { backgroundColor: '#ede9fe', borderColor: '#7c3aed' }]} onPress={() => { setOffWardId(w.id); setWardPickerVis(false); }}>
                <Text style={{ fontWeight: '700', color: '#0f172a' }}>{w.office_name}</Text>
                <Text style={{ fontSize: 12, color: '#64748b' }}>Ward {w.ward_no} · {w.area_name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={{ marginTop: 12, alignItems: 'center', padding: 10 }} onPress={() => setWardPickerVis(false)}><Text style={{ color: '#64748b', fontWeight: '700' }}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* Popup */}
      <Modal visible={popup.visible} transparent animationType="none" onRequestClose={hidePopup}>
        <View style={st.modalOv}>
          <Animated.View style={[st.popupC, { transform: [{ scale: popupScale }] }]}>
            <Text style={{ fontSize: 36, marginBottom: 16 }}>{popup.success ? '✅' : '⚠️'}</Text>
            <Text style={st.popupT}>{popup.title}</Text>
            <Text style={st.popupM}>{popup.msg}</Text>
            <TouchableOpacity style={[st.popupBtn, popup.success && { backgroundColor: '#059669' }]} onPress={hidePopup}><Text style={{ color: '#fff', fontWeight: '700' }}>OK</Text></TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8' },
  container: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 10, marginBottom: 16 },
  greeting: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  name: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  logoutBtn: { backgroundColor: '#fef2f2', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 13 },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: '#7c3aed' },
  tabText: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: '#fff' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', borderTopWidth: 3, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  statVal: { fontSize: 22, fontWeight: '800' },
  statLbl: { fontSize: 10, color: '#94a3b8', fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  chartCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  chartTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 14 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  barLabel: { width: 100, fontSize: 12, fontWeight: '700', color: '#475569' },
  barBg: { flex: 1, height: 10, backgroundColor: '#f0f4f8', borderRadius: 5, marginHorizontal: 8, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#0891b2', borderRadius: 5 },
  barVal: { fontSize: 14, fontWeight: '800', color: '#0f172a', width: 30, textAlign: 'right' },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  summaryVal: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginTop: 8 },
  summaryLbl: { fontSize: 12, color: '#94a3b8', fontWeight: '700', marginTop: 4 },
  formCard: { backgroundColor: '#fff', borderRadius: 20, padding: 22, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3 },
  formTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 14, color: '#0f172a', marginBottom: 10 },
  pickerBtn: { height: 48, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, backgroundColor: '#f8fafc', flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  primaryBtn: { backgroundColor: '#7c3aed', paddingVertical: 14, borderRadius: 14, alignItems: 'center', shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  listTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  listCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  listIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#ede9fe', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  listName: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  listMeta: { fontSize: 12, color: '#64748b' },
  empty: { backgroundColor: '#fff', padding: 30, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginTop: 10 },
  modalOv: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.4)', padding: 20 },
  modalC: { backgroundColor: '#fff', width: '100%', maxWidth: 440, borderRadius: 24, padding: 24 },
  pickerItem: { padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 8 },
  popupC: { backgroundColor: '#fff', borderRadius: 24, padding: 28, width: '100%', maxWidth: 380, alignItems: 'center', elevation: 12 },
  popupT: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 10, textAlign: 'center' },
  popupM: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  popupBtn: { backgroundColor: '#7c3aed', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 14, elevation: 4 },
});

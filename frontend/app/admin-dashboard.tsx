import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, RefreshControl, Platform, Modal, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ENV } from '../config/env';
import Footer from '../components/Footer';

type Ward = { id: number; office_name: string; ward_no: string; area_name: string; };

const glass: any = Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } : {};

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Analytics
  const [analytics, setAnalytics] = useState({ total: 0, resolved: 0, pending: 0, inProgress: 0, byType: [] as any[] });

  // Wards
  const [wards, setWards] = useState<Ward[]>([]);
  const [wardForm, setWardForm] = useState({ officeName: '', wardNo: '', areaName: '' });
  const [wardLoading, setWardLoading] = useState(false);

  // Officers
  const [officerForm, setOfficerForm] = useState({ fullName: '', email: '', password: '', wardId: '' });
  const [officerLoading, setOfficerLoading] = useState(false);

  // Contractors
  const [contractors, setContractors] = useState<any[]>([]);
  const [ctrForm, setCtrForm] = useState({ contractorId: '', name: '', phone: '', password: '', wardId: '' });
  const [ctrLoading, setCtrLoading] = useState(false);

  const [popup, setPopup] = useState({ visible: false, title: '', msg: '', success: false });
  const popupScale = useRef(new Animated.Value(0)).current;
  const showPopup = (t: string, m: string, s = false) => { setPopup({ visible: true, title: t, msg: m, success: s }); Animated.spring(popupScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start(); };
  const hidePopup = () => { Animated.timing(popupScale, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setPopup(p => ({ ...p, visible: false }))); };

  const fetchAll = async () => {
    if (!token) return;
    try {
      const [aRes, wRes, cRes] = await Promise.all([
        fetch(`${ENV.API_BASE_URL}/analytics/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${ENV.API_BASE_URL}/wards`),
        fetch(`${ENV.API_BASE_URL}/contractors`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (aRes.ok) { const d = await aRes.json(); setAnalytics(d); }
      if (wRes.ok) { const d = await wRes.json(); setWards(d.wards || []); }
      if (cRes.ok) { const d = await cRes.json(); setContractors(d.contractors || []); }
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchAll(); }, [user]);

  const createWard = async () => {
    if (!wardForm.officeName || !wardForm.wardNo || !wardForm.areaName) { showPopup('Validation', 'All ward fields are required.'); return; }
    setWardLoading(true);
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/wards`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(wardForm) });
      const d = await res.json();
      if (res.ok) { showPopup('Ward Created', `${wardForm.officeName} added.`, true); setWardForm({ officeName: '', wardNo: '', areaName: '' }); fetchAll(); }
      else { showPopup('Error', d.error || 'Failed.'); }
    } catch { showPopup('Error', 'Connection failed.'); } finally { setWardLoading(false); }
  };

  const deleteWard = async (id: number) => {
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/wards/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { showPopup('Deleted', 'Ward removed.', true); fetchAll(); }
    } catch { showPopup('Error', 'Failed to delete.'); }
  };

  const registerOfficer = async () => {
    if (!officerForm.fullName || !officerForm.email || !officerForm.password) { showPopup('Validation', 'Name, email, and password required.'); return; }
    setOfficerLoading(true);
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/officers/register`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(officerForm) });
      const d = await res.json();
      if (res.ok) { showPopup('Officer Created', `${officerForm.fullName} registered.`, true); setOfficerForm({ fullName: '', email: '', password: '', wardId: '' }); }
      else { showPopup('Error', d.error || 'Failed.'); }
    } catch { showPopup('Error', 'Connection failed.'); } finally { setOfficerLoading(false); }
  };

  const registerContractor = async () => {
    if (!ctrForm.contractorId || !ctrForm.name || !ctrForm.phone || !ctrForm.password) { showPopup('Validation', 'All fields required.'); return; }
    setCtrLoading(true);
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/contractors/register`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(ctrForm) });
      const d = await res.json();
      if (res.ok) { showPopup('Contractor Created', `${ctrForm.name} (${ctrForm.contractorId}) registered.`, true); setCtrForm({ contractorId: '', name: '', phone: '', password: '', wardId: '' }); fetchAll(); }
      else { showPopup('Error', d.error || 'Failed.'); }
    } catch { showPopup('Error', 'Connection failed.'); } finally { setCtrLoading(false); }
  };

  const deleteContractor = async (id: string) => {
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/contractors/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { showPopup('Deleted', 'Contractor removed.', true); fetchAll(); }
    } catch { showPopup('Error', 'Failed to delete.'); }
  };

  if (!user || user.role !== 'admin') {
    return (<View style={s.center}><Text style={s.centerText}>Admin authentication required.</Text>
      <TouchableOpacity style={s.ctaBtn} onPress={() => router.replace('/admin-login')}><Text style={s.ctaBtnText}>Sign In</Text></TouchableOpacity></View>);
  }

  const resRate = analytics.total > 0 ? Math.round((analytics.resolved / analytics.total) * 100) : 0;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor="#c9a227" />}>
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>ADMIN CONSOLE</Text>
            <Text style={s.name}>{user.fullName}</Text>
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={() => { logout(); router.replace('/'); }}><Text style={s.logoutText}>Sign Out</Text></TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={s.tabRow}>
          {['overview', 'wards', 'officers', 'contractors'].map(tab => (
            <TouchableOpacity key={tab} style={[s.tabBtn, activeTab === tab && s.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? <ActivityIndicator size="large" color="#c9a227" style={{ marginTop: 40 }} /> : (
          <>
            {activeTab === 'overview' && (
              <View>
                <View style={s.statsRow}>
                  {[
                    { val: analytics.total, label: 'Total Reports', color: '#1e1e2e' },
                    { val: analytics.pending, label: 'Pending', color: '#c9a227' },
                    { val: analytics.inProgress, label: 'In Progress', color: '#8b6914' },
                    { val: analytics.resolved, label: 'Resolved', color: '#4a7c59' },
                  ].map((st, i) => (
                    <View key={i} style={[s.statCard, glass]}>
                      <Text style={[s.statValue, { color: st.color }]}>{st.val}</Text>
                      <Text style={s.statLabel}>{st.label}</Text>
                    </View>
                  ))}
                </View>
                <View style={[s.rateCard, glass]}>
                  <Text style={s.rateLabel}>Resolution Rate</Text>
                  <View style={s.rateBarBg}>
                    <View style={[s.rateBar, { width: `${resRate}%` }]} />
                  </View>
                  <Text style={s.rateValue}>{resRate}%</Text>
                </View>
                {analytics.byType?.length > 0 && (
                  <View style={[s.typeCard, glass]}>
                    <Text style={s.sectionTitle}>Issues by Category</Text>
                    {analytics.byType.map((t: any, i: number) => (
                      <View key={i} style={s.typeRow}>
                        <Text style={s.typeName}>{t.type}</Text>
                        <Text style={s.typeCount}>{t.count}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {activeTab === 'wards' && (
              <View>
                <View style={[s.formCard, glass]}>
                  <Text style={s.sectionTitle}>Add Municipal Ward</Text>
                  <Text style={s.label}>Office Name</Text>
                  <TextInput style={s.input} placeholder="e.g. Koramangala Ward Office" placeholderTextColor="#b0a898" value={wardForm.officeName} onChangeText={v => setWardForm(p => ({ ...p, officeName: v }))} />
                  <Text style={s.label}>Ward Number</Text>
                  <TextInput style={s.input} placeholder="e.g. 150" placeholderTextColor="#b0a898" value={wardForm.wardNo} onChangeText={v => setWardForm(p => ({ ...p, wardNo: v }))} />
                  <Text style={s.label}>Area Name</Text>
                  <TextInput style={s.input} placeholder="e.g. Koramangala" placeholderTextColor="#b0a898" value={wardForm.areaName} onChangeText={v => setWardForm(p => ({ ...p, areaName: v }))} />
                  <TouchableOpacity style={[s.submitBtn, wardLoading && { opacity: 0.6 }]} onPress={createWard} disabled={wardLoading}>
                    <Text style={s.submitBtnText}>{wardLoading ? 'Creating...' : 'Add Ward'}</Text>
                  </TouchableOpacity>
                </View>
                {wards.length > 0 && (
                  <View style={[s.listCard, glass]}>
                    <Text style={s.sectionTitle}>Existing Wards ({wards.length})</Text>
                    {wards.map((w, i) => (
                      <View key={w.id} style={[s.listItem, i < wards.length - 1 && s.listItemBorder]}>
                        <View style={s.listDot} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.listName}>{w.office_name}</Text>
                          <Text style={s.listMeta}>Ward {w.ward_no} · {w.area_name}</Text>
                        </View>
                        <TouchableOpacity style={s.deleteBtn} onPress={() => deleteWard(w.id)}>
                          <Text style={s.deleteText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {activeTab === 'officers' && (
              <View style={[s.formCard, glass]}>
                <Text style={s.sectionTitle}>Register Officer</Text>
                <Text style={s.label}>Full Name</Text>
                <TextInput style={s.input} placeholder="Officer full name" placeholderTextColor="#b0a898" value={officerForm.fullName} onChangeText={v => setOfficerForm(p => ({ ...p, fullName: v }))} />
                <Text style={s.label}>Official Email</Text>
                <TextInput style={s.input} placeholder="name@dept.gov.in" placeholderTextColor="#b0a898" autoCapitalize="none" keyboardType="email-address" value={officerForm.email} onChangeText={v => setOfficerForm(p => ({ ...p, email: v }))} />
                <Text style={s.label}>Password</Text>
                <TextInput style={s.input} placeholder="Set a password" placeholderTextColor="#b0a898" secureTextEntry value={officerForm.password} onChangeText={v => setOfficerForm(p => ({ ...p, password: v }))} />
                <Text style={s.label}>Assign Ward (optional)</Text>
                <View style={s.wardSelect}>
                  {wards.map(w => (
                    <TouchableOpacity key={w.id} style={[s.wardOption, officerForm.wardId === String(w.id) && s.wardOptionActive]} onPress={() => setOfficerForm(p => ({ ...p, wardId: String(w.id) }))}>
                      <Text style={[s.wardOptionText, officerForm.wardId === String(w.id) && { color: '#fff' }]}>{w.office_name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={[s.submitBtn, { backgroundColor: '#c9a227' }, officerLoading && { opacity: 0.6 }]} onPress={registerOfficer} disabled={officerLoading}>
                  <Text style={[s.submitBtnText, { color: '#1e1e2e' }]}>{officerLoading ? 'Registering...' : 'Register Officer'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === 'contractors' && (
              <View>
                <View style={[s.formCard, glass]}>
                  <Text style={s.sectionTitle}>Register Contractor</Text>
                  <Text style={s.label}>Contractor ID</Text>
                  <TextInput style={s.input} placeholder="e.g. CTR-001" placeholderTextColor="#b0a898" autoCapitalize="characters" value={ctrForm.contractorId} onChangeText={v => setCtrForm(p => ({ ...p, contractorId: v }))} />
                  <Text style={s.label}>Full Name</Text>
                  <TextInput style={s.input} placeholder="Contractor name" placeholderTextColor="#b0a898" value={ctrForm.name} onChangeText={v => setCtrForm(p => ({ ...p, name: v }))} />
                  <Text style={s.label}>Phone</Text>
                  <TextInput style={s.input} placeholder="10-digit mobile" placeholderTextColor="#b0a898" keyboardType="phone-pad" value={ctrForm.phone} onChangeText={v => setCtrForm(p => ({ ...p, phone: v }))} />
                  <Text style={s.label}>Password</Text>
                  <TextInput style={s.input} placeholder="Set a password" placeholderTextColor="#b0a898" secureTextEntry value={ctrForm.password} onChangeText={v => setCtrForm(p => ({ ...p, password: v }))} />
                  <Text style={s.label}>Assign Ward (optional)</Text>
                  <View style={s.wardSelect}>
                    {wards.map(w => (
                      <TouchableOpacity key={w.id} style={[s.wardOption, ctrForm.wardId === String(w.id) && s.wardOptionActive]} onPress={() => setCtrForm(p => ({ ...p, wardId: String(w.id) }))}>
                        <Text style={[s.wardOptionText, ctrForm.wardId === String(w.id) && { color: '#fff' }]}>{w.office_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={[s.submitBtn, { backgroundColor: '#4a7c59' }, ctrLoading && { opacity: 0.6 }]} onPress={registerContractor} disabled={ctrLoading}>
                    <Text style={s.submitBtnText}>{ctrLoading ? 'Registering...' : 'Register Contractor'}</Text>
                  </TouchableOpacity>
                </View>
                {contractors.length > 0 && (
                  <View style={[s.listCard, glass]}>
                    <Text style={s.sectionTitle}>Contractors ({contractors.length})</Text>
                    {contractors.map((c: any, i: number) => (
                      <View key={c.contractor_id} style={[s.listItem, i < contractors.length - 1 && s.listItemBorder]}>
                        <View style={[s.listDot, { backgroundColor: '#4a7c59' }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.listName}>{c.name} ({c.contractor_id})</Text>
                          <Text style={s.listMeta}>{c.phone} · Jobs: {c.jobs_completed} · Rating: {parseFloat(c.rating).toFixed(1)}/5</Text>
                        </View>
                        <TouchableOpacity style={s.deleteBtn} onPress={() => deleteContractor(c.contractor_id)}>
                          <Text style={s.deleteText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </>
        )}
        <Footer />
      </ScrollView>

      <Modal visible={popup.visible} transparent animationType="none" onRequestClose={hidePopup}>
        <View style={s.modalOv}><Animated.View style={[s.modalC, glass, { transform: [{ scale: popupScale }] }]}>
          <Text style={s.modalT}>{popup.title}</Text><Text style={s.modalM}>{popup.msg}</Text>
          <TouchableOpacity style={[s.modalBtn, popup.success && { backgroundColor: '#4a7c59' }]} onPress={hidePopup}><Text style={s.modalBtnT}>Dismiss</Text></TouchableOpacity>
        </Animated.View></View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  centerText: { fontSize: 15, color: '#6b6352' },
  ctaBtn: { marginTop: 16, backgroundColor: '#c9a227', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  ctaBtnText: { color: '#1e1e2e', fontWeight: '700' },
  container: { flexGrow: 1, padding: 24, paddingBottom: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 11, color: '#c9a227', fontWeight: '700', letterSpacing: 1.5 },
  name: { fontSize: 24, fontWeight: '800', color: '#1e1e2e', marginTop: 4 },
  logoutBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(200,180,140,0.3)' },
  logoutText: { color: '#8b7e6a', fontWeight: '600', fontSize: 12 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tabBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.4)', borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)' },
  tabActive: { backgroundColor: '#1e1e2e', borderColor: '#1e1e2e' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#8b7e6a' },
  tabTextActive: { color: '#fff' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: 100, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 16, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)' },
  statValue: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 10, color: '#8b7e6a', fontWeight: '600', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  rateCard: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)' },
  rateLabel: { fontSize: 13, fontWeight: '700', color: '#1e1e2e', marginBottom: 10 },
  rateBarBg: { height: 8, backgroundColor: 'rgba(200,180,140,0.2)', borderRadius: 4, overflow: 'hidden' },
  rateBar: { height: 8, backgroundColor: '#4a7c59', borderRadius: 4 },
  rateValue: { fontSize: 18, fontWeight: '800', color: '#4a7c59', marginTop: 8, textAlign: 'right' },
  typeCard: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)', marginBottom: 16 },
  typeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(200,180,140,0.1)' },
  typeName: { fontSize: 13, color: '#1e1e2e', fontWeight: '600', textTransform: 'capitalize' },
  typeCount: { fontSize: 13, color: '#c9a227', fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1e1e2e', marginBottom: 16 },
  formCard: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 18, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)' },
  label: { fontSize: 11, fontWeight: '700', color: '#1e1e2e', marginBottom: 4, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: { height: 46, borderWidth: 1, borderColor: 'rgba(200,180,140,0.3)', borderRadius: 12, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.6)', fontSize: 14, color: '#1e1e2e' },
  submitBtn: { backgroundColor: '#1e1e2e', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  listCard: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)', marginBottom: 20 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  listItemBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(200,180,140,0.15)' },
  listDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#c9a227', marginRight: 12 },
  listName: { fontSize: 14, fontWeight: '700', color: '#1e1e2e' },
  listMeta: { fontSize: 12, color: '#8b7e6a', marginTop: 2 },
  deleteBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(184,57,59,0.3)' },
  deleteText: { fontSize: 11, color: '#b8393b', fontWeight: '700' },
  wardSelect: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  wardOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(200,180,140,0.2)' },
  wardOptionActive: { backgroundColor: '#1e1e2e', borderColor: '#1e1e2e' },
  wardOptionText: { fontSize: 12, fontWeight: '600', color: '#6b6352' },
  modalOv: { flex: 1, backgroundColor: 'rgba(30,30,46,0.3)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  modalC: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 380, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(200,180,140,0.25)' },
  modalT: { fontSize: 18, fontWeight: '800', color: '#1e1e2e', marginBottom: 10 },
  modalM: { fontSize: 14, color: '#6b6352', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  modalBtn: { backgroundColor: '#1e1e2e', paddingVertical: 12, paddingHorizontal: 36, borderRadius: 12 },
  modalBtnT: { color: '#fff', fontWeight: '700' },
});
